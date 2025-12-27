from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.admin import Admin
from models.user import User
from models.app import App
from models.license import License
from security.password import hash_password
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter()


class AdminCreate(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None


@router.post("/create")
async def create_admin(
    admin_data: AdminCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Admin).filter(Admin.username == admin_data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin username already exists"
        )
    admin = Admin(
        username=admin_data.username,
        password_hash=hash_password(admin_data.password),
        email=admin_data.email
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"id": admin.id, "username": admin.username, "email": admin.email}


@router.get("/stats")
async def get_stats(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    apps = db.query(App).filter(App.admin_id == current_admin.id).count()
    total_users = db.query(User).join(App).filter(App.admin_id == current_admin.id).count()
    banned_users = db.query(User).join(App).filter(
        App.admin_id == current_admin.id,
        User.is_banned == True
    ).count()
    total_licenses = db.query(License).join(App).filter(App.admin_id == current_admin.id).count()
    active_licenses = db.query(License).join(App).filter(
        App.admin_id == current_admin.id,
        License.is_active == True
    ).count()
    
    return {
        "apps": apps,
        "total_users": total_users,
        "banned_users": banned_users,
        "total_licenses": total_licenses,
        "active_licenses": active_licenses
    }

