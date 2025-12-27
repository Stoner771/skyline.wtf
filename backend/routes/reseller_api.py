from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_reseller
from controllers.ticket_controller import (
    create_ticket, get_tickets, get_ticket_by_id, update_ticket,
    add_message_to_ticket, add_attachment_to_message
)
from controllers.reseller_controller import (
    get_reseller_by_id, get_credit_transactions, get_reseller_applications
)
from schemas.ticket import (
    TicketCreate, TicketUpdate, TicketResponse, TicketMessageCreate,
    TicketMessageResponse, TicketAttachmentCreate, TicketAttachmentResponse
)
from schemas.reseller import CreditTransactionResponse
from schemas.license import LicenseCreate
from models.reseller import Reseller, ResellerApplication
from models.license import License
from models.app import App
import os
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from utils.license_generator import generate_license_key
from decimal import Decimal
from fastapi.responses import FileResponse

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/tickets")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/profile")
async def get_profile(
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    return {
        "id": current_reseller.id,
        "username": current_reseller.username,
        "email": current_reseller.email,
        "company_name": current_reseller.company_name,
        "contact_person": current_reseller.contact_person,
        "phone": current_reseller.phone,
        "credits": float(current_reseller.credits),
        "is_verified": current_reseller.is_verified,
        "created_at": current_reseller.created_at
    }


@router.get("/credits/transactions", response_model=list[CreditTransactionResponse])
async def get_my_transactions(
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    return get_credit_transactions(db, current_reseller.id)


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket_endpoint(
    ticket_data: TicketCreate,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    try:
        ticket = create_ticket(db, ticket_data, current_reseller.id)
        # Filter out internal notes from messages for resellers (should be none for new tickets)
        if hasattr(ticket, 'messages') and ticket.messages:
            filtered = [msg for msg in ticket.messages if not getattr(msg, 'is_internal_note', False)]
            object.__setattr__(ticket, 'messages', filtered)
        return ticket
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/tickets", response_model=list[TicketResponse])
async def list_my_tickets(
    status: str = None,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    tickets = get_tickets(db, reseller_id=current_reseller.id, status=status)
    # Filter out internal notes from messages for resellers
    # We need to do this before Pydantic serialization
    for ticket in tickets:
        if hasattr(ticket, 'messages') and ticket.messages:
            # Create a filtered list and replace the relationship temporarily
            filtered = [msg for msg in ticket.messages if not getattr(msg, 'is_internal_note', False)]
            object.__setattr__(ticket, 'messages', filtered)
    return tickets


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    ticket = get_ticket_by_id(db, ticket_id, reseller_id=current_reseller.id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    # Filter out internal notes from messages for resellers
    if hasattr(ticket, 'messages') and ticket.messages:
        filtered = [msg for msg in ticket.messages if not getattr(msg, 'is_internal_note', False)]
        object.__setattr__(ticket, 'messages', filtered)
    return ticket


@router.post("/tickets/{ticket_id}/messages", response_model=TicketMessageResponse)
async def add_message(
    ticket_id: int,
    message_data: TicketMessageCreate,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    # Verify ticket belongs to reseller
    ticket = get_ticket_by_id(db, ticket_id, reseller_id=current_reseller.id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    try:
        message = add_message_to_ticket(
            db, ticket_id, message_data, 
            sender_type="reseller", 
            sender_id=current_reseller.id
        )
        
        # Notify WebSocket connections about new message
        from routes.websocket import manager
        from schemas.ticket import TicketMessageResponse
        message_response = TicketMessageResponse(
            id=message.id,
            sender_type=message.sender_type,
            sender_id=message.sender_id,
            message=message.message,
            is_internal_note=message.is_internal_note,
            created_at=message.created_at,
            attachments=[]
        )
        await manager.broadcast_to_ticket(ticket_id, {
            "type": "new_message",
            "ticket_id": ticket_id,
            "message": message_response.dict()
        })
        
        return message
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/tickets/{ticket_id}/messages/{message_id}/attachments", response_model=TicketAttachmentResponse)
async def upload_attachment(
    ticket_id: int,
    message_id: int,
    file: UploadFile = FastAPIFile(None),
    link_url: str = None,
    link_title: str = None,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    # Verify ticket belongs to reseller
    ticket = get_ticket_by_id(db, ticket_id, reseller_id=current_reseller.id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    from models.ticket import TicketMessage
    message = db.query(TicketMessage).filter(
        TicketMessage.id == message_id,
        TicketMessage.ticket_id == ticket_id,
        TicketMessage.sender_type == "reseller",
        TicketMessage.sender_id == current_reseller.id
    ).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    if file:
        # Handle file upload
        file_ext = Path(file.filename).suffix
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / file_name
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        attachment_data = TicketAttachmentCreate(
            attachment_type="file",
            file_path=str(file_path.absolute()),
            file_name=file.filename,
            file_size=len(content)
        )
    elif link_url:
        # Handle link upload
        attachment_data = TicketAttachmentCreate(
            attachment_type="link",
            link_url=link_url,
            link_title=link_title or link_url
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either file or link_url must be provided"
        )
    
    try:
        return add_attachment_to_message(db, message_id, attachment_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/apps")
async def get_my_applications(
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    return get_reseller_applications(db, current_reseller.id)


@router.post("/licenses/generate")
async def generate_license(
    app_id: int,
    duration_days: int,
    username: str = None,
    hwid: str = None,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    # Verify reseller has access to this app
    assignment = db.query(ResellerApplication).filter(
        ResellerApplication.reseller_id == current_reseller.id,
        ResellerApplication.app_id == app_id,
        ResellerApplication.is_active == True
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this application"
        )
    
    # Get app details
    app = db.query(App).filter(App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    
    # Calculate credit cost (e.g., $1 per day)
    credit_cost = Decimal(str(duration_days))
    
    if current_reseller.credits < credit_cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient credits. Required: ${credit_cost}, Available: ${current_reseller.credits}"
        )
    
    # Deduct credits
    from models.reseller import CreditTransaction
    current_reseller.credits -= credit_cost
    new_balance = current_reseller.credits
    
    # Create transaction record
    transaction = CreditTransaction(
        reseller_id=current_reseller.id,
        amount=-credit_cost,
        balance_after=new_balance,
        transaction_type="usage",
        description=f"License generated for {app.name} ({duration_days} days)"
    )
    db.add(transaction)
    
    # Generate license
    license_key = generate_license_key()
    expiry_date = datetime.utcnow() + timedelta(days=duration_days)
    
    license = License(
        key=license_key,
        app_id=app_id,
        username=username,
        hwid=hwid,
        expires_at=expiry_date,
        is_active=True,
        created_by_reseller_id=current_reseller.id
    )
    db.add(license)
    db.commit()
    db.refresh(license)
    
    return {
        "license_key": license_key,
        "app_name": app.name,
        "username": username,
        "expires_at": expiry_date,
        "duration_days": duration_days,
        "cost": float(credit_cost),
        "remaining_credits": float(new_balance)
    }


@router.get("/licenses")
async def get_my_licenses(
    app_id: int = None,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    query = db.query(License).filter(License.created_by_reseller_id == current_reseller.id)
    if app_id:
        query = query.filter(License.app_id == app_id)
    
    licenses = query.order_by(License.created_at.desc()).limit(100).all()
    
    result = []
    for lic in licenses:
        app = db.query(App).filter(App.id == lic.app_id).first()
        result.append({
            "id": lic.id,
            "key": lic.key,
            "app_name": app.name if app else "Unknown",
            "username": lic.username,
            "hwid": lic.hwid,
            "expires_at": lic.expires_at,
            "is_active": lic.is_active,
            "created_at": lic.created_at
        })
    
    return result


@router.get("/tickets/{ticket_id}/attachments/{attachment_id}/download")
async def download_attachment(
    ticket_id: int,
    attachment_id: int,
    current_reseller: Reseller = Depends(get_current_reseller),
    db: Session = Depends(get_db)
):
    from models.ticket import TicketAttachment, TicketMessage
    
    # Verify ticket belongs to reseller
    ticket = get_ticket_by_id(db, ticket_id, reseller_id=current_reseller.id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    attachment = db.query(TicketAttachment).join(TicketMessage).filter(
        TicketAttachment.id == attachment_id,
        TicketMessage.ticket_id == ticket_id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    
    if attachment.attachment_type != "file" or not attachment.file_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a file attachment")
    
    # Use the stored path (should be absolute)
    file_path = Path(attachment.file_path)
    
    # If absolute path doesn't exist, try relative to uploads directory
    if not file_path.exists():
        file_path = UPLOAD_DIR / Path(attachment.file_path).name
    
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")
    
    return FileResponse(
        file_path,
        filename=attachment.file_name,
        media_type="application/octet-stream"
    )

