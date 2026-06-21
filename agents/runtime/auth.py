from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class Identity:
    user_id: str
    organization_id: str


def verify_gateway_token(token: str, secret: str, now: int | None = None) -> Identity:
    if not token or not secret:
        raise ValueError("gateway token and secret are required")
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("invalid gateway token format")
    unsigned = f"{parts[0]}.{parts[1]}"
    expected = _encode(
        hmac.new(secret.encode("utf-8"), unsigned.encode("utf-8"), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(parts[2], expected):
        raise ValueError("invalid gateway token signature")
    try:
        claims = json.loads(_decode(parts[1]))
    except (ValueError, json.JSONDecodeError) as exc:
        raise ValueError("invalid gateway token claims") from exc
    current_time = int(time.time()) if now is None else now
    if int(claims.get("exp", 0)) <= current_time:
        raise ValueError("gateway token expired")
    user_id = str(claims.get("sub", ""))
    organization_id = str(claims.get("org", ""))
    if not user_id or not organization_id:
        raise ValueError("gateway token is missing tenant identity")
    return Identity(user_id=user_id, organization_id=organization_id)


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding).decode("utf-8")
