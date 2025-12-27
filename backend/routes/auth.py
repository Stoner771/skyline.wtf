from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models.admin import Admin
from models.reseller import Reseller
from security.password import hash_password, verify_password
from security.jwt import create_access_token
from schemas.auth import TokenResponse
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class ResellerLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    print(f"DEBUG Admin Login: username={request.username}, password_length={len(request.password)}")
    admin = db.query(Admin).filter(Admin.username == request.username).first()
    print(f"DEBUG: Admin found={admin is not None}")
    if admin:
        print(f"DEBUG: Admin active={admin.is_active}")
        password_valid = verify_password(request.password, admin.password_hash)
        print(f"DEBUG: Password valid={password_valid}")
    if not admin or not verify_password(request.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    token, expiry = create_access_token({"admin_id": admin.id, "type": "admin"})
    return TokenResponse(token=token, expiry=expiry)


@router.post("/reseller/login", response_model=TokenResponse)
async def reseller_login(request: ResellerLoginRequest, db: Session = Depends(get_db)):
    print(f"DEBUG Reseller Login: username={request.username}, password_length={len(request.password)}")
    reseller = db.query(Reseller).filter(Reseller.username == request.username).first()
    print(f"DEBUG: Reseller found={reseller is not None}")
    if reseller:
        print(f"DEBUG: Reseller active={reseller.is_active}")
        password_valid = verify_password(request.password, reseller.password_hash)
        print(f"DEBUG: Password valid={password_valid}")
    if not reseller or not verify_password(request.password, reseller.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    if not reseller.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reseller account is inactive"
        )
    reseller.last_login = datetime.utcnow()
    db.commit()
    token, expiry = create_access_token({"reseller_id": reseller.id, "type": "reseller"})
    return TokenResponse(token=token, expiry=expiry)

