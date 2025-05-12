from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import atexit
import logging 
import time

logger = logging.getLogger(__name__)

#scheduler
def start_scheduler_1():
    scheduler = BackgroundScheduler()
    
    # For production, use a daily schedule (e.g., 9 AM)
    trigger = CronTrigger(hour=6, minute=0)  # Daily at 9 AM
    #trigger = IntervalTrigger(seconds=20)
    
    from .run import main
    scheduler.add_job(
        main,
        trigger,
        id='payment_reminder',
        replace_existing=True
    )
    
    try:
        scheduler.start()
        logger.info("Scheduler started successfully")

        
    except Exception as e:
        logger.error(f"Scheduler error: {e}")
        raise
    
    finally:
        atexit.register(lambda:scheduler.shutdown() )
