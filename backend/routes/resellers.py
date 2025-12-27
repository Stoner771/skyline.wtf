from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from controllers.reseller_controller import (
    create_reseller, get_resellers, get_reseller_by_id, update_reseller,
    assign_credits, get_credit_transactions, approve_topup_request,
    delete_reseller, assign_app_to_reseller, remove_app_from_reseller,
    get_reseller_applications
)
from schemas.reseller import (
    ResellerCreate, ResellerUpdate, ResellerResponse, 
    CreditAssignRequest, CreditTransactionResponse, ResellerAppAssignment
)
from models.admin import Admin

router = APIRouter()


@router.post("/", response_model=ResellerResponse)
async def create_reseller_endpoint(
    reseller_data: ResellerCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        return create_reseller(db, reseller_data, current_admin.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=list[ResellerResponse])
async def list_resellers(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_resellers(db, current_admin.id)


@router.get("/{reseller_id}", response_model=ResellerResponse)
async def get_reseller(
    reseller_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    reseller = get_reseller_by_id(db, reseller_id)
    if not reseller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reseller not found")
    return reseller


@router.put("/{reseller_id}", response_model=ResellerResponse)
async def update_reseller_endpoint(
    reseller_id: int,
    reseller_data: ResellerUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    reseller = update_reseller(db, reseller_id, reseller_data)
    if not reseller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reseller not found")
    return reseller


@router.post("/{reseller_id}/credits", response_model=CreditTransactionResponse)
async def assign_credits_endpoint(
    reseller_id: int,
    credit_data: CreditAssignRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    credit_data.reseller_id = reseller_id
    try:
        return assign_credits(db, credit_data, current_admin.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{reseller_id}/transactions", response_model=list[CreditTransactionResponse])
async def get_reseller_transactions(
    reseller_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_credit_transactions(db, reseller_id)


@router.post("/tickets/{ticket_id}/approve-topup", response_model=CreditTransactionResponse)
async def approve_topup(
    ticket_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        return approve_topup_request(db, ticket_id, current_admin.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{reseller_id}")
async def delete_reseller_endpoint(
    reseller_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    success = delete_reseller(db, reseller_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reseller not found")
    return {"message": "Reseller deleted successfully"}


@router.post("/{reseller_id}/apps/{app_id}")
async def assign_application(
    reseller_id: int,
    app_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        return assign_app_to_reseller(db, reseller_id, app_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{reseller_id}/apps/{app_id}")
async def remove_application(
    reseller_id: int,
    app_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    success = remove_app_from_reseller(db, reseller_id, app_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return {"message": "Application removed successfully"}


@router.get("/{reseller_id}/apps")
async def get_reseller_apps(
    reseller_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_reseller_applications(db, reseller_id)

