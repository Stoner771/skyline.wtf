from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from controllers.app_controller import (
    create_app, get_apps_by_admin, update_app, delete_app
)
from schemas.app import AppCreate, AppUpdate, AppResponse

router = APIRouter()


@router.post("/", response_model=AppResponse)
async def create_application(
    app_data: AppCreate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return create_app(db, app_data, current_admin.id)


@router.get("/", response_model=list[AppResponse])
async def get_applications(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_apps_by_admin(db, current_admin.id)


@router.put("/{app_id}", response_model=AppResponse)
async def update_application(
    app_id: int,
    app_data: AppUpdate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    app = update_app(db, app_id, app_data, current_admin.id)
    if not app:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return app


@router.delete("/{app_id}")
async def delete_application(
    app_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    success = delete_app(db, app_id, current_admin.id)
    if not success:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return {"success": True, "message": "Application deleted"}

