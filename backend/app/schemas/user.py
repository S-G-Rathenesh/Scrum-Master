from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    avatar: Optional[str] = None

class UserCreate(UserBase):
    authProvider: str
    password: Optional[str] = None # For optional local auth placeholder

class UserResponse(UserBase):
    id: str
    authProvider: str
    createdAt: datetime
    updatedAt: datetime
    lastLoginAt: Optional[datetime] = None

    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    token_type: str
