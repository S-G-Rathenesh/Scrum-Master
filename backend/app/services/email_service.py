import os
import httpx
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.provider = os.getenv("EMAIL_PROVIDER", "mock").lower()
        self.api_key = os.getenv("EMAIL_API_KEY", "")
        self.from_address = os.getenv("EMAIL_FROM", "noreply@scrummaster.rathenesh.dev")
        self.enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"

    async def _send_via_resend(self, to_email: str, subject: str, html_body: str) -> bool:
        if not self.api_key:
            logger.error("Resend API key missing.")
            return False
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "from": self.from_address,
                        "to": to_email,
                        "subject": subject,
                        "html": html_body
                    },
                    timeout=10.0
                )
                if response.status_code >= 400:
                    logger.error(f"Resend API error: {response.status_code} - {response.text}")
                    return False
                return True
            except Exception as e:
                logger.error(f"Failed to send email via Resend: {e}")
                return False

    async def _send_mock(self, to_email: str, subject: str, html_body: str) -> bool:
        logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject} | Body length: {len(html_body)}")
        return True

    async def send_email_with_retry(self, to_email: str, subject: str, html_body: str, max_retries: int = 3) -> bool:
        if not self.enabled:
            logger.info("Email notifications are disabled.")
            return True

        for attempt in range(1, max_retries + 1):
            if self.provider == "resend":
                success = await self._send_via_resend(to_email, subject, html_body)
            else:
                success = await self._send_mock(to_email, subject, html_body)
                
            if success:
                logger.info(f"Email sent successfully to {to_email}")
                return True
                
            logger.warning(f"Email send failed (attempt {attempt}/{max_retries})")
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt) # Exponential backoff: 2s, 4s, ...
                
        logger.error(f"Failed to send email to {to_email} after {max_retries} attempts.")
        return False

    async def send_new_feedback_email(self, owner_email: str, project_name: str, feedback: dict):
        subject = f"New feedback received — {project_name}"
        
        html_body = f"""
        <h2>You received new feedback.</h2>
        <p><strong>Project:</strong> {project_name}</p>
        <p><strong>Category:</strong> {feedback.get('category')}</p>
        <p><strong>Priority:</strong> {feedback.get('priority', 'NORMAL')}</p>
        <p><strong>From:</strong> {feedback.get('name', 'Anonymous')} ({feedback.get('email', 'No email')})</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>{feedback.get('message', '')}</p>
        <hr>
        <p><a href="https://scrummaster.rathenesh.dev/projects">Open Scrum Master</a> to view details.</p>
        """
        
        await self.send_email_with_retry(owner_email, subject, html_body)

email_service = EmailService()
