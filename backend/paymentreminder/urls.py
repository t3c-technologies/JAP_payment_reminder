# App level urls.py for finance_app
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, TransactionViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'clients', ClientViewSet)
router.register(r'transactions', TransactionViewSet)

app_name = 'paymentreminder'

urlpatterns = [
    path('', include(router.urls)),
]