import httpx
import ipaddress
import socket
from urllib.parse import urlparse
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

BANNED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),    # IPv4 Loopback
    ipaddress.ip_network("10.0.0.0/8"),     # IPv4 Private network
    ipaddress.ip_network("172.16.0.0/12"),  # IPv4 Private network
    ipaddress.ip_network("192.168.0.0/16"), # IPv4 Private network
    ipaddress.ip_network("169.254.0.0/16"), # IPv4 Link-local
    ipaddress.ip_network("0.0.0.0/8"),      # Current network
    ipaddress.ip_network("::1/128"),        # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),       # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),      # IPv6 Link Local
    ipaddress.ip_network("::/128"),         # IPv6 Unspecified
    ipaddress.ip_network("::ffff:0:0/96"),  # IPv4-mapped IPv6
]

def is_safe_url(url: str) -> Tuple[bool, str]:
    try:
        parsed = urlparse(url)
        
        # 1. Enforce HTTP/HTTPS
        if parsed.scheme not in ("http", "https"):
            return False, "Invalid protocol. Only HTTP and HTTPS are allowed."
            
        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL format."

        # 2. Resolve DNS (getaddrinfo gets IPv4 and IPv6)
        try:
            addr_info = socket.getaddrinfo(hostname, None)
        except socket.gaierror:
            return False, "DNS resolution failed."
            
        for addr in addr_info:
            ip_str = addr[4][0]
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                for network in BANNED_NETWORKS:
                    if ip_obj in network:
                        return False, f"Target resolves to a restricted network ({ip_str})."
            except ValueError:
                return False, "Invalid IP returned from DNS."

        return True, ""
        
    except Exception as e:
        return False, f"URL validation failed: {str(e)}"

async def perform_safe_check(client: httpx.AsyncClient, url: str, timeout_seconds: int) -> Dict[str, Any]:
    """
    Performs an HTTP GET safely, preventing large response downloads by streaming and immediately closing.
    """
    is_safe, error = is_safe_url(url)
    if not is_safe:
        return {
            "status": "down",
            "statusCode": None,
            "responseTime": None,
            "errorType": "SSRF_BLOCKED",
            "errorMessage": error
        }
        
    start_time = datetime.now(timezone.utc)
    
    try:
        # Use stream to only fetch headers, preventing huge response bodies from crashing the worker
        async with client.stream("GET", url, timeout=timeout_seconds, follow_redirects=False) as response:
            end_time = datetime.now(timezone.utc)
            duration_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Classification
            if 200 <= response.status_code < 400:
                if duration_ms > 2000:
                    status = "degraded"
                else:
                    status = "up"
                error_type = None
                error_message = None
            else:
                status = "down"
                error_type = "HTTP_ERROR"
                error_message = f"Received HTTP {response.status_code}"
                
            return {
                "status": status,
                "statusCode": response.status_code,
                "responseTime": duration_ms,
                "errorType": error_type,
                "errorMessage": error_message
            }
            
    except httpx.TimeoutException:
        return {
            "status": "down",
            "statusCode": None,
            "responseTime": None,
            "errorType": "TIMEOUT",
            "errorMessage": f"Request timed out after {timeout_seconds} seconds"
        }
    except httpx.RequestError as e:
        return {
            "status": "down",
            "statusCode": None,
            "responseTime": None,
            "errorType": "CONNECTION_ERROR",
            "errorMessage": f"Request failed: {str(e)}"
        }
    except Exception as e:
        return {
            "status": "down",
            "statusCode": None,
            "responseTime": None,
            "errorType": "UNKNOWN_ERROR",
            "errorMessage": f"An unexpected error occurred: {str(e)}"
        }
