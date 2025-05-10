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
    """
    Serializer for the Transaction model.
    """
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    id = serializers.IntegerField(write_only=True)  

    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_date', 'due_date', 'client_name', 'id',
            'vch_type', 'vch_no', 'debit', 'credit', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """
        Custom validation to ensure due_date is after transaction_date.
        """
        if 'transaction_date' in data and 'due_date' in data:
            if data['due_date'] < data['transaction_date']:
                raise serializers.ValidationError(
                    "Due date cannot be earlier than transaction date"
                )
        
        # Validate client exists
        if 'id' in data:
            try:
                client = Client.objects.get(pk=data['id'])
            except Client.DoesNotExist:
                raise serializers.ValidationError({
                    'id': 'Client with this ID does not exist.'
                })
        
        return data

    def create(self, validated_data):
        id = validated_data.pop('id')
        client = Client.objects.get(pk=id)
        return Transaction.objects.create(client=client, **validated_data)

    def update(self, instance, validated_data):
        if 'id' in validated_data:
            id = validated_data.pop('id')
            client = Client.objects.get(pk=id)
            instance.client = client
        return super().update(instance, validated_data)

class TransactionStatusSerializer(serializers.ModelSerializer):
    """
    Serializer for updating only the status field of a Transaction.
    """
    class Meta:
        model = Transaction
        fields = ['status']