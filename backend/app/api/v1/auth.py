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

import logging

logger = logging.getLogger(__name__)

@router.post("/login/google", response_model=Token)
async def google_login(request: GoogleLoginRequest, db=Depends(get_database)):
    if not settings.GOOGLE_CLIENT_ID:
        logger.error("Google Authentication is not configured on the server.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Authentication is not configured on the server."
        )

    try:
        idinfo = id_token.verify_oauth2_token(
            request.credential, requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credentials"
        )
    except Exception as e:
        logger.error(f"Unexpected error during Google token verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token verification failed"
        )

    email = idinfo.get("email")
    name = idinfo.get("name")
    picture = idinfo.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="No email provided by Google")
        
    try:
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
    except Exception as e:
        logger.error(f"Database/Auth error during user creation/lookup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process user authentication"
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
