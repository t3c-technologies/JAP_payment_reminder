from django.db.models import Q
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client, Transaction
from .serializers import (
    ClientSerializer, 
    TransactionSerializer, 
    TransactionStatusSerializer
)


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Client instances.
    """
    serializer_class = ClientSerializer
    queryset = Client.objects.all()
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ['client_name']
    ordering_fields = ['client_name', 'credit_period', 'created_at']
    ordering = ['client_name']

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
    """
    ViewSet for viewing and editing Transaction instances.
    """
    serializer_class = TransactionSerializer
    queryset = Transaction.objects.all()
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
        """
        Optionally restricts the returned transactions by filtering against
        query parameters in the URL.
        """
        queryset = Transaction.objects.select_related('client')
        
        client_name = self.request.query_params.get('client_name', None)
        status_filter = self.request.query_params.get('status', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if client_name:
            queryset = queryset.filter(client__client_name__icontains=client_name)
            
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        if date_from:
            queryset = queryset.filter(transaction_date__gte=date_from)
            
        if date_to:
            queryset = queryset.filter(transaction_date__lte=date_to)
            
        return queryset
    
    @action(detail=True, methods=['patch'], serializer_class=TransactionStatusSerializer)
    def status(self, request, pk=None):
        """
        Update the status of a transaction.
        """
        transaction = self.get_object()
        serializer = self.get_serializer(transaction, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)