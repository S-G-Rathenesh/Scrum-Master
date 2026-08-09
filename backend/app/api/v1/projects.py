from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
from bson import ObjectId
from app.database.mongodb import get_database
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectStatus, IntegrationStatus
from app.schemas.user import UserResponse
from app.api.dependencies import get_current_user

router = APIRouter()

def validate_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate, 
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    project_doc = project.model_dump()
    project_doc["ownerId"] = current_user.id
    project_doc["status"] = ProjectStatus.ACTIVE.value
    project_doc["integrationStatus"] = IntegrationStatus.NOT_CONNECTED.value
    project_doc["createdAt"] = datetime.now(timezone.utc)
    project_doc["updatedAt"] = datetime.now(timezone.utc)
    project_doc["lastConnectedAt"] = None
    
    result = await db.projects.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    project_doc["id"] = str(result.inserted_id)
    
    return ProjectResponse(**project_doc)

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    projects_cursor = db.projects.find({"ownerId": current_user.id}).sort("createdAt", -1)
    projects = []
    async for doc in projects_cursor:
        doc["id"] = str(doc["_id"])
        projects.append(ProjectResponse(**doc))
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    obj_id = validate_object_id(project_id)
    project = await db.projects.find_one({"_id": obj_id, "ownerId": current_user.id})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project["id"] = str(project["_id"])
    return ProjectResponse(**project)

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    obj_id = validate_object_id(project_id)
    
    # Verify ownership
    existing_project = await db.projects.find_one({"_id": obj_id, "ownerId": current_user.id})
    if not existing_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    update_dict["updatedAt"] = datetime.now(timezone.utc)
    
    # If using Enum directly in Pydantic, convert value back for MongoDB
    for k, v in update_dict.items():
        if isinstance(v, (ProjectStatus, IntegrationStatus)):
            update_dict[k] = v.value
            
    updated_project = await db.projects.find_one_and_update(
        {"_id": obj_id},
        {"$set": update_dict},
        return_document=True
    )
    
    updated_project["id"] = str(updated_project["_id"])
    return ProjectResponse(**updated_project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    obj_id = validate_object_id(project_id)
    
    result = await db.projects.delete_one({"_id": obj_id, "ownerId": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
