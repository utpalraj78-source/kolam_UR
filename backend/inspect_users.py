from sqlalchemy import create_engine, inspect
import os

DATABASE_URL = "sqlite:///./kolam_chat.db"
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

if "users" in inspector.get_table_names():
    columns = inspector.get_columns("users")
    print("Columns in users:")
    for col in columns:
        print(f"- {col['name']} ({col['type']})")
else:
    print("users table not found")
