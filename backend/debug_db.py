from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

# Database URL
DATABASE_URL = "sqlite:///./kolam_chat.db"

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Check if table exists
        result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='kolam_history';"))
        if not result.fetchone():
            print("ERROR: Table 'kolam_history' DOES NOT EXIST.")
        else:
            print("SUCCESS: Table 'kolam_history' exists.")
            
            # Try to query something
            result = connection.execute(text("SELECT * FROM kolam_history LIMIT 1;"))
            row = result.fetchone()
            if row:
                print("Found a row:", row)
            else:
                print("Table is empty (this is normal if no history yet).")
                
except Exception as e:
    print(f"DATABASE ERROR: {e}")
