from rest_framework import serializers
from .models import Client, Transaction

class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for the Client model.
    """
    class Meta:
        model = Client
        fields = ['id', 'client_name', 'credit_period', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class TransactionSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(write_only=True)
    client_name_read = serializers.CharField(source='client.client_name', read_only=True)


    class Meta:
        model = Transaction
        fields = [
            'vch_no', 'transaction_date', 'due_date',
            'client_name', 'client_name_read',
            'vch_type', 'debit', 'credit', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_client_name(self, value):
        if not Client.objects.filter(client_name=value).exists():
            raise serializers.ValidationError("Client with this name does not exist.")
        return value

    def create(self, validated_data):
        client_name = validated_data.pop('client_name', None)
        if not client_name:
            raise serializers.ValidationError({'client_name': 'This field is required.'})

        client = Client.objects.get(client_name=client_name)
        return Transaction.objects.create(client=client, **validated_data)

    def update(self, instance, validated_data):
        client_name = validated_data.pop('client_name', None)
        if client_name:
            client = Client.objects.get(client_name=client_name)
            instance.client = client
        return super().update(instance, validated_data)

class TransactionStatusSerializer(serializers.ModelSerializer):
    """
    Serializer for updating only the status field of a Transaction.
    """
    class Meta:
        model = Transaction
        fields = ['status']







#=================================================================================================================================================



from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'password')
        extra_kwargs = {'password': {'write_only': True}}
    
    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data.get('name', '')
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    
    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if user and user.is_active:
            return {'user': user}
        raise serializers.ValidationError("Invalid email or password.")
