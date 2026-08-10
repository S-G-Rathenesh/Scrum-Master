from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from app.database.mongodb import get_database

class NotificationService:
    @staticmethod
    async def create_notification(
        owner_id: str,
        project_id: str,
        type: str,
        title: str,
        message: str,
        related_entity: Optional[str] = None,
        related_id: Optional[str] = None
    ) -> Optional[dict]:
        """
        Creates and persists a notification for a project owner.
        Deduplicates if an identical notification for the same related entity exists.
        """
        db = get_database()
        
        # Deduplication check for same related entity
        if related_entity and related_id:
            existing = await db.notifications.find_one({
                "ownerId": owner_id,
                "projectId": project_id,
                "type": type,
                "relatedEntity": related_entity,
                "relatedId": related_id
            })
            if existing:
                return NotificationService._format_notification(existing)

        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "ownerId": owner_id,
            "projectId": project_id,
            "type": type,
            "title": title,
            "message": message,
            "relatedEntity": related_entity,
            "relatedId": related_id,
            "isRead": False,
            "createdAt": now
        }

        result = await db.notifications.insert_one(doc)
        doc["_id"] = result.inserted_id
        return NotificationService._format_notification(doc)

    @staticmethod
    async def get_notifications(
        owner_id: str,
        project_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[dict]:
        """
        Fetch notifications strictly scoped to ownerId and projectId.
        """
        db = get_database()
        query = {"ownerId": owner_id, "projectId": project_id}
        if unread_only:
            query["isRead"] = False

        cursor = db.notifications.find(query).sort("createdAt", -1).limit(limit)
        notifications = await cursor.to_list(length=limit)
        return [NotificationService._format_notification(n) for n in notifications]

    @staticmethod
    async def get_unread_count(owner_id: str, project_id: str) -> int:
        """
        Count unread notifications for a specific owner and project.
        """
        db = get_database()
        return await db.notifications.count_documents({
            "ownerId": owner_id,
            "projectId": project_id,
            "isRead": False
        })

    @staticmethod
    async def mark_as_read(owner_id: str, project_id: str, notification_id: str) -> bool:
        """
        Mark a single notification as read, enforcing ownerId and projectId isolation.
        """
        db = get_database()
        try:
            obj_id = ObjectId(notification_id)
        except Exception:
            return False

        result = await db.notifications.update_one(
            {"_id": obj_id, "ownerId": owner_id, "projectId": project_id},
            {"$set": {"isRead": True}}
        )
        return result.modified_count > 0 or result.matched_count > 0

    @staticmethod
    async def mark_all_as_read(owner_id: str, project_id: str) -> int:
        """
        Mark all notifications as read for a given owner and project.
        """
        db = get_database()
        result = await db.notifications.update_many(
            {"ownerId": owner_id, "projectId": project_id, "isRead": False},
            {"$set": {"isRead": True}}
        )
        return result.modified_count

    @staticmethod
    async def delete_notification(owner_id: str, project_id: str, notification_id: str) -> bool:
        """
        Delete a notification enforcing ownerId and projectId.
        """
        db = get_database()
        try:
            obj_id = ObjectId(notification_id)
        except Exception:
            return False

        result = await db.notifications.delete_one(
            {"_id": obj_id, "ownerId": owner_id, "projectId": project_id}
        )
        return result.deleted_count > 0

    @staticmethod
    def _format_notification(doc: dict) -> dict:
        return {
            "id": str(doc["_id"]),
            "ownerId": doc.get("ownerId"),
            "projectId": doc.get("projectId"),
            "type": doc.get("type", "NEW_FEEDBACK"),
            "title": doc.get("title", ""),
            "message": doc.get("message", ""),
            "relatedEntity": doc.get("relatedEntity"),
            "relatedId": doc.get("relatedId"),
            "isRead": doc.get("isRead", False),
            "createdAt": doc.get("createdAt", "")
        }
