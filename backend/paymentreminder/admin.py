

# Register your models here.
from django.contrib import admin
from .models import Client, Transaction


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('client_name', 'credit_period', 'created_at', 'updated_at')
    search_fields = ('client_name',)
    list_filter = ('credit_period',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'transaction_date', 'due_date', 'get_client_name',
        'vch_type', 'vch_no', 'debit', 'credit', 'status'
    )
    list_filter = ('status', 'transaction_date', 'due_date')
    search_fields = ('client__client_name', 'vch_type', 'vch_no')
    date_hierarchy = 'transaction_date'
    
    def get_client_name(self, obj):
        return obj.client.client_name
    
    get_client_name.short_description = 'Client'
    get_client_name.admin_order_field = 'client__client_name'