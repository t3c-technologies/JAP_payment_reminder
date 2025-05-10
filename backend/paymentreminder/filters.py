import django_filters
from django_filters import rest_framework as filters
from .models import Transaction, Client


class TransactionFilter(filters.FilterSet):
    """
    FilterSet for Transaction model with advanced filtering options.
    """
    client_name = django_filters.CharFilter(
        field_name='client__client_name', 
        lookup_expr='icontains'
    )
    date_from = django_filters.DateFilter(field_name='transaction_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='transaction_date', lookup_expr='lte')
    min_amount = django_filters.NumberFilter(field_name='debit', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='debit', lookup_expr='lte')

    class Meta:
        model = Transaction
        fields = {
            'status': ['exact'],
            'vch_type': ['exact', 'icontains'],
            'vch_no': ['exact', 'icontains'],
        }


class ClientFilter(filters.FilterSet):
    """
    FilterSet for Client model.
    """
    client_name = django_filters.CharFilter(lookup_expr='icontains')
    min_credit_period = django_filters.NumberFilter(field_name='credit_period', lookup_expr='gte')
    max_credit_period = django_filters.NumberFilter(field_name='credit_period', lookup_expr='lte')

    class Meta:
        model = Client
        fields = {
            'credit_period': ['exact'],
        }