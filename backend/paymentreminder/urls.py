# App level urls.py for finance_app
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, TransactionViewSet
from .views import RegisterView, LoginView, LogoutView,SessionCheckView,UserDetailView

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'clients', ClientViewSet)
router.register(r'transactions', TransactionViewSet)

app_name = 'paymentreminder'

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('user/', UserDetailView.as_view(), name='user-detail'),
    path('session-check/', SessionCheckView.as_view(), name='session-check'),
]