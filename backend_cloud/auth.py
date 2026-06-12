import os
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db import get_db, User
from jose import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    def get_or_create_guest():
        guest = db.query(User).filter(User.username == "Guest").first()
        if not guest:
            import uuid
            from db import UserStats
            guest = User(clerk_id=str(uuid.uuid4()), username="Guest", email="guest@example.com", hashed_password="no", is_admin=0)
            db.add(guest)
            db.commit()
            db.refresh(guest)
            
            stats = UserStats(user_id=guest.id, streak_days=0, xp_points=0)
            db.add(stats)
            db.commit()
        return guest

    if not token:
        return get_or_create_guest()

    try:
        # Decode the Clerk token without verifying signature for simplicity in this prototype
        # In a strict production environment, fetch JWKS from Clerk and verify the signature.
        payload = jwt.get_unverified_claims(token)
        clerk_id: str = payload.get("sub")
        
        if not clerk_id:
            return get_or_create_guest()
            
        # Try to find the user in our local database
        user = db.query(User).filter(User.clerk_id == clerk_id).first()
        
        # Lazy creation if user doesn't exist yet
        if not user:
            from db import UserStats
            user = User(
                clerk_id=clerk_id, 
                username=request.headers.get("X-User-Name", clerk_id[:8]), 
                email=request.headers.get("X-User-Email", f"{clerk_id}@clerk.local"), 
                hashed_password="clerk_managed", 
                is_admin=0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            stats = UserStats(user_id=user.id, streak_days=0, xp_points=0)
            db.add(stats)
            db.commit()
            
        return user
    except Exception as e:
        print("Token decode error:", e)
        return get_or_create_guest()

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.get_unverified_claims(token)
        clerk_id: str = payload.get("sub")
        if not clerk_id:
            return None
        return db.query(User).filter(User.clerk_id == clerk_id).first()
    except Exception:
        return None

