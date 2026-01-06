from sqlalchemy import create_engine, inspect
import os

# Database URL
DATABASE_URL = "sqlite:///./kolam_chat.db"

if os.path.exists("kolam_chat.db"):
    print("Database file found.")
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables in database:", tables)
    
    if "kolam_history" in tables:
        print("kolam_history table exists.")
        # Check columns
        columns = [c['name'] for c in inspector.get_columns("kolam_history")]
        print("Columns in kolam_history:", columns)
    else:
        print("kolam_history table MISSING.")
else:
    print("Database file NOT found.")
