import datetime
import os
from twilio.rest import Client
from dotenv import load_dotenv
import logging
import psycopg2


logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Twilio credentials
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
WHATSAPP_FROM = "whatsapp:+14155238886"
WHATSAPP_TO = os.getenv("TO_WHATSAPP")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "pass")

def get_db_connection():
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST
    )

def get_due_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        today = datetime.date.today().isoformat()
        
        cursor.execute('''SELECT 
                            c.client_name, 
                            t.debit, 
                            t.due_date 
                        FROM 
                            public.paymentreminder_client c
                        JOIN 
                            public.paymentreminder_transaction t 
                        ON 
                            c.id = t.client_id
                        WHERE 
                            t.due_date <= %s AND t.status = 'unpaid';''', (today,))
        rows = cursor.fetchall()
        conn.close()
        print(rows)
        return rows
    except Exception as e:
        logger.error(f"Database error: {e}")
        return []

def send_whatsapp_message(message_body):
    try:
        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            from_=WHATSAPP_FROM,
            to=WHATSAPP_TO,
            body=message_body
        )
        logger.info(f"Message sent. SID: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Twilio error: {e}")
        return False

def main():
    print("main")
    logger.info("Running payment reminder check")
    due_users = get_due_users()
    if not due_users:
        logger.info("No users due today.")
        return
    
    # Prepare message
    message = "📅 *Payment Reminders for Today*\n\n"
    for name, debit, due in due_users[:5]:  # Show first 5
        message += (
            f"👤 *{name}*\n"
            f"       Due: _{due}_\n"
            f"       Amount: *₹* *{float(debit)}*\n\n"
        )
    
    if len(due_users) > 5:
        message += f"🔔 And *{len(due_users) - 5}* more clients with payments due today."
    
    if send_whatsapp_message(message):
        logger.info("Payment reminders sent successfully")
    else:
        logger.error("Failed to send payment reminders")

if __name__ == "__main__":
    main()