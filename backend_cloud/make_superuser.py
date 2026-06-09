import os
import sys

# Add backend_cloud to path
sys.path.append(r"c:\Users\Indian\Desktop\project\Multi_Agent_AutoMind\Multi_Agent_AutoMind\backend_cloud")

import sys
sys.path.append(r"c:\Users\Indian\Desktop\project\Multi_Agent_AutoMind\Multi_Agent_AutoMind\backend_cloud")

from db import SessionLocal, User

def make_superuser(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_admin = 2
            db.commit()
            print(f"Success: Updated user {email} (ID: {user.id}) to superuser.")
        else:
            print(f"User {email} not found in the database. Please log in first.")
    finally:
        db.close()

if __name__ == "__main__":
    make_superuser("dracqool3@gmail.com")
