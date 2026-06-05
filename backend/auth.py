"""
Autenticación y roles con Firebase Auth + Firestore.

Roles:
  admin   — acceso total
  tecnico — solo lectura + actualizar visitas y notas
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from db.firestore import col, doc_to_dict

bearer = HTTPBearer(auto_error=False)


_AUTH_ENABLED = None  # None = auto-detectar

def _is_auth_enabled() -> bool:
    """Detecta si Firebase Auth está habilitado en el proyecto."""
    global _AUTH_ENABLED
    if _AUTH_ENABLED is not None:
        return _AUTH_ENABLED
    try:
        # Intento inocuo: listar usuarios (limite 1)
        firebase_auth.list_users(max_results=1)
        _AUTH_ENABLED = True
    except Exception as e:
        if "CONFIGURATION_NOT_FOUND" in str(e) or "PROJECT_NOT_FOUND" in str(e):
            _AUTH_ENABLED = False
        else:
            _AUTH_ENABLED = True  # otro error = Auth sí existe
    return _AUTH_ENABLED


def _get_uid_and_role(token: str) -> tuple[str, str]:
    """Verifica el ID token de Firebase y retorna (uid, role)."""
    try:
        decoded = firebase_auth.verify_id_token(token)
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"No autenticado: {e}")

    uid   = decoded["uid"]
    email = decoded.get("email", "")
    role  = decoded.get("role") or decoded.get("claims", {}).get("role")

    if not role:
        snap = col("usuarios").document(uid).get()
        if snap.exists:
            role = doc_to_dict(snap).get("role", "tecnico")
        else:
            # Primera vez que entra (p.ej. via Google) → crear doc con rol tecnico
            role = "tecnico"
            col("usuarios").document(uid).set({
                "uid": uid, "email": email,
                "nombre": decoded.get("name", email),
                "role": role,
            })

    return uid, role


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    """
    - Sin token → acceso como admin (modo transición hasta que Auth esté configurado)
    - Con token válido → usa rol del token
    - Con token inválido → 401
    """
    if not creds:
        # Sin token: verificar si Auth ya tiene usuarios creados
        try:
            page = firebase_auth.list_users(max_results=1)
            if list(page.users):
                # Ya hay usuarios → exigir login
                raise HTTPException(status_code=401, detail="Token requerido")
        except HTTPException:
            raise
        except Exception:
            pass
        # Sin usuarios aún → acceso libre como admin
        return {"uid": "guest", "role": "admin"}

    uid, role = _get_uid_and_role(creds.credentials)
    return {"uid": uid, "role": role}


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    return user


def require_any(user: dict = Depends(get_current_user)):
    return user
