from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

# Local Database (SQLite) for ActivityHistory (AI Chat, DataLab)
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "autothink_v2.db")
LOCAL_DATABASE_URL = f"sqlite:///{LOCAL_DB_PATH}"
engine = create_engine(LOCAL_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ActivityHistory(Base):
    __tablename__ = "activity_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String) # Can be 'Guest'
    title = Column(String, index=True)
    activity_type = Column(String) # 'data', 'chat', 'code'
    subtitle = Column(String)
    payload = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
