from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LogResponse(BaseModel):
    id: int
    action: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[str]
    user_id: Optional[int]
    app_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class LogFilter(BaseModel):
    app_id: Optional[int] = None
    user_id: Optional[int] = None
    action: Optional[str] = None
    limit: int = 100
    offset: int = 0

