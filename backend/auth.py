import bcrypt
from datetime import datetime, timedelta
from jose import jwt
import os

# Configuration
SECRET_KEY = os.getenv("AUTH_SECRET", "super-secret-key-31337-cinematic-ai-os")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

def verify_password(plain_password, hashed_password):
    # Ensure password is bytes for bcrypt
    password_bytes = plain_password[:72].encode('utf-8')
    # If the hashed_password is a string (from DB), encode it
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_password)
    except Exception:
        return False

def get_password_hash(password):
    # Bcrypt has a 72-byte limit and requires bytes
    password_bytes = password[:72].encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db import get_db, User
from jose import JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        if user_id is None:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.id == user_id).first()

