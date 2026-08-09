import html
import re

class FeedbackSanitizer:
    """Sanitizes incoming feedback payloads."""
    
    @staticmethod
    def sanitize_text(text: str | None, max_length: int = 5000) -> str | None:
        if not text:
            return text
            
        # Truncate
        text = text[:max_length]
        
        # Strip HTML tags
        text = re.sub(r'<[^>]*>', '', text)
        
        # Unescape HTML entities (just in case they submitted encoded HTML)
        text = html.unescape(text)
        
        # Escape for safe storage/rendering
        text = html.escape(text)
        
        return text.strip()
