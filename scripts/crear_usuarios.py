"""
Crear usuarios iniciales en Firebase Auth + guardar roles en Firestore.

Uso:
    python scripts/crear_usuarios.py

Edita USUARIOS abajo antes de correr.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import firebase_admin
from firebase_admin import credentials, auth
from db.firestore import get_db as get_firestore

SA = Path(__file__).parent.parent / "service_account.json"
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(str(SA)))

db = get_firestore()

# ── Define los usuarios que quieres crear ────────────────────────────────────
USUARIOS = [
    {
        "email":       "admin@canaco.mx",
        "password":    "Admin1234!",
        "nombre":      "Administrador",
        "role":        "admin",
    },
    {
        "email":       "tecnico@canaco.mx",
        "password":    "Tecnico1234!",
        "nombre":      "Técnico de campo",
        "role":        "tecnico",
    },
]
# ─────────────────────────────────────────────────────────────────────────────


for u in USUARIOS:
    email = u["email"]
    try:
        # Intentar crear; si ya existe, obtener el UID
        try:
            user = auth.create_user(
                email=email,
                password=u["password"],
                display_name=u["nombre"],
            )
            print(f"[+] Creado: {email}  UID: {user.uid}")
        except auth.EmailAlreadyExistsError:
            user = auth.get_user_by_email(email)
            print(f"[=] Ya existe: {email}  UID: {user.uid}")

        # Setear custom claim (se refleja en el token después del siguiente login)
        auth.set_custom_user_claims(user.uid, {"role": u["role"]})
        print(f"    Custom claim seteado: role={u['role']}")

        # Guardar también en Firestore como respaldo
        db.collection("usuarios").document(user.uid).set({
            "uid":    user.uid,
            "email":  email,
            "nombre": u["nombre"],
            "role":   u["role"],
        })
        print(f"    Guardado en Firestore usuarios/{user.uid}")

    except Exception as e:
        print(f"[ERROR] {email}: {e}")

print("\nListo. Credenciales:")
for u in USUARIOS:
    print(f"  {u['role']:8} → {u['email']} / {u['password']}")
