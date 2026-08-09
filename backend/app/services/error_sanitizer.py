import re
import hashlib

SECRET_PATTERNS = [
    # Bearer tokens
    (r'(?i)bearer\s+[a-zA-Z0-9_\-\.]+', 'Bearer ***'),
    # MongoDB URIs
    (r'mongodb\+srv:\/\/[^:]+:[^@]+@', 'mongodb+srv://***:***@'),
    # Database URLs
    (r'(postgres|mysql|redis):\/\/[^:]+:[^@]+@', r'\1://***:***@'),
    # API keys / tokens
    (r'(?i)(api_key|apikey|secret|token|password|pwd)=(?P<val>[^\s&]+)', r'\1=***'),
    # Authorization header dump
    (r'(?i)authorization:\s*[^\n]+', 'Authorization: ***'),
    # Set-Cookie headers
    (r'(?i)set-cookie:\s*[^\n]+', 'Set-Cookie: ***')
]

def sanitize_string(text: str) -> str:
    """Removes common secret patterns from a string."""
    if not text:
        return text
    
    sanitized = text
    for pattern, replacement in SECRET_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized)
    
    return sanitized

def generate_fingerprint(error_type: str, message: str, source: str, endpoint: str = None) -> str:
    """
    Generates a deterministic fingerprint for an error based on:
    - error type
    - source
    - endpoint (if available)
    - sanitized message (with numbers/hex/uuids potentially stripped if we want to be aggressive, 
      but for now we just use the sanitized string to avoid merging too aggressively).
    """
    # Simple message normalization (strip numbers/IDs to group similar errors)
    # E.g. "User 1234 not found" -> "User *** not found"
    normalized_msg = re.sub(r'\b\d+\b', '***', message)
    # Strip obvious UUIDs
    normalized_msg = re.sub(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', '***', normalized_msg, flags=re.IGNORECASE)
    
    components = [
        str(error_type).strip().lower(),
        str(source).strip().lower(),
        str(endpoint or "").strip().lower(),
        normalized_msg.strip().lower()
    ]
    
    raw = "|".join(components)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()
