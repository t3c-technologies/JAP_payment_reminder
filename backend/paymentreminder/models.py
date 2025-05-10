from django.db import models
from django.core.validators import MinValueValidator

class Client(models.Model):
    """
    Model representing a client who can have multiple transactions.
    """
    client_name = models.CharField(max_length=255, unique=True)
    credit_period = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Credit period in days"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.client_name
    
    class Meta:
        ordering = ['client_name']


class Transaction(models.Model):
    id = models.IntegerField(primary_key=True)
    """
    Model representing a financial transaction.
    """
    STATUS_CHOICES = (
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid'),
    )
    
    transaction_date = models.DateField()
    due_date = models.DateField()
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    vch_type = models.CharField(max_length=100)
    vch_no = models.CharField(max_length=100)
    debit = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    credit = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='unpaid'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.client.client_name} - {self.vch_type} - {self.vch_no}"
    
    class Meta:
        ordering = ['-transaction_date']