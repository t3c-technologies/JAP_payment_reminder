from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime, timedelta
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client, Transaction
from .serializers import (
    ClientSerializer, 
    TransactionSerializer, 
    TransactionStatusSerializer,
    UserSerializer, 
    LoginSerializer,
)
from .pagination import CustomPageNumberPagination
from django.db import transaction as db_transaction
import pandas as pd
from io import BytesIO
from rest_framework.permissions import IsAuthenticated 


from django.contrib.auth import login, logout
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny



class ClientViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """
    ViewSet for viewing and editing Client instances.
    """
    serializer_class = ClientSerializer
    pagination_class = CustomPageNumberPagination
    queryset = Client.objects.all()
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ['client_name']
    ordering_fields = ['client_name', 'credit_period', 'created_at']
    ordering = ['client_name']
    lookup_field = 'client_name'          
    lookup_value_regex = '[^/]+'


    def get_queryset(self):
        """
        Optionally restricts the returned clients by filtering against
        query parameters in the URL.
        """
        queryset = Client.objects.all()
        client_name = self.request.query_params.get('client_name', None)
        
        if client_name:
            queryset = queryset.filter(client_name__icontains=client_name)
            
        return queryset


class TransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    serializer_class = TransactionSerializer
    queryset = Transaction.objects.all()
    lookup_field = 'vch_no'
    lookup_value_regex = '.+'

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ['client__client_name', 'vch_type', 'vch_no']
    ordering_fields = [
        'transaction_date', 'due_date', 'client__client_name',
        'vch_type', 'vch_no', 'debit', 'credit', 'status'
    ]
    ordering = ['-transaction_date']

    def get_queryset(self):
        queryset = Transaction.objects.select_related('client')

        client_name = self.request.query_params.get('client_name')
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if client_name:
            queryset = queryset.filter(client__client_name__icontains=client_name)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_from:
            queryset = queryset.filter(transaction_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(transaction_date__lte=date_to)

        return queryset

    @action(
        detail=True,
        methods=['patch'],
        url_path='status',  # <-- this enables /<vch_no>/status/
        serializer_class=TransactionStatusSerializer
    )
    def status(self, request, vch_no=None):  # <-- match lookup_field!
        transaction = self.get_object()
        serializer = self.get_serializer(transaction, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@api_view(['POST'])
def import_excel(request):
    """
    Import transactions from Excel file uploaded as multipart/form-data
    First creates all clients, then creates all transactions
    """
    try:
        # Get the uploaded file
        excel_file = request.FILES.get('excel_file')
        
        if not excel_file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Read the Excel file
        df = pd.read_excel(BytesIO(excel_file.read()), skiprows=5)
        
        # Convert DataFrame to list of dictionaries
        raw_data = df.to_dict('records')
        
        if not raw_data:
            return Response({'error': 'No data found in file'}, status=status.HTTP_400_BAD_REQUEST)
        
        clients_created = 0
        transactions_created = 0
        
        print(f"Columns in Excel: {df.columns.tolist()}")
        print(f"First 5 rows:\n{df.head()}")
        # Use transaction to ensure database integrity
        with db_transaction.atomic():
            # STEP 1: Process all clients first
            client_map = {}  # Map client names to client objects
            
            for item in raw_data:
                # Extract client name
                client_name = item.get('Particulars') or item.get('client_name')
                if not client_name or pd.isna(client_name) or client_name == 'Total:':
                    continue
                
                # Convert client_name to string if it's not already
                client_name = str(client_name).strip()
                
                # Skip if we've already processed this client
                if client_name in client_map:
                    continue
                
                # Create or get client
                client, created = Client.objects.get_or_create(
                    client_name=client_name,
                    defaults={
                        'credit_period': item.get('Credit Period', 10)    # Default credit period
                    }
                )
                
                if created:
                    clients_created += 1
                
                # Store in our map for later use
                client_map[client_name] = client
            
            # STEP 2: Now process all transactions
            for item in raw_data:
                # Get client name
                client_name = item.get('Particulars') or item.get('client_name')
                if not client_name or pd.isna(client_name) or client_name == 'Total:':
                    continue
                
                client_name = str(client_name).strip()
                creditPeriod = client.credit_period
                # Skip if we don't have this client (shouldn't happen, but just in case)
                if client_name not in client_map:
                    continue
                
                # Get the client object
                client = client_map[client_name]
                
                # Process transaction
                vch_no = item.get('Vch No.') or item.get('vch_no')
                if not vch_no or pd.isna(vch_no):
                    # Generate a unique ID if vch_no is missing
                    vch_no = f"IMPORT-{client_name}-{pd.Timestamp.now().strftime('%Y%m%d%H%M%S')}"
                
                # Convert vch_no to string
                vch_no = str(vch_no).strip()
                
                # Process date fields
                transaction_date = item.get('Date') or item.get('transaction_date')
                if pd.isna(transaction_date):
                    transaction_date = pd.Timestamp.now()
                
                # Convert to datetime if it's not already
                if not isinstance(transaction_date, pd.Timestamp):
                    try:
                        transaction_date = pd.to_datetime(transaction_date)
                    except:
                        transaction_date = pd.Timestamp.now()
                
                # Format transaction_date as string
                transaction_date_str = transaction_date.strftime('%Y-%m-%d')
                
                # Calculate due date
                due_date = transaction_date + pd.Timedelta(days=creditPeriod)
                due_date_str = due_date.strftime('%Y-%m-%d')
       
                # Process debit and credit
                debit = item.get('Debit Amount') or item.get('Debit') or item.get('debit') or 0
                credit = item.get('Credit Amount') or item.get('Credit') or item.get('credit') or 0
                
                # Ensure numeric values
                try:
                    debit = float(debit) if not pd.isna(debit) else 0
                    credit = float(credit) if not pd.isna(credit) else 0
                except:
                    debit = 0
                    credit = 0
                
                # Skip transactions with zero amounts
                if debit == 0 and credit == 0:
                    continue
                
                try:
                    transaction, created = Transaction.objects.update_or_create(
                        vch_no=vch_no,
                        defaults={
                            'vch_type': item.get('Vch Type') or 'CREDIT SALES',
                            'transaction_date': transaction_date_str,
                            'due_date': due_date_str,
                            'client': client,
                            'debit': debit,
                            'credit': credit,
                            'status': 'unpaid',
                        }
                    )
                    
                    if created:
                        transactions_created += 1
                except Exception as tx_err:
                    print(f"Error saving transaction for vch_no={vch_no}: {tx_err}")
                    continue
            
        return Response({
            'clients_created': clients_created,
            'transactions_created': transactions_created,
            'message': f'Successfully imported {transactions_created} transactions for {len(client_map)} clients'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    




#===================================================================================================================================================







class RegisterView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user)
            return Response({
                "user": UserSerializer(user).data,
                "message": "User registered successfully"
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            return Response({
                "user": UserSerializer(user).data,
                "message": "Login successful"
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Successfully logged out."})


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class SessionCheckView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "isAuthenticated": True,
            "user": UserSerializer(request.user).data
        })

