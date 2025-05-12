from django.apps import AppConfig
import threading
import logging

logger = logging.getLogger(__name__)

class PaymentReminderConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'paymentreminder'

    def ready(self):
        print("🟢 ready() called")
        try:
            if not self.is_running_in_reloader():
                from .scheduler import start_scheduler_1
                start_scheduler_1()
        except Exception as e:
            print(f"🔴 CRITICAL ERROR: {e}")

    def is_running_in_reloader(self):
        import os
        return os.environ.get('RUN_MAIN') != 'true'