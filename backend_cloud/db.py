from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Cloud Database (Supabase PostgreSQL) for Users, Challenges, Contests, Leaderboard
SUPABASE_URL = os.getenv("SUPABASE_DB_URL")
if not SUPABASE_URL:
    raise ValueError("SUPABASE_DB_URL must be set for the cloud backend.")

# Provide sslmode=require for secure connection to Supabase
connect_args = {}
if "postgresql" in SUPABASE_URL:
    connect_args = {"sslmode": "require"}

engine = create_engine(SUPABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True) 
    clerk_id = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Integer, default=0) # 0=False, 1=True
    created_at = Column(DateTime, default=datetime.utcnow)
    
    stats = relationship("UserStats", back_populates="owner", uselist=False)

class UserStats(Base):
    __tablename__ = "user_stats"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    streak_days = Column(Integer, default=0)
    xp_points = Column(Integer, default=0)
    
    owner = relationship("User", back_populates="stats")

class Challenge(Base):
    __tablename__ = "challenges"
    id = Column(String, primary_key=True, index=True) 
    title = Column(String)
    description = Column(String, nullable=True)
    constraints = Column(String, nullable=True)
    input_format = Column(String, nullable=True)
    output_format = Column(String, nullable=True)
    difficulty = Column(String) # Easy, Medium, Hard
    time_estimate_mins = Column(Integer)
    memory_limit_mb = Column(Integer, default=256)
    tags = Column(String) 
    xp_reward = Column(Integer)
    status = Column(String, default="pending") 
    is_published = Column(Integer, default=1)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    template_code = Column(String)
    test_cases = Column(String) # Legacy test cases format

class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"))
    input_data = Column(String)
    expected_output = Column(String)
    is_hidden = Column(Integer, default=0)
    weight = Column(Integer, default=10)
    source = Column(String, default="admin") # admin, ai

class Contest(Base):
    __tablename__ = "contests"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    is_published = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class ContestChallenge(Base):
    __tablename__ = "contest_challenges"
    contest_id = Column(String, ForeignKey("contests.id"), primary_key=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), primary_key=True)

class ContestParticipant(Base):
    __tablename__ = "contest_participants"
    id = Column(Integer, primary_key=True, index=True)
    contest_id = Column(String, ForeignKey("contests.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Integer, default=0)
    joined_at = Column(DateTime, default=datetime.utcnow)

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    challenge_id = Column(String, ForeignKey("challenges.id"))
    contest_id = Column(String, ForeignKey("contests.id"), nullable=True)
    code = Column(String)
    language = Column(String)
    status = Column(String) # pending, accepted, wrong_answer, time_limit, runtime_error
    score = Column(Integer, default=0)
    execution_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Seed Challenges if not exist (Global)
    try:
        if db.query(Challenge).count() == 0:
            db.add(Challenge(
                id="two-sum-ii",
                title="Two Sum II - Input Array Is Sorted",
                difficulty="Medium",
                time_estimate_mins=30,
                tags="Array,Two Pointers,Binary Search",
                xp_reward=150,
                status="pending",
                template_code="def twoSum(numbers: list[int], target: int) -> list[int]:\n    # Write your code here\n    pass",
                test_cases="assert twoSum([2,7,11,15], 9) == [1, 2]\nassert twoSum([2,3,4], 6) == [1, 3]\nassert twoSum([-1,0], -1) == [1, 2]"
            ))
            db.add(Challenge(
                id="valid-palindrome",
                title="Valid Palindrome",
                difficulty="Easy",
                time_estimate_mins=15,
                tags="String,Two Pointers",
                xp_reward=50,
                status="completed",
                template_code="def isPalindrome(s: str) -> bool:\n    # Write your code here\n    pass",
                test_cases="assert isPalindrome('A man, a plan, a canal: Panama') == True\nassert isPalindrome('race a car') == False"
            ))
            db.add(Challenge(
                id="longest-palindromic-substring",
                title="Longest Palindromic Substring",
                difficulty="Hard",
                time_estimate_mins=45,
                tags="String,Dynamic Programming",
                xp_reward=300,
                status="pending",
                template_code="def longestPalindrome(s: str) -> str:\n    # Write your code here\n    pass",
                test_cases="assert longestPalindrome('babad') in ['bab', 'aba']\nassert longestPalindrome('cbbd') == 'bb'"
            ))
            db.commit()
    except Exception as e:
        print("Could not seed challenges:", e)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
