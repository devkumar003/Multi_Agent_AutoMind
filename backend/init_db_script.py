import os
import sys

# Add backend directory to sys.path so we can import from db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import init_db
print("Initializing database...")
init_db()
print("Database initialized successfully.")
