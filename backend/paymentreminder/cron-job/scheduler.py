from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from .run import main  # your payment reminder logic

scheduler = BackgroundScheduler()
trigger = CronTrigger(hour=6, minute=0)  # Every day at 6:00 AM

scheduler.add_job(main, trigger)

print("Scheduler started. Waiting for next run...")
scheduler.start()
