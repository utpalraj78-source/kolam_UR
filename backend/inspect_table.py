from sqlalchemy import create_engine, inspect
import os

DATABASE_URL = "sqlite:///./kolam_chat.db"
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

if "kolam_history" in inspector.get_table_names():
    columns = inspector.get_columns("kolam_history")
    print("Columns in kolam_history:")
    for col in columns:
        print(f"- {col['name']} ({col['type']})")
else:
    print("kolam_history table not found")
