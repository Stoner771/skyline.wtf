from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from security.jwt import verify_token
from models.admin import Admin
from models.user import User
from typing import Optional

security = HTTPBearer(auto_error=False)


async def get_current_admin(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    token = None
    
    # Try to get token from HTTPBearer first
    if credentials:
        token = credentials.credentials
    # Fallback: check request headers directly
    else:
        # Check all possible header variations
        auth_header = (
            request.headers.get("Authorization") or 
            request.headers.get("authorization") or
            request.headers.get("AUTHORIZATION")
        )
        if auth_header:
            if auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "").strip()
            elif auth_header.startswith("bearer "):
                token = auth_header.replace("bearer ", "").strip()
            else:
                token = auth_header.strip()
    
    if not token:
        # Log for debugging
        print(f"DEBUG: No token found. Headers: {dict(request.headers)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    admin_id = payload.get("admin_id")
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if admin is None or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found or inactive"
        )
    return admin


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or banned"
        )
    return user


async def get_current_reseller(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    from models.reseller import Reseller
    
    token = None
    
    # Try to get token from HTTPBearer first
    if credentials:
        token = credentials.credentials
    # Fallback: check request headers directly
    else:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_header:
            if auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "").strip()
            else:
                token = auth_header.strip()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    reseller_id = payload.get("reseller_id")
    if reseller_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    reseller = db.query(Reseller).filter(Reseller.id == reseller_id).first()
    if reseller is None or not reseller.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Reseller not found or inactive"
        )
    return reseller

