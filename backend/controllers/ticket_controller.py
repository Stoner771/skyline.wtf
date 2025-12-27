from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from models.ticket import Ticket, TicketMessage, TicketAttachment, TicketStatus, TicketPriority, TicketType
from schemas.ticket import TicketCreate, TicketUpdate, TicketMessageCreate, TicketAttachmentCreate
from datetime import datetime


def create_ticket(db: Session, ticket_data: TicketCreate, reseller_id: int):
    # Convert string enums to proper enum types if needed
    ticket_type = TicketType(ticket_data.ticket_type) if isinstance(ticket_data.ticket_type, str) else ticket_data.ticket_type
    priority = TicketPriority(ticket_data.priority) if isinstance(ticket_data.priority, str) else ticket_data.priority
    
    ticket = Ticket(
        title=ticket_data.title,
        description=ticket_data.description,
        ticket_type=ticket_type,
        priority=priority,
        topup_amount=ticket_data.topup_amount,
        reseller_id=reseller_id,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def get_tickets(db: Session, reseller_id: int = None, status: str = None, limit: int = 100):
    query = db.query(Ticket).options(
        joinedload(Ticket.messages).joinedload(TicketMessage.attachments)
    )
    if reseller_id:
        query = query.filter(Ticket.reseller_id == reseller_id)
    if status:
        query = query.filter(Ticket.status == status)
    return query.order_by(desc(Ticket.created_at)).limit(limit).all()


def get_ticket_by_id(db: Session, ticket_id: int, reseller_id: int = None):
    query = db.query(Ticket).options(
        joinedload(Ticket.messages).joinedload(TicketMessage.attachments)
    ).filter(Ticket.id == ticket_id)
    if reseller_id:
        query = query.filter(Ticket.reseller_id == reseller_id)
    return query.first()


def update_ticket(db: Session, ticket_id: int, ticket_data: TicketUpdate, reseller_id: int = None):
    query = db.query(Ticket).filter(Ticket.id == ticket_id)
    if reseller_id:
        query = query.filter(Ticket.reseller_id == reseller_id)
    
    ticket = query.first()
    if not ticket:
        return None
    
    update_data = ticket_data.dict(exclude_unset=True)
    if "status" in update_data:
        update_data["status"] = TicketStatus(update_data["status"])
    if "priority" in update_data:
        update_data["priority"] = TicketPriority(update_data["priority"])
    
    for key, value in update_data.items():
        setattr(ticket, key, value)
    
    if ticket.status == TicketStatus.RESOLVED and not ticket.resolved_at:
        ticket.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ticket)
    return ticket


def add_message_to_ticket(
    db: Session, 
    ticket_id: int, 
    message_data: TicketMessageCreate,
    sender_type: str,
    sender_id: int
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise ValueError("Ticket not found")
    
    message = TicketMessage(
        ticket_id=ticket_id,
        sender_type=sender_type,
        sender_id=sender_id,
        message=message_data.message,
        is_internal_note=message_data.is_internal_note
    )
    db.add(message)
    
    # Update ticket updated_at
    ticket.updated_at = datetime.utcnow()
    
    # If message is from admin and ticket is open, set to in_progress
    if sender_type == "admin" and ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(message)
    return message


def add_attachment_to_message(
    db: Session,
    message_id: int,
    attachment_data: TicketAttachmentCreate
):
    message = db.query(TicketMessage).filter(TicketMessage.id == message_id).first()
    if not message:
        raise ValueError("Message not found")
    
    attachment = TicketAttachment(
        message_id=message_id,
        attachment_type=attachment_data.attachment_type,
        file_path=attachment_data.file_path,
        file_name=attachment_data.file_name,
        file_size=attachment_data.file_size,
        link_url=attachment_data.link_url,
        link_title=attachment_data.link_title
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment

