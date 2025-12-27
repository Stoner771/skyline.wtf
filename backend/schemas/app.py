from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AppCreate(BaseModel):
    name: str
    version: str = "1.0.0"
    webhook_url: Optional[str] = None


class AppResponse(BaseModel):
    id: int
    name: str
    secret: str
    version: str
    force_update: bool
    webhook_url: Optional[str]
    admin_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class AppUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    force_update: Optional[bool] = None
    webhook_url: Optional[str] = None

