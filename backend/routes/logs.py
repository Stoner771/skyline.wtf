from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.log import Log
from models.app import App
from schemas.log import LogResponse, LogFilter

router = APIRouter()


@router.get("/", response_model=list[LogResponse])
async def get_logs(
    filter_data: LogFilter = Depends(),
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Log).join(App).filter(App.admin_id == current_admin.id)
    if filter_data.app_id:
        query = query.filter(Log.app_id == filter_data.app_id)
    if filter_data.user_id:
        query = query.filter(Log.user_id == filter_data.user_id)
    if filter_data.action:
        query = query.filter(Log.action == filter_data.action)
    return query.order_by(Log.created_at.desc()).offset(filter_data.offset).limit(filter_data.limit).all()

