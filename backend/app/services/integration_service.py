import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
from bson import ObjectId
from app.database.mongodb import get_database
from app.schemas.project import IntegrationStatus

def hash_token(raw_token: str) -> str:
    """Creates a SHA-256 hash of the integration token."""
    return hashlib.sha256(raw_token.encode()).hexdigest()

def generate_token() -> Tuple[str, str]:
    """Generates a raw token and its corresponding hash.
    Returns: (raw_token, token_hash)
    """
    secret_part = secrets.token_urlsafe(32)
    raw_token = f"sm_proj_{secret_part}"
    return raw_token, hash_token(raw_token)

async def create_or_regenerate_integration(project_id: str) -> str:
    """Generates or regenerates an integration token for a project.
    Returns the raw token (only time it should be exposed).
    """
    db = get_database()
    raw_token, token_hash = generate_token()
    
    now = datetime.now(timezone.utc)
    obj_id = ObjectId(project_id)
    
    integration_doc = {
        "projectId": obj_id,
        "tokenHash": token_hash,
        "status": IntegrationStatus.WAITING.value,
        "createdAt": now,
        "updatedAt": now,
        "lastHeartbeatAt": None,
        "connectedAt": None,
        "revokedAt": None,
        "agentVersion": None
    }
    
    # Update or insert
    await db.integrations.update_one(
        {"projectId": obj_id},
        {"$set": integration_doc},
        upsert=True
    )
    
    # Also update project status to WAITING
    await db.projects.update_one(
        {"_id": obj_id}, 
        {"$set": {"integrationStatus": IntegrationStatus.WAITING.value, "updatedAt": now}}
    )
    
    return raw_token

async def revoke_integration(project_id: str) -> bool:
    """Revokes a project's integration credentials."""
    db = get_database()
    now = datetime.now(timezone.utc)
    obj_id = ObjectId(project_id)
    
    result = await db.integrations.update_one(
        {"projectId": obj_id},
        {"$set": {
            "status": IntegrationStatus.REVOKED.value, 
            "revokedAt": now,
            "updatedAt": now
        }}
    )
    
    if result.modified_count > 0:
        await db.projects.update_one(
            {"_id": obj_id},
            {"$set": {"integrationStatus": IntegrationStatus.REVOKED.value, "updatedAt": now}}
        )
        return True
    return False

async def get_integration_status(project_id: str) -> Optional[Dict[str, Any]]:
    """Gets current integration metadata (without raw token)."""
    db = get_database()
    obj_id = ObjectId(project_id)
    doc = await db.integrations.find_one({"projectId": obj_id})
    if doc:
        # Convert ObjectId and remove hash
        doc["_id"] = str(doc["_id"])
        doc["projectId"] = str(doc["projectId"])
        if "tokenHash" in doc:
            del doc["tokenHash"]
    return doc

async def process_heartbeat(raw_token: str, agent_version: str) -> Optional[str]:
    """
    Processes a heartbeat for a given token. 
    Returns the associated string projectId if successful, None if invalid/revoked.
    """
    db = get_database()
    t_hash = hash_token(raw_token)
    
    integration = await db.integrations.find_one({"tokenHash": t_hash})
    if not integration:
        return None
        
    if integration.get("status") == IntegrationStatus.REVOKED.value:
        return None
        
    now = datetime.now(timezone.utc)
    project_id = integration["projectId"]
    
    update_doc = {
        "lastHeartbeatAt": now,
        "updatedAt": now,
        "agentVersion": agent_version,
        "status": IntegrationStatus.CONNECTED.value
    }
    
    if not integration.get("connectedAt") or integration.get("status") != IntegrationStatus.CONNECTED.value:
        update_doc["connectedAt"] = now
        
    await db.integrations.update_one(
        {"_id": integration["_id"]},
        {"$set": update_doc}
    )
    
    # Keep the project document in sync
    await db.projects.update_one(
        {"_id": project_id},
        {"$set": {
            "integrationStatus": IntegrationStatus.CONNECTED.value, 
            "lastConnectedAt": update_doc.get("connectedAt", integration.get("connectedAt")),
            "updatedAt": now
        }}
    )
    
    return str(project_id)
