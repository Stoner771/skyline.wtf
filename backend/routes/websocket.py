from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session
from database import SessionLocal
from security.jwt import verify_token
from models.reseller import Reseller
from models.admin import Admin
from models.ticket import Ticket, TicketMessage
from typing import Dict, Set
import json
import asyncio

router = APIRouter()

# Store active connections
class ConnectionManager:
    def __init__(self):
        # ticket_id -> Set[WebSocket]
        self.ticket_connections: Dict[int, Set[WebSocket]] = {}
        # user_id -> Set[WebSocket] for tracking user connections
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, ticket_id: int, user_id: str):
        await websocket.accept()
        if ticket_id not in self.ticket_connections:
            self.ticket_connections[ticket_id] = set()
        self.ticket_connections[ticket_id].add(websocket)
        
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        
    def disconnect(self, websocket: WebSocket, ticket_id: int, user_id: str):
        if ticket_id in self.ticket_connections:
            self.ticket_connections[ticket_id].discard(websocket)
            if not self.ticket_connections[ticket_id]:
                del self.ticket_connections[ticket_id]
                
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast_to_ticket(self, ticket_id: int, message: dict):
        if ticket_id in self.ticket_connections:
            disconnected = set()
            for connection in self.ticket_connections[ticket_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending message: {e}")
                    disconnected.add(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.ticket_connections[ticket_id].discard(conn)
    
    async def broadcast_video_call_signal(self, ticket_id: int, signal: dict, sender_ws: WebSocket):
        """Broadcast video call signaling messages to all connections except sender"""
        if ticket_id in self.ticket_connections:
            for connection in self.ticket_connections[ticket_id]:
                if connection != sender_ws:
                    try:
                        await connection.send_json({
                            "type": "video_signal",
                            "data": signal
                        })
                    except Exception as e:
                        print(f"Error sending video signal: {e}")

manager = ConnectionManager()


async def get_current_user_from_token(token: str, db: Session):
    """Verify token and return user info"""
    payload = verify_token(token)
    if not payload:
        return None
    
    user_type = payload.get("type")
    user_id = payload.get("reseller_id") or payload.get("admin_id")
    
    if user_type == "reseller" and user_id:
        reseller = db.query(Reseller).filter(Reseller.id == user_id).first()
        if reseller and reseller.is_active:
            return {"type": "reseller", "id": reseller.id, "username": reseller.username}
    elif user_type == "admin" and user_id:
        admin = db.query(Admin).filter(Admin.id == user_id).first()
        if admin and admin.is_active:
            return {"type": "admin", "id": admin.id, "username": admin.username}
    
    return None


@router.websocket("/ticket/{ticket_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    ticket_id: int,
    token: str = Query(...)
):
    db = SessionLocal()
    try:
        # Verify token
        user = await get_current_user_from_token(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Verify user has access to this ticket
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Ticket not found")
            return
        
        if user["type"] == "reseller" and ticket.reseller_id != user["id"]:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Access denied")
            return
        
        user_id = f"{user['type']}_{user['id']}"
        
        # Connect
        await manager.connect(websocket, ticket_id, user_id)
        
        # Send connection confirmation
        await manager.send_personal_message({
            "type": "connected",
            "ticket_id": ticket_id,
            "user": user
        }, websocket)
        
        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
            
            elif data.get("type") == "video_signal":
                # Forward WebRTC signaling messages
                await manager.broadcast_video_call_signal(
                    ticket_id,
                    data.get("data", {}),
                    websocket
                )
            
            elif data.get("type") == "voice_call_request":
                # Notify other users about voice call request
                await manager.broadcast_to_ticket(ticket_id, {
                    "type": "voice_call_request",
                    "from": user,
                    "ticket_id": ticket_id
                })
            
            elif data.get("type") == "video_call_request":
                # Notify other users about video call request
                await manager.broadcast_to_ticket(ticket_id, {
                    "type": "video_call_request",
                    "from": user,
                    "ticket_id": ticket_id
                })
            
            elif data.get("type") == "voice_call_end" or data.get("type") == "video_call_end":
                # Notify other users that call ended
                await manager.broadcast_to_ticket(ticket_id, {
                    "type": data.get("type"),
                    "from": user,
                    "ticket_id": ticket_id
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, ticket_id, user_id if 'user_id' in locals() else "")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, ticket_id, user_id if 'user_id' in locals() else "")
    finally:
        db.close()

