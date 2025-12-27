from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.variable import Variable
from models.app import App
from schemas.variable import VariableCreate, VariableResponse, VariableUpdate

router = APIRouter()


@router.post("/", response_model=VariableResponse)
async def create_variable(
    var_data: VariableCreate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    app = db.query(App).filter(
        App.id == var_data.app_id,
        App.admin_id == current_admin.id
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    existing = db.query(Variable).filter(
        Variable.key == var_data.key,
        Variable.app_id == var_data.app_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variable key already exists"
        )
    
    variable = Variable(
        key=var_data.key,
        value=var_data.value,
        app_id=var_data.app_id
    )
    db.add(variable)
    db.commit()
    db.refresh(variable)
    return variable


@router.get("/", response_model=list[VariableResponse])
async def get_variables(
    app_id: int,
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
    return db.query(Variable).filter(Variable.app_id == app_id).all()


@router.put("/{var_id}", response_model=VariableResponse)
async def update_variable(
    var_id: int,
    var_data: VariableUpdate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    variable = db.query(Variable).join(App).filter(
        Variable.id == var_id,
        App.admin_id == current_admin.id
    ).first()
    if not variable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variable not found"
        )
    variable.value = var_data.value
    db.commit()
    db.refresh(variable)
    return variable


@router.delete("/{var_id}")
async def delete_variable(
    var_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    variable = db.query(Variable).join(App).filter(
        Variable.id == var_id,
        App.admin_id == current_admin.id
    ).first()
    if not variable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variable not found"
        )
    db.delete(variable)
    db.commit()
    return {"success": True, "message": "Variable deleted"}

