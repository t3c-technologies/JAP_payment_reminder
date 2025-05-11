import sqlite3
import datetime
import os
from twilio.rest import Client
from  dotenv import  load_dotenv
import logging
import os

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(filename='payment_reminder.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Twilio credentials
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
WHATSAPP_FROM = "whatsapp:+14155238886"
WHATSAPP_TO = os.getenv("TO_WHATSAPP")
DB_PATH = os.getenv("DB_PATH", "db.sqlite3")

print("DB exists:", os.path.exists(DB_PATH))
print("DB path:", DB_PATH)

def get_due_users():
    global rowcount
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        today = datetime.date.today().isoformat()
        cursor.execute('''SELECT 
                                c.client_name, 
                                t.debit, 
                                t.due_date 
                            FROM 
                                paymentreminder_client c
                            JOIN 
                                paymentreminder_transaction t 
                            ON 
                                c.id = t.client_id;''') #WHERE status = 'unpaid' AND due_date <= ?", (today,)
        rows = cursor.fetchall()
        rowcount = len(rows) - 5
        conn.close()
        return rows[:5]
    except Exception as e:
        print(f"Database error: {e}")
        logging.error(f"Database error: {e}")
        return []

def send_whatsapp_message(message_body):
    try:
        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            from_=WHATSAPP_FROM,
            to=WHATSAPP_TO,
            body=message_body
        )
        print(f"Message sent. SID: {message.sid}")
        logging.info(f"Message sent. SID: {message.sid}")
    except Exception as e:
        print(f"Twilio error: {e}")
        logging.error(f"Twilio error: {e}")

def main():
    due_users = get_due_users()
    if due_users:
        message = "📅 *Payment Reminders for Today*\n\n"
        for name, debit, due in due_users:
            message += (
                f"👤 *{name}*\n"
                f"   🗓️ Due: _{due}_\n"
                f"   💰 Amount: *₹* *{float(debit)}*\n"
                f"\n"
            )
        message += (f"🔔 And *{rowcount}* more clients with payments due today." if rowcount > 0 else "")
        send_whatsapp_message(message)
    else:
        print("No users due today.")
        logging.info("No users due today.")

if __name__ == "__main__":
    main()
