import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional, Tuple
from app.database.mongodb import get_database

def hash_enrollment_token(raw_token: str) -> str:
    """Creates a SHA-256 hash of the enrollment token."""
    return hashlib.sha256(raw_token.encode()).hexdigest()

def generate_enrollment_token() -> Tuple[str, str]:
    """Generates a raw enrollment token and its corresponding hash.
    Returns: (raw_token, token_hash)
    """
    secret_part = secrets.token_urlsafe(32)
    raw_token = f"sm_enroll_{secret_part}"
    return raw_token, hash_enrollment_token(raw_token)

async def create_enrollment_credential(user_id: str) -> str:
    """
    Generates a one-time enrollment token bound to the authenticated user.
    Returns the raw token to be packaged into the zip.
    """
    db = get_database()
    raw_token, token_hash = generate_enrollment_token()
    
    now = datetime.now(timezone.utc)
    
    enrollment_doc = {
        "ownerId": user_id,
        "tokenHash": token_hash,
        "used": False,
        "createdAt": now,
        "expiresAt": None  # Optional: could add an expiration here
    }
    
    await db.enrollments.insert_one(enrollment_doc)
    return raw_token

async def consume_enrollment_credential(raw_token: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Validates and consumes an enrollment token.
    If valid and unused, returns (ownerId, enrollmentId) associated with the token.
    If invalid or already used, returns (None, None).
    """
    db = get_database()
    token_hash = hash_enrollment_token(raw_token)
    
    # Find and mark used in one atomic operation
    result = await db.enrollments.find_one_and_update(
        {"tokenHash": token_hash, "used": False},
        {"$set": {"used": True, "usedAt": datetime.now(timezone.utc)}},
        return_document=True
    )
    
    if result:
        return result.get("ownerId"), str(result.get("_id"))
        
    return None, None
