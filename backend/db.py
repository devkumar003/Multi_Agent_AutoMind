from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os

# Create engine safely
DB_PATH = os.path.join(os.path.dirname(__file__), "autothink_v2.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Integer, default=0) # 0=False, 1=True
    created_at = Column(DateTime, default=datetime.utcnow)
    
    stats = relationship("UserStats", back_populates="owner", uselist=False)
    activities = relationship("ActivityHistory", back_populates="owner")

class UserStats(Base):
    __tablename__ = "user_stats"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    streak_days = Column(Integer, default=0)
    xp_points = Column(Integer, default=0)
    
    owner = relationship("User", back_populates="stats")

class ActivityHistory(Base):
    __tablename__ = "activity_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, index=True)
    activity_type = Column(String) # 'data', 'chat', 'challenge', 'code'
    subtitle = Column(String)
    payload = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="activities")

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
    
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Existing migrations
            try: conn.execute(text("ALTER TABLE user_stats ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            except: pass
            try: conn.execute(text("ALTER TABLE activity_history ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            except: pass
            try: conn.execute(text("ALTER TABLE activity_history ADD COLUMN payload VARCHAR"))
            except: pass
            
            # New migrations for contest system
            try: conn.execute(text("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0"))
            except: pass
            try: conn.execute(text("ALTER TABLE challenges ADD COLUMN description VARCHAR"))
            except: pass
            try: conn.execute(text("ALTER TABLE challenges ADD COLUMN constraints VARCHAR"))
            except: pass
            try: conn.execute(text("ALTER TABLE challenges ADD COLUMN input_format VARCHAR"))
            except: pass
            try: conn.execute(text("ALTER TABLE challenges ADD COLUMN output_format VARCHAR"))
            except: pass
            try: conn.execute(text("ALTER TABLE challenges ADD COLUMN memory_limit_mb INTEGER DEFAULT 256"))
            except: pass
            try: conn.execute(text("ALTER TABLE challenges ADD COLUMN is_published INTEGER DEFAULT 1"))
            except: pass
            try: conn.execute(text("ALTER TABLE challenges ADD COLUMN creator_id INTEGER REFERENCES users(id)"))
            except: pass
            
            conn.commit()
    except Exception:
        pass
        
    db = SessionLocal()
    
    # Seed Challenges if not exist (Global)
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
    db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
