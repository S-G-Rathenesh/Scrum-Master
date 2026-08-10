import pytest
import asyncio
from bson import ObjectId
from app.services.notification_service import NotificationService

@pytest.mark.asyncio
async def test_notification_creation_and_isolation():
    user_a_id = str(ObjectId())
    user_b_id = str(ObjectId())
    project_a_id = str(ObjectId())

    # 1. Create notification for User A's Project A
    notif = await NotificationService.create_notification(
        owner_id=user_a_id,
        project_id=project_a_id,
        type="NEW_FEEDBACK",
        title="New Feedback (BUG)",
        message="Button is broken",
        related_entity="feedback",
        related_id="fb_123"
    )

    assert notif is not None
    assert notif["ownerId"] == user_a_id
    assert notif["projectId"] == project_a_id
    assert notif["isRead"] is False

    # 2. User A fetches notifications -> sees 1
    user_a_notifs = await NotificationService.get_notifications(user_a_id, project_a_id)
    assert len(user_a_notifs) == 1
    assert user_a_notifs[0]["id"] == notif["id"]

    # 3. User B fetches notifications for Project A -> sees 0 (ISOLATION)
    user_b_notifs = await NotificationService.get_notifications(user_b_id, project_a_id)
    assert len(user_b_notifs) == 0

    # 4. Check unread count
    count_a = await NotificationService.get_unread_count(user_a_id, project_a_id)
    count_b = await NotificationService.get_unread_count(user_b_id, project_a_id)
    assert count_a == 1
    assert count_b == 0

    # 5. User B attempts to mark User A's notification as read -> fails (False)
    success_b = await NotificationService.mark_as_read(user_b_id, project_a_id, notif["id"])
    assert success_b is False

    # 6. User A marks notification as read -> succeeds (True)
    success_a = await NotificationService.mark_as_read(user_a_id, project_a_id, notif["id"])
    assert success_a is True

    # 7. Unread count for User A becomes 0
    count_a_after = await NotificationService.get_unread_count(user_a_id, project_a_id)
    assert count_a_after == 0

    # 8. User B attempts to delete User A's notification -> fails (False)
    del_b = await NotificationService.delete_notification(user_b_id, project_a_id, notif["id"])
    assert del_b is False

    # 9. User A deletes notification -> succeeds (True)
    del_a = await NotificationService.delete_notification(user_a_id, project_a_id, notif["id"])
    assert del_a is True

@pytest.mark.asyncio
async def test_notification_deduplication():
    user_id = str(ObjectId())
    project_id = str(ObjectId())

    # Create first notification for same feedback
    n1 = await NotificationService.create_notification(
        owner_id=user_id,
        project_id=project_id,
        type="NEW_FEEDBACK",
        title="Feedback Alert",
        message="Feedback message",
        related_entity="feedback",
        related_id="fb_dup_1"
    )

    # Attempt to create duplicate notification for same feedback
    n2 = await NotificationService.create_notification(
        owner_id=user_id,
        project_id=project_id,
        type="NEW_FEEDBACK",
        title="Feedback Alert",
        message="Feedback message",
        related_entity="feedback",
        related_id="fb_dup_1"
    )

    assert n1["id"] == n2["id"]
    notifs = await NotificationService.get_notifications(user_id, project_id)
    assert len(notifs) == 1
