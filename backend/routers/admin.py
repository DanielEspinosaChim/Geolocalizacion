"""
Panel de administración — gestión de usuarios y asignaciones.
Solo accesible con rol admin.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from firebase_admin import auth as firebase_auth
from auth import require_admin
from db.firestore import col, doc_to_dict

router = APIRouter()


# ── Modelos ───────────────────────────────────────────────────────────────────

class UsuarioOut(BaseModel):
    uid:    str
    email:  str
    nombre: Optional[str]
    role:   str
    disabled: bool = False

class CambiarRoleBody(BaseModel):
    role: str = Field(..., description="admin | tecnico")

class CrearUsuarioBody(BaseModel):
    email:    str
    password: str
    nombre:   str
    role:     str = "tecnico"

class AsignarCampanaBody(BaseModel):
    uid: str = Field(..., description="UID del técnico al que se asigna")


# ── Usuarios ──────────────────────────────────────────────────────────────────

@router.get("/api/admin/usuarios", response_model=List[UsuarioOut])
def listar_usuarios(user=Depends(require_admin)):
    """Lista todos los usuarios con su rol."""
    page    = firebase_auth.list_users()
    result  = []
    for fb_user in page.users:
        uid  = fb_user.uid
        snap = col("usuarios").document(uid).get()
        data = doc_to_dict(snap) if snap.exists else {}
        result.append({
            "uid":      uid,
            "email":    fb_user.email or "",
            "nombre":   fb_user.display_name or data.get("nombre", ""),
            "role":     data.get("role", "tecnico"),
            "disabled": fb_user.disabled,
        })
    return sorted(result, key=lambda x: x["role"] + x["email"])


@router.patch("/api/admin/usuarios/{uid}/role")
def cambiar_role(uid: str, body: CambiarRoleBody, user=Depends(require_admin)):
    """Cambia el rol de un usuario."""
    if body.role not in ("admin", "tecnico"):
        raise HTTPException(status_code=400, detail="role debe ser: admin | tecnico")
    # Actualizar custom claim (se aplica en el próximo login/refresh)
    firebase_auth.set_custom_user_claims(uid, {"role": body.role})
    # Actualizar en Firestore
    ref = col("usuarios").document(uid)
    if ref.get().exists:
        ref.update({"role": body.role})
    else:
        fb = firebase_auth.get_user(uid)
        ref.set({"uid": uid, "email": fb.email, "nombre": fb.display_name or "", "role": body.role})
    return {"ok": True, "uid": uid, "role": body.role}


@router.post("/api/admin/usuarios", status_code=201)
def crear_usuario(body: CrearUsuarioBody, user=Depends(require_admin)):
    """Crea un nuevo usuario."""
    if body.role not in ("admin", "tecnico"):
        raise HTTPException(status_code=400, detail="role debe ser: admin | tecnico")
    try:
        fb_user = firebase_auth.create_user(
            email=body.email, password=body.password, display_name=body.nombre
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")

    firebase_auth.set_custom_user_claims(fb_user.uid, {"role": body.role})
    col("usuarios").document(fb_user.uid).set({
        "uid": fb_user.uid, "email": body.email,
        "nombre": body.nombre, "role": body.role,
    })
    return {"ok": True, "uid": fb_user.uid, "email": body.email, "role": body.role}


@router.delete("/api/admin/usuarios/{uid}")
def eliminar_usuario(uid: str, user=Depends(require_admin)):
    """Elimina un usuario."""
    if uid == user["uid"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    try:
        firebase_auth.delete_user(uid)
    except firebase_auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    col("usuarios").document(uid).delete()
    return {"ok": True, "eliminado": uid}


@router.patch("/api/admin/usuarios/{uid}/disable")
def toggle_usuario(uid: str, body: dict, user=Depends(require_admin)):
    """Habilita o deshabilita un usuario."""
    disabled = bool(body.get("disabled", False))
    firebase_auth.update_user(uid, disabled=disabled)
    return {"ok": True, "uid": uid, "disabled": disabled}


# ── Asignaciones de campañas ──────────────────────────────────────────────────

@router.patch("/api/admin/campanas/{campana_id}/asignar")
def asignar_campana(campana_id: str, body: AsignarCampanaBody, user=Depends(require_admin)):
    """Asigna una campaña a un técnico."""
    ref = col("campanas").document(campana_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    # Obtener nombre del técnico
    snap = col("usuarios").document(body.uid).get()
    nombre = doc_to_dict(snap).get("nombre", body.uid) if snap.exists else body.uid
    ref.update({"asignado_a": body.uid, "asignado_nombre": nombre})
    return {"ok": True, "campana_id": campana_id, "asignado_a": body.uid, "asignado_nombre": nombre}


@router.delete("/api/admin/campanas/{campana_id}/asignar")
def desasignar_campana(campana_id: str, user=Depends(require_admin)):
    """Quita la asignación de una campaña."""
    ref = col("campanas").document(campana_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    ref.update({"asignado_a": None, "asignado_nombre": None})
    return {"ok": True, "campana_id": campana_id}
