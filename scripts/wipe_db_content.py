import sys
import os

# Add project root and backend folder to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.database import engine, Base
# Import all models
from backend.models import User, KolamHistory, ChatSession, ChatMessage, KolamRegistry
from features.KolamCaptcha.backend.models import CaptchaChallenge

if __name__ == "__main__":
    print("Dropping all tables...")
    try:
        Base.metadata.drop_all(bind=engine)
        print("Tables dropped.")
    except Exception as e:
        print(f"Error dropping tables: {e}")

    print("Creating all tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created.")
    except Exception as e:
        print(f"Error creating tables: {e}")

    print("Database wiped and recreated successfully.")
