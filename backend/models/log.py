from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    details = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="logs")
    app = relationship("App", back_populates="logs")

