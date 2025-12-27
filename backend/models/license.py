from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, index=True, nullable=False)  # Using 'key' instead of 'license_key'
    username = Column(String(100))
    hwid = Column(String(255), index=True)
    expires_at = Column(DateTime)  # Using 'expires_at' instead of 'expiry_timestamp'
    is_active = Column(Boolean, default=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_reseller_id = Column(Integer, ForeignKey("resellers.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    app = relationship("App", back_populates="licenses")
    user = relationship("User", back_populates="licenses")
    reseller = relationship("Reseller")

