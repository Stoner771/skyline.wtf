from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    apps = relationship("App", back_populates="admin", cascade="all, delete-orphan")
    resellers = relationship("Reseller", back_populates="admin", cascade="all, delete-orphan")

