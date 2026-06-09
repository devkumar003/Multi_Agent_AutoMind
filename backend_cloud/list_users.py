import sys
sys.path.append(r"c:\Users\Indian\Desktop\project\Multi_Agent_AutoMind\Multi_Agent_AutoMind\backend_cloud")

from db import SessionLocal, User

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Username: {u.username}, is_admin: {u.is_admin}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
