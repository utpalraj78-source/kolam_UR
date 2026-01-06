"""
Kolam history router: save and retrieve user's Kolam generation history
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, KolamHistory
from routers.auth_router import get_current_user

router = APIRouter(prefix="/api/kolams", tags=["kolam-history"])


# Pydantic models
class KolamSave(BaseModel):
    kolam_params: dict
    kolam_image_path: Optional[str] = None
    kolam_config_path: Optional[str] = None


class KolamHistoryResponse(BaseModel):
    id: int
    kolam_params: dict
    kolam_image_path: Optional[str]
    kolam_config_path: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/save", response_model=KolamHistoryResponse, status_code=status.HTTP_201_CREATED)
async def save_kolam(
    kolam_data: KolamSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a generated Kolam to user's history"""
    # Auto-derive config path if not provided but image path is present
    config_path = kolam_data.kolam_config_path
    if not config_path and kolam_data.kolam_image_path and kolam_data.kolam_image_path.endswith(".png"):
        config_path = kolam_data.kolam_image_path.replace(".png", ".json")

    try:
        new_kolam = KolamHistory(
            user_id=current_user.id,
            kolam_params=kolam_data.kolam_params,
            kolam_image_path=kolam_data.kolam_image_path,
            kolam_config_path=config_path
        )
        
        db.add(new_kolam)
        db.commit()
        db.refresh(new_kolam)
        
        return KolamHistoryResponse.model_validate(new_kolam)
    except Exception as e:
        import traceback
        with open("error.log", "a") as f:
            f.write(f"Error saving kolam: {str(e)}\n")
            traceback.print_exc(file=f)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving kolam: {str(e)}"
        )


@router.get("/my-history", response_model=List[KolamHistoryResponse])
async def get_my_history(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's Kolam generation history"""
    try:
        kolams = db.query(KolamHistory)\
            .filter(KolamHistory.user_id == current_user.id)\
            .order_by(KolamHistory.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        print(f"Fetching history for user {current_user.id}, found {len(kolams)} kolams")
        # Use model_validate for Pydantic v2
        return [KolamHistoryResponse.model_validate(k) for k in kolams]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching history: {str(e)}"
        )


@router.delete("/{kolam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kolam(
    kolam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Kolam from history"""
    kolam = db.query(KolamHistory)\
        .filter(KolamHistory.id == kolam_id, KolamHistory.user_id == current_user.id)\
        .first()
    
    if not kolam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kolam not found"
        )
    
    db.delete(kolam)
    db.commit()
    
    return None
