import sys
import os

# Add project root and backend folder to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.database import engine, Base
# Import all models to ensure they are registered with Base.metadata
from backend.models import User, KolamHistory, ChatSession, ChatMessage, KolamRegistry
from features.KolamCaptcha.backend.models import CaptchaChallenge

print("Creating missing tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
