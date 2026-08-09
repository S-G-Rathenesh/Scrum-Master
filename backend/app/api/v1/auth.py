from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, timezone
from app.core.config import settings
from app.database.mongodb import get_database
from app.core.security import create_access_token
from app.schemas.user import UserResponse, Token
from app.api.dependencies import get_current_user

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    credential: str

@router.post("/login/google", response_model=Token)
async def google_login(request: GoogleLoginRequest, db=Depends(get_database)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Authentication is not configured on the server."
        )

    try:
        idinfo = id_token.verify_oauth2_token(
            request.credential, requests.Request(), settings.GOOGLE_CLIENT_ID
        )
        
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="No email provided by Google")
            
        # Check if user exists
        user = await db.users.find_one({"email": email})
        
        if not user:
            # Create user
            new_user = {
                "email": email,
                "name": name,
                "avatar": picture,
                "authProvider": "google",
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
                "lastLoginAt": datetime.now(timezone.utc)
            }
            result = await db.users.insert_one(new_user)
            user_id = str(result.inserted_id)
        else:
            # Update last login
            user_id = str(user["_id"])
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"lastLoginAt": datetime.now(timezone.utc)}}
            )
            
        # Create JWT token
        access_token = create_access_token(subject=user_id)
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credentials"
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
