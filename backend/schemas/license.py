from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LicenseCreate(BaseModel):
    app_id: int
    duration_days: Optional[int] = None
    is_lifetime: bool = False
    count: int = 1


class LicenseResponse(BaseModel):
    id: int
    license_key: str
    hwid: Optional[str] = None
    expiry_timestamp: Optional[datetime] = None
    is_active: bool
    app_id: int
    user_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class LicenseResetHWID(BaseModel):
    license_id: int

