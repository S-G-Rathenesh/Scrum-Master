import asyncio
from bson import ObjectId
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.services.notification_service import NotificationService

async def run_tests():
    print("[TEST] Connecting to MongoDB...")
    await connect_to_mongo()
    
    try:
        user_a_id = str(ObjectId())
        user_b_id = str(ObjectId())
        project_a_id = str(ObjectId())

        print("[TEST] 1. Creating notification for User A's Project A...")
        notif = await NotificationService.create_notification(
            owner_id=user_a_id,
            project_id=project_a_id,
            type="NEW_FEEDBACK",
            title="New Feedback (BUG)",
            message="Button is broken",
            related_entity="feedback",
            related_id="fb_123"
        )
        assert notif is not None, "Notification should not be None"
        assert notif["ownerId"] == user_a_id, "Owner ID mismatch"
        assert notif["projectId"] == project_a_id, "Project ID mismatch"
        assert notif["isRead"] is False, "Default isRead should be False"
        print("  [OK] Created notification:", notif["id"])

        print("[TEST] 2. User A fetches notifications...")
        user_a_notifs = await NotificationService.get_notifications(user_a_id, project_a_id)
        assert len(user_a_notifs) == 1, f"Expected 1 notification, got {len(user_a_notifs)}"
        print("  [OK] User A found 1 notification")

        print("[TEST] 3. User B fetches notifications for User A's Project A (ISOLATION TEST)...")
        user_b_notifs = await NotificationService.get_notifications(user_b_id, project_a_id)
        assert len(user_b_notifs) == 0, f"Expected 0 notifications for User B, got {len(user_b_notifs)}"
        print("  [OK] User B received 0 notifications (Isolation enforced!)")

        print("[TEST] 4. Unread count check...")
        count_a = await NotificationService.get_unread_count(user_a_id, project_a_id)
        count_b = await NotificationService.get_unread_count(user_b_id, project_a_id)
        assert count_a == 1, f"Expected User A unread count 1, got {count_a}"
        assert count_b == 0, f"Expected User B unread count 0, got {count_b}"
        print("  [OK] Unread counts correct (User A: 1, User B: 0)")

        print("[TEST] 5. User B attempts to mark User A's notification as read (UNAUTHORIZED)...")
        success_b = await NotificationService.mark_as_read(user_b_id, project_a_id, notif["id"])
        assert success_b is False, "User B should NOT be able to mark User A's notification as read"
        print("  [OK] Unauthorized update blocked!")

        print("[TEST] 6. User A marks notification as read...")
        success_a = await NotificationService.mark_as_read(user_a_id, project_a_id, notif["id"])
        assert success_a is True, "User A should be able to mark notification as read"
        print("  [OK] Notification marked as read")

        print("[TEST] 7. Unread count after marking read...")
        count_a_after = await NotificationService.get_unread_count(user_a_id, project_a_id)
        assert count_a_after == 0, f"Expected User A unread count 0, got {count_a_after}"
        print("  [OK] Unread count updated to 0")

        print("[TEST] 8. User B attempts to delete User A's notification (UNAUTHORIZED)...")
        del_b = await NotificationService.delete_notification(user_b_id, project_a_id, notif["id"])
        assert del_b is False, "User B should NOT be able to delete User A's notification"
        print("  [OK] Unauthorized delete blocked!")

        print("[TEST] 9. User A deletes notification...")
        del_a = await NotificationService.delete_notification(user_a_id, project_a_id, notif["id"])
        assert del_a is True, "User A should be able to delete notification"
        print("  [OK] Notification deleted successfully")

        print("\n=======================================================")
        print("ALL BACKEND NOTIFICATION INTEGRATION & ISOLATION TESTS PASSED 100% SUCCESS!")
        print("=======================================================")

    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_tests())
