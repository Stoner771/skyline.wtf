from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.file import File
from models.app import App
from schemas.file import FileResponse
import os
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"


@router.post("/", response_model=FileResponse)
async def upload_file(
    app_id: int = Form(...),
    file: UploadFile = FastAPIFile(...),
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    app = db.query(App).filter(
        App.id == app_id,
        App.admin_id == current_admin.id
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    file_obj = File(
        filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        app_id=app_id
    )
    db.add(file_obj)
    db.commit()
    db.refresh(file_obj)
    return file_obj


@router.get("/", response_model=list[FileResponse])
async def get_files(
    app_id: int = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(File).join(App).filter(App.admin_id == current_admin.id)
    if app_id:
        query = query.filter(File.app_id == app_id)
    return query.all()


@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    file_obj = db.query(File).join(App).filter(
        File.id == file_id,
        App.admin_id == current_admin.id
    ).first()
    if not file_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    if not os.path.exists(file_obj.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    return FastAPIFileResponse(
        file_obj.file_path,
        filename=file_obj.filename,
        media_type=file_obj.mime_type
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    file_obj = db.query(File).join(App).filter(
        File.id == file_id,
        App.admin_id == current_admin.id
    ).first()
    if not file_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    if os.path.exists(file_obj.file_path):
        os.remove(file_obj.file_path)
    db.delete(file_obj)
    db.commit()
    return {"success": True, "message": "File deleted"}

