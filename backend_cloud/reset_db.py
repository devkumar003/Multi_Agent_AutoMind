import sys
sys.path.append(r"c:\Users\Indian\Desktop\project\Multi_Agent_AutoMind\Multi_Agent_AutoMind\backend_cloud")

from db import Base, engine, init_db

def reset_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped successfully.")
    
    print("Recreating tables and seeding data...")
    init_db()
    print("Database reset complete.")

if __name__ == "__main__":
    reset_db()
