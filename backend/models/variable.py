from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Variable(Base):
    __tablename__ = "variables"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), nullable=False)
    value = Column(Text)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    app = relationship("App", back_populates="variables")

