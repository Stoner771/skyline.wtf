from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str
    hwid: Optional[str] = None
    app_secret: str


class LicenseLoginRequest(BaseModel):
    license_key: str
    hwid: Optional[str] = None
    app_secret: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    license_key: Optional[str] = None
    hwid: Optional[str] = None
    app_secret: str


class InitRequest(BaseModel):
    app_secret: str
    version: str


class TokenResponse(BaseModel):
    token: str
    expiry: datetime


class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    expiry: Optional[datetime] = None

