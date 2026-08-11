from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Scrum Master API"
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "scrum_master"
    
    # Auth
    JWT_SECRET: str = "super_secret_jwt_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    # Google OAuth (For later phases)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Scrum Master Integration
    SCRUM_MASTER_URL: Optional[str] = None
    SCRUM_MASTER_TOKEN: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
