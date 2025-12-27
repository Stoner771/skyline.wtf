from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from controllers.ticket_controller import (
    create_ticket, get_tickets, get_ticket_by_id, update_ticket,
    add_message_to_ticket, add_attachment_to_message
)
from schemas.ticket import (
    TicketCreate, TicketUpdate, TicketResponse, TicketMessageCreate,
    TicketMessageResponse, TicketAttachmentCreate, TicketAttachmentResponse
)
from models.admin import Admin
from models.ticket import TicketAttachment
import os
import uuid
from pathlib import Path

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/tickets")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/", response_model=TicketResponse)
async def create_ticket_endpoint(
    ticket_data: TicketCreate,
    reseller_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Admin can create tickets on behalf of resellers
    try:
        return create_ticket(db, ticket_data, reseller_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=list[TicketResponse])
async def list_tickets(
    status: str = None,
    reseller_id: int = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_tickets(db, reseller_id=reseller_id, status=status)


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    ticket = get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket_endpoint(
    ticket_id: int,
    ticket_data: TicketUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    ticket = update_ticket(db, ticket_id, ticket_data)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/{ticket_id}/messages", response_model=TicketMessageResponse)
async def add_message(
    ticket_id: int,
    message_data: TicketMessageCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        message = add_message_to_ticket(
            db, ticket_id, message_data, 
            sender_type="admin", 
            sender_id=current_admin.id
        )
        
        # Notify WebSocket connections about new message
        from routes.websocket import manager
        from schemas.ticket import TicketMessageResponse as TicketMessageResponseSchema
        message_response = TicketMessageResponseSchema(
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


@router.post("/{ticket_id}/messages/{message_id}/attachments", response_model=TicketAttachmentResponse)
async def upload_attachment(
    ticket_id: int,
    message_id: int,
    file: UploadFile = FastAPIFile(None),
    link_url: str = None,
    link_title: str = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Verify ticket and message exist
    ticket = get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    from models.ticket import TicketMessage
    message = db.query(TicketMessage).filter(
        TicketMessage.id == message_id,
        TicketMessage.ticket_id == ticket_id
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


@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    ticket = get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    db.delete(ticket)
    db.commit()
    return {"success": True, "message": "Ticket deleted successfully"}


@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    from models.ticket import TicketMessage
    attachment = db.query(TicketAttachment).join(TicketMessage).filter(TicketAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    
    # Verify admin has access to this ticket
    ticket = get_ticket_by_id(db, attachment.message.ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
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

