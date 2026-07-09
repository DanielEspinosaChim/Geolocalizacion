from typing import Optional

from fastapi import HTTPException, Request
from firebase_admin import auth as fb_auth

from backend.core.firebase import firebase_ok


def verify_token(request: Request) -> Optional[dict]:
    if not firebase_ok:
        return {"uid": "local", "role": "admin", "email": "local@local"}
    hdr = request.headers.get("Authorization", "")
    if not hdr.startswith("Bearer "):
        return None
    try:
        return fb_auth.verify_id_token(hdr[7:])
    except Exception:
        return None


def require_auth(request: Request) -> dict:
    c = verify_token(request)
    if not c:
        raise HTTPException(401, "No autenticado")
    return c


def require_admin(request: Request) -> dict:
    c = verify_token(request)
    if not c:
        raise HTTPException(401, "No autenticado")
    if c.get("role") != "admin":
        raise HTTPException(403, "Solo administradores")
    return c
