from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from .reseller import CreditTransactionResponse


class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    ticket_type: str = "support"
    priority: str = "medium"
    topup_amount: Optional[Decimal] = None  # Required if ticket_type is "topup_request"


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_admin_id: Optional[int] = None


class TicketMessageCreate(BaseModel):
    message: str
    is_internal_note: bool = False


class TicketAttachmentCreate(BaseModel):
    attachment_type: str  # 'file' or 'link'
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None


class TicketAttachmentResponse(BaseModel):
    id: int
    attachment_type: str
    file_path: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    link_url: Optional[str]
    link_title: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class TicketMessageResponse(BaseModel):
    id: int
    sender_type: str
    sender_id: int
    message: str
    is_internal_note: bool
    created_at: datetime
    attachments: List[TicketAttachmentResponse] = []
    
    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    ticket_type: str
    topup_amount: Optional[Decimal]
    assigned_to_admin_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    reseller_id: int
    messages: List[TicketMessageResponse] = []
    
    class Config:
        from_attributes = True

