import sqlite3

def migrate():
    conn = sqlite3.connect("kolam_chat.db")
    cursor = conn.cursor()
    
    try:
        # Add role column
        try:
            print("Adding role column...")
            cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'learner' NOT NULL")
            print("Added role column.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("role column already exists.")
            else:
                print(f"Error adding role column: {e}")

        # Add company_name column
        try:
            print("Adding company_name column...")
            cursor.execute("ALTER TABLE users ADD COLUMN company_name VARCHAR(100)")
            print("Added company_name column.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("company_name column already exists.")
            else:
                print(f"Error adding company_name column: {e}")

        conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
