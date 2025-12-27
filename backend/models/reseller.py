from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Reseller(Base):
    __tablename__ = "resellers"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    company_name = Column(String(255))
    contact_person = Column(String(100))
    phone = Column(String(50))
    address = Column(Text)
    credits = Column(Numeric(15, 2), default=0.00)  # Current credit balance
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=False)  # Created by admin
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime)
    
    admin = relationship("Admin", back_populates="resellers")
    credit_transactions = relationship("CreditTransaction", back_populates="reseller", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="reseller", cascade="all, delete-orphan")
    applications = relationship("ResellerApplication", back_populates="reseller", cascade="all, delete-orphan")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    reseller_id = Column(Integer, ForeignKey("resellers.id"), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)  # Positive for credit, negative for debit
    balance_after = Column(Numeric(15, 2), nullable=False)  # Balance after this transaction
    transaction_type = Column(String(50), nullable=False)  # 'admin_assign', 'topup_request', 'topup_approved', 'usage', 'refund'
    description = Column(Text)
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=True)  # Admin who processed (if applicable)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)  # Related ticket (if from topup request)
    created_at = Column(DateTime, server_default=func.now())
    
    reseller = relationship("Reseller", back_populates="credit_transactions")
    admin = relationship("Admin")
    ticket = relationship("Ticket", back_populates="credit_transactions")


class ResellerApplication(Base):
    __tablename__ = "reseller_applications"

    id = Column(Integer, primary_key=True, index=True)
    reseller_id = Column(Integer, ForeignKey("resellers.id"), nullable=False, index=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    reseller = relationship("Reseller", back_populates="applications")
    app = relationship("App")

