from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VariableCreate(BaseModel):
    app_id: int
    key: str
    value: str


class VariableResponse(BaseModel):
    id: int
    key: str
    value: Optional[str]
    app_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VariableUpdate(BaseModel):
    value: str

