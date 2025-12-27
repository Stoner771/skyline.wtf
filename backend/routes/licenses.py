from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.license import License
from models.app import App
from schemas.license import LicenseCreate, LicenseResponse, LicenseResetHWID
from utils.license_generator import generate_license_key
from datetime import datetime, timedelta

router = APIRouter()


@router.post("/", response_model=list[LicenseResponse])
async def create_licenses(
    license_data: LicenseCreate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    app = db.query(App).filter(
        App.id == license_data.app_id,
        App.admin_id == current_admin.id
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    licenses = []
    for _ in range(license_data.count):
        expiry = None
        if not license_data.is_lifetime:
            if license_data.duration_days:
                expiry = datetime.utcnow() + timedelta(days=license_data.duration_days)
        
        license_obj = License(
            key=generate_license_key(),
            app_id=license_data.app_id,
            expires_at=expiry,
            is_active=True
        )
        db.add(license_obj)
        licenses.append(license_obj)
    
    db.commit()
    for lic in licenses:
        db.refresh(lic)
    
    # Convert to response format
    return [
        LicenseResponse(
            id=lic.id,
            license_key=lic.key,
            hwid=lic.hwid,
            expiry_timestamp=lic.expires_at,
            is_active=lic.is_active,
            app_id=lic.app_id,
            user_id=lic.user_id,
            created_at=lic.created_at
        ) for lic in licenses
    ]


@router.get("/", response_model=list[LicenseResponse])
async def get_licenses(
    app_id: int = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(License).join(App).filter(App.admin_id == current_admin.id)
    if app_id:
        query = query.filter(License.app_id == app_id)
    licenses = query.all()
    # Convert to response format
    return [
        LicenseResponse(
            id=lic.id,
            license_key=lic.key,
            hwid=lic.hwid,
            expiry_timestamp=lic.expires_at,
            is_active=lic.is_active,
            app_id=lic.app_id,
            user_id=lic.user_id,
            created_at=lic.created_at
        ) for lic in licenses
    ]


@router.post("/reset-hwid", response_model=LicenseResponse)
async def reset_hwid(
    request: LicenseResetHWID,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    license_obj = db.query(License).join(App).filter(
        License.id == request.license_id,
        App.admin_id == current_admin.id
    ).first()
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )
    license_obj.hwid = None
    db.commit()
    db.refresh(license_obj)
    return LicenseResponse(
        id=license_obj.id,
        license_key=license_obj.key,
        hwid=license_obj.hwid,
        expiry_timestamp=license_obj.expires_at,
        is_active=license_obj.is_active,
        app_id=license_obj.app_id,
        user_id=license_obj.user_id,
        created_at=license_obj.created_at
    )


@router.delete("/{license_id}")
async def delete_license(
    license_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    license_obj = db.query(License).join(App).filter(
        License.id == license_id,
        App.admin_id == current_admin.id
    ).first()
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )
    db.delete(license_obj)
    db.commit()
    return {"success": True, "message": "License deleted"}

