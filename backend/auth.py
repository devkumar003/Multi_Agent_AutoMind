import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

class DummyUser:
    def __init__(self, id: str):
        self.id = id
        self.is_admin = 1 # Local user is always admin

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        return DummyUser(id="Guest")
    try:
        payload = jwt.get_unverified_claims(token)
        clerk_id: str = payload.get("sub")
        if not clerk_id:
            return DummyUser(id="Guest")
        return DummyUser(id=clerk_id)
    except Exception as e:
        return DummyUser(id="Guest")

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional)):
    if not token:
        return None
    try:
        payload = jwt.get_unverified_claims(token)
        clerk_id: str = payload.get("sub")
        if not clerk_id:
            return None
        return DummyUser(id=clerk_id)
    except Exception:
        return None

