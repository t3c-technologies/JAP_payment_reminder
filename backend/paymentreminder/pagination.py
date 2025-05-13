from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 10  # Default page size
    page_size_query_param = 'page_size'  # Enables frontend to override via ?page_size=
    max_page_size = 100  # Max allowed from frontend
