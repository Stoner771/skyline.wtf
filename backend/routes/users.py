from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.user import User
from models.app import App
from schemas.user import UserResponse, BanRequest, UnbanRequest

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
async def get_users(
    app_id: int = None,
    is_banned: bool = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).join(App).filter(App.admin_id == current_admin.id)
    if app_id:
        query = query.filter(User.app_id == app_id)
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)
    return query.all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).join(App).filter(
        User.id == user_id,
        App.admin_id == current_admin.id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post("/ban")
async def ban_user(
    request: BanRequest,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).join(App).filter(
        User.id == request.user_id,
        App.admin_id == current_admin.id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.is_banned = True
    user.ban_reason = request.reason
    db.commit()
    
    if user.app.webhook_url:
        from utils.webhook import send_webhook
        import asyncio
        asyncio.create_task(send_webhook(user.app.webhook_url, "ban", {
            "user_id": user.id,
            "username": user.username,
            "reason": request.reason
        }))
    
    return {"success": True, "message": "User banned"}


@router.post("/unban")
async def unban_user(
    request: UnbanRequest,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).join(App).filter(
        User.id == request.user_id,
        App.admin_id == current_admin.id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.is_banned = False
    user.ban_reason = None
    db.commit()
    return {"success": True, "message": "User unbanned"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).join(App).filter(
        User.id == user_id,
        App.admin_id == current_admin.id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    db.delete(user)
    db.commit()
    return {"success": True, "message": "User deleted"}

