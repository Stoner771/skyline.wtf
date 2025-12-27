from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketType(str, enum.Enum):
    TOPUP_REQUEST = "topup_request"
    SUPPORT = "support"
    TECHNICAL = "technical"
    BILLING = "billing"
    OTHER = "other"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    reseller_id = Column(Integer, ForeignKey("resellers.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, index=True)
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM)
    ticket_type = Column(Enum(TicketType), default=TicketType.SUPPORT)
    topup_amount = Column(Numeric(15, 2), nullable=True)  # If ticket_type is TOPUP_REQUEST
    assigned_to_admin_id = Column(Integer, ForeignKey("admins.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime, nullable=True)
    
    reseller = relationship("Reseller", back_populates="tickets")
    assigned_admin = relationship("Admin")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at")
    credit_transactions = relationship("CreditTransaction", back_populates="ticket")


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False)  # 'reseller' or 'admin'
    sender_id = Column(Integer, nullable=False)  # reseller_id or admin_id
    message = Column(Text, nullable=False)
    is_internal_note = Column(Boolean, default=False)  # Internal notes only visible to admins
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    ticket = relationship("Ticket", back_populates="messages")
    attachments = relationship("TicketAttachment", back_populates="message", cascade="all, delete-orphan")


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("ticket_messages.id"), nullable=False, index=True)
    attachment_type = Column(String(20), nullable=False)  # 'file' or 'link'
    file_path = Column(String(500), nullable=True)  # For file uploads
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)  # In bytes
    link_url = Column(String(1000), nullable=True)  # For link uploads
    link_title = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    message = relationship("TicketMessage", back_populates="attachments")

