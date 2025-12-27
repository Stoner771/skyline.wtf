from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    app = relationship("App", back_populates="files")

