from pydantic import BaseModel, EmailStr
from typing import Optional
from decimal import Decimal
from datetime import datetime


class ResellerCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    initial_credits: Optional[Decimal] = Decimal("0.00")


class ResellerUpdate(BaseModel):
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class ResellerResponse(BaseModel):
    id: int
    username: str
    email: str
    company_name: Optional[str]
    contact_person: Optional[str]
    phone: Optional[str]
    credits: Decimal
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreditAssignRequest(BaseModel):
    reseller_id: int
    amount: Decimal
    description: Optional[str] = None


class TopupRequest(BaseModel):
    amount: Decimal
    description: Optional[str] = None


class CreditTransactionResponse(BaseModel):
    id: int
    amount: Decimal
    balance_after: Decimal
    transaction_type: str
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ResellerAppAssignment(BaseModel):
    reseller_id: int
    app_id: int


class ResellerDetailResponse(BaseModel):
    id: int
    username: str
    email: str
    company_name: Optional[str]
    contact_person: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    credits: Decimal
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True

