from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db, User, UserStats
import auth as auth_utils
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterSchema(BaseModel):
    username: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(req: RegisterSchema, db: Session = Depends(get_db)):
    try:
        # Validate email format
        email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(email_regex, req.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        # Check if user exists
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        if db.query(User).filter(User.username == req.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        
        hashed_pwd = auth_utils.get_password_hash(req.password)
        new_user = User(username=req.username, email=req.email, hashed_password=hashed_pwd)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Initialize stats for new user
        user_stats = UserStats(user_id=new_user.id, streak_days=1, xp_points=100)
        db.add(user_stats)
        db.commit()
        
        token = auth_utils.create_access_token(data={"sub": new_user.email, "id": new_user.id})
        return {"access_token": token, "token_type": "bearer", "user": {"username": new_user.username, "email": new_user.email, "is_admin": new_user.is_admin}}
    except HTTPException:
        raise
    except Exception as e:
        print(f"REGISTRATION_ERROR: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

@router.post("/login")
async def login(req: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not auth_utils.verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = auth_utils.create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": token, "token_type": "bearer", "user": {"username": user.username, "email": user.email, "is_admin": user.is_admin}}
