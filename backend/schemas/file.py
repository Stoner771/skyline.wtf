from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FileResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    file_size: Optional[int]
    mime_type: Optional[str]
    app_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class FileUpload(BaseModel):
    app_id: int
    filename: str

