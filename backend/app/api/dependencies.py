from fastapi import Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from app.core.config import settings
from app.database.mongodb import get_database
from app.schemas.user import UserResponse
from bson import ObjectId

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login"
)

async def get_current_user(
    db = Depends(get_database),
    token: str = Depends(reusable_oauth2)
) -> UserResponse:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["id"] = str(user["_id"])
    return UserResponse(**user)

async def require_project_ownership(
    project_id: str = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID format")
        
    project = await db.projects.find_one({"_id": obj_id, "ownerId": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
