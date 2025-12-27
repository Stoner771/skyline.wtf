from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    secret = Column(String(255), unique=True, nullable=False, index=True)
    version = Column(String(50), default="1.0.0")
    force_update = Column(Boolean, default=False)
    webhook_url = Column(Text)
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    admin = relationship("Admin", back_populates="apps")
    users = relationship("User", back_populates="app", cascade="all, delete-orphan")
    licenses = relationship("License", back_populates="app", cascade="all, delete-orphan")
    files = relationship("File", back_populates="app", cascade="all, delete-orphan")
    variables = relationship("Variable", back_populates="app", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="app", cascade="all, delete-orphan")

