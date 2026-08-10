from datetime import datetime, UTC
from bson import ObjectId
from app.database.mongodb import get_database
from app.schemas.feedback import FeedbackCreate, FeedbackStatus, FeedbackPriority
from app.services.feedback_sanitizer import FeedbackSanitizer
from app.services.email_service import email_service
from app.services.notification_service import NotificationService
from fastapi import BackgroundTasks

class FeedbackService:
    @staticmethod
    async def create_feedback(
        project_id: str, 
        integration_id: str, 
        feedback_in: FeedbackCreate, 
        background_tasks: BackgroundTasks,
        project_owner_email: str,
        project_name: str,
        email_notifications_enabled: bool,
        owner_id: str = None
    ) -> dict:
        db = get_database()
        
        # Sanitize
        safe_name = FeedbackSanitizer.sanitize_text(feedback_in.name, 100)
        safe_subject = FeedbackSanitizer.sanitize_text(feedback_in.subject, 200)
        safe_message = FeedbackSanitizer.sanitize_text(feedback_in.message, 5000)
        safe_url = FeedbackSanitizer.sanitize_text(feedback_in.pageUrl, 1000)
        
        now = datetime.now(UTC)
        
        doc = {
            "projectId": ObjectId(project_id),
            "ownerId": owner_id,
            "integrationId": ObjectId(integration_id) if integration_id else None,
            "name": safe_name,
            "email": feedback_in.email,
            "subject": safe_subject,
            "message": safe_message,
            "category": feedback_in.category.value,
            "source": feedback_in.source.value,
            "pageUrl": safe_url,
            "status": FeedbackStatus.NEW.value,
            "priority": FeedbackPriority.NORMAL.value,
            "isRead": False,
            "createdAt": now,
            "updatedAt": now
        }
        
        result = await db.feedback.insert_one(doc)
        doc["_id"] = result.inserted_id

        # Create in-app notification for project owner
        if owner_id:
            msg_snippet = safe_message[:100] + ("..." if len(safe_message) > 100 else "")
            cat_val = feedback_in.category.value if hasattr(feedback_in.category, 'value') else str(feedback_in.category)
            await NotificationService.create_notification(
                owner_id=owner_id,
                project_id=str(project_id),
                type="NEW_FEEDBACK",
                title=f"New Feedback ({cat_val})",
                message=msg_snippet,
                related_entity="feedback",
                related_id=str(result.inserted_id)
            )
        
        # Schedule email notification
        if email_notifications_enabled:
            feedback_data = {
                "name": safe_name,
                "email": feedback_in.email,
                "category": feedback_in.category.value,
                "priority": FeedbackPriority.NORMAL.value,
                "message": safe_message
            }
            background_tasks.add_task(
                email_service.send_new_feedback_email,
                owner_email=project_owner_email,
                project_name=project_name,
                feedback=feedback_data
            )
            
        return FeedbackService._format_response(doc)

    @staticmethod
    async def get_feedback_list(
        project_id: str,
        page: int = 1,
        limit: int = 25,
        status: str = None,
        priority: str = None,
        category: str = None,
        is_read: bool = None
    ) -> tuple[list[dict], int]:
        db = get_database()
        
        query = {"projectId": ObjectId(project_id)}
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if category:
            query["category"] = category
        if is_read is not None:
            query["isRead"] = is_read
            
        skip = (page - 1) * limit
        
        cursor = db.feedback.find(query).sort("createdAt", -1).skip(skip).limit(limit)
        items = await cursor.to_list(length=limit)
        total = await db.feedback.count_documents(query)
        
        return [FeedbackService._format_response(item) for item in items], total

    @staticmethod
    async def get_feedback_detail(project_id: str, feedback_id: str) -> dict | None:
        db = get_database()
        item = await db.feedback.find_one({
            "_id": ObjectId(feedback_id),
            "projectId": ObjectId(project_id)
        })
        if item:
            return FeedbackService._format_response(item)
        return None

    @staticmethod
    async def update_feedback(project_id: str, feedback_id: str, updates: dict) -> bool:
        db = get_database()
        
        update_data = {}
        if "status" in updates and updates["status"] is not None:
            update_data["status"] = updates["status"]
        if "priority" in updates and updates["priority"] is not None:
            update_data["priority"] = updates["priority"]
        if "isRead" in updates and updates["isRead"] is not None:
            update_data["isRead"] = updates["isRead"]
        if "reply" in updates and updates["reply"] is not None:
            update_data["reply"] = updates["reply"]
            update_data["repliedAt"] = datetime.now(UTC)
            update_data["status"] = FeedbackStatus.RESOLVED.value
            
        if not update_data:
            return True
            
        update_data["updatedAt"] = datetime.now(UTC)
        
        result = await db.feedback.update_one(
            {"_id": ObjectId(feedback_id), "projectId": ObjectId(project_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    @staticmethod
    def _format_response(doc: dict) -> dict:
        doc["id"] = str(doc.pop("_id"))
        doc["projectId"] = str(doc["projectId"])
        if doc.get("integrationId"):
            doc["integrationId"] = str(doc["integrationId"])
        return doc
