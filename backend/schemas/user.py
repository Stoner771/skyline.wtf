from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    subscription_name: Optional[str]
    expiry_timestamp: Optional[datetime]
    account_creation_date: datetime
    last_login_time: Optional[datetime]
    is_banned: bool
    ban_reason: Optional[str]
    
    class Config:
        from_attributes = True


class UserInfoResponse(BaseModel):
    username: str
    subscription_name: Optional[str]
    expiry_timestamp: Optional[datetime]
    account_creation_date: datetime
    is_banned: bool


class BanRequest(BaseModel):
    user_id: int
    reason: Optional[str] = None


class UnbanRequest(BaseModel):
    user_id: int

