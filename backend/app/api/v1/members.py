from fastapi import APIRouter, Depends
from typing import List
from app.schemas.user import UserResponse
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("")
async def list_members(current_user: UserResponse = Depends(get_current_user)):
    # Placeholder for Phase 7
    return [{"id": current_user.id, "email": current_user.email, "role": "OWNER"}]
