from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True)
    hwid = Column(String(255), index=True)
    ip_address = Column(String(45))
    subscription_name = Column(String(100))
    expiry_timestamp = Column(DateTime)
    account_creation_date = Column(DateTime, server_default=func.now())
    last_login_time = Column(DateTime)
    is_banned = Column(Boolean, default=False)
    ban_reason = Column(Text)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    
    app = relationship("App", back_populates="users")
    logs = relationship("Log", back_populates="user", cascade="all, delete-orphan")
    licenses = relationship("License", back_populates="user", cascade="all, delete-orphan")

