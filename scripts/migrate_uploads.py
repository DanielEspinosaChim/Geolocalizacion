"""
Sube las imagenes de data/uploads/ a Firebase Storage (canaco-info-reportes)
con download tokens y actualiza Firestore con las URLs directas.
Corre una sola vez: python migrate_uploads.py
"""
import json, mimetypes, uuid
from pathlib import Path
from urllib.parse import quote

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud import storage as gcs_lib
from google.oauth2 import service_account as sa_lib

BASE    = Path(__file__).parent
SA      = BASE / "service_account.json"
UPLOADS = BASE / "data/uploads"
BUCKET  = "canaco-info-reportes"

# Inicializar Firebase Admin (Firestore)
firebase_admin.initialize_app(credentials.Certificate(str(SA)))
db = firestore.client()

# Cliente GCS directo con SA
sa_data   = json.loads(SA.read_text())
gcs_creds = sa_lib.Credentials.from_service_account_info(sa_data)
gcs       = gcs_lib.Client(project="canaco-info", credentials=gcs_creds)
bucket    = gcs.bucket(BUCKET)

def upload_with_token(filepath: Path) -> str:
    """Sube archivo a GCS con un Firebase download token y devuelve la URL publica."""
    mime, _ = mimetypes.guess_type(filepath.name)
    mime = mime or "image/jpeg"
    token = str(uuid.uuid4())
    blob = bucket.blob(filepath.name)
    blob.metadata = {"firebaseStorageDownloadTokens": token}
    blob.upload_from_filename(str(filepath), content_type=mime)
    blob.patch()   # aplica metadata con el token
    encoded = quote(filepath.name, safe="")
    url = (f"https://firebasestorage.googleapis.com/v0/b/{BUCKET}"
           f"/o/{encoded}?alt=media&token={token}")
    return url

# 1. Subir todas las imagenes y construir mapa old_url -> new_url
url_map = {}
for f in sorted(UPLOADS.iterdir()):
    if not f.is_file():
        continue
    firebase_url = upload_with_token(f)
    url_map[f"/uploads/{f.name}"] = firebase_url
    print(f"OK {f.name}")

print(f"\nSubidas: {len(url_map)} imagenes. Actualizando Firestore...\n")

# 2. Actualizar coleccion reportes
updated = 0
for doc in db.collection("reportes").stream():
    d   = doc.to_dict()
    old = d.get("foto_url", "")
    if old in url_map:
        doc.reference.update({"foto_url": url_map[old]})
        print(f"  reporte {doc.id[:8]}: actualizado")
        updated += 1

# 3. Actualizar foto_visita_url dentro de candidatos
for doc in db.collection("candidatos").stream():
    d       = doc.to_dict()
    visitas = d.get("visitas", [])
    changed = False
    for v in visitas:
        old = v.get("foto_visita_url", "")
        if old in url_map:
            v["foto_visita_url"] = url_map[old]
            changed = True
    if changed:
        doc.reference.update({"visitas": visitas})
        print(f"  candidato {doc.id[:8]}: visitas actualizadas")
        updated += 1

print(f"\nListo. {updated} documentos actualizados en Firestore.")
