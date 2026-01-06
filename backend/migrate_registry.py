import sqlite3
import os

DB_FILE = "kolam_chat.db"

def add_registry_table():
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found.")
        return

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Create kolam_registry table
        print("Creating table 'kolam_registry'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS kolam_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_hash VARCHAR(64) UNIQUE NOT NULL,
                json_config JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_kolam_registry_image_hash ON kolam_registry (image_hash);")
        
        conn.commit()
        print("Table 'kolam_registry' created successfully.")
            
        conn.close()
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    add_registry_table()
