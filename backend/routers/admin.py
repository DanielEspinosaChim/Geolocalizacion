from fastapi import APIRouter, HTTPException, Body, Request
from firebase_admin import auth as fb_auth

from backend.core.auth import require_admin
from backend.core.firebase import firebase_ok

router = APIRouter()


@router.get("/api/admin/usuarios")
def get_usuarios(request: Request):
    require_admin(request)
    if not firebase_ok:
        return []
    try:
        users = []
        page  = fb_auth.list_users()
        while page:
            for u in page.users:
                claims = u.custom_claims or {}
                users.append({"uid":      u.uid,
                               "email":   u.email,
                               "nombre":  u.display_name or "",
                               "role":    claims.get("role", "tecnico"),
                               "disabled": u.disabled})
            page = page.get_next_page()
        return users
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/admin/usuarios")
async def crear_usuario(request: Request, body: dict = Body(...)):
    require_admin(request)
    if not firebase_ok:
        raise HTTPException(503, "Firebase no configurado")
    try:
        user = fb_auth.create_user(
            email=body.get("email"),
            password=body.get("password", "Temporal123!"),
            display_name=body.get("nombre", ""),
        )
        fb_auth.set_custom_user_claims(user.uid, {"role": body.get("role", "tecnico")})
        return {"ok": True, "uid": user.uid}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.patch("/api/admin/usuarios/{uid}")
async def actualizar_usuario(request: Request, uid: str, body: dict = Body(...)):
    require_admin(request)
    if not firebase_ok:
        raise HTTPException(503, "Firebase no configurado")
    try:
        if "role" in body:
            u      = fb_auth.get_user(uid)
            claims = dict(u.custom_claims or {})
            claims["role"] = body["role"]
            fb_auth.set_custom_user_claims(uid, claims)
        if "disabled" in body:
            fb_auth.update_user(uid, disabled=bool(body["disabled"]))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.delete("/api/admin/usuarios/{uid}")
async def eliminar_usuario(request: Request, uid: str):
    require_admin(request)
    if not firebase_ok:
        raise HTTPException(503, "Firebase no configurado")
    try:
        fb_auth.delete_user(uid)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))
