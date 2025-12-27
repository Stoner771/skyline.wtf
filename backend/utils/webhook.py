import httpx
import asyncio
from typing import Optional, Dict, Any


async def send_webhook(webhook_url: str, event: str, data: Dict[str, Any]):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {
                "event": event,
                "data": data,
                "timestamp": int(__import__("datetime").datetime.utcnow().timestamp())
            }
            await client.post(webhook_url, json=payload)
    except Exception:
        pass

