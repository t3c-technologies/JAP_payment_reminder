

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
        'vch_no', 'transaction_date', 'due_date', 'get_client_name',
        'vch_type', 'debit', 'credit', 'status',"client_id"
    )
    list_filter = ('status', 'transaction_date', 'due_date')
    search_fields = ('client__client_name', 'vch_type', 'vch_no')
    date_hierarchy = 'transaction_date'
    
    def get_client_name(self, obj):
        return obj.client.client_name
    
    get_client_name.short_description = 'Client'
    get_client_name.admin_order_field = 'client__client_name'





#================================================================================================================================================
#LOGIN



from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'name', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('name',)}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser',
                                       'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )
    search_fields = ('email', 'name')
    ordering = ('email',)



admin.site.register(User, UserAdmin)