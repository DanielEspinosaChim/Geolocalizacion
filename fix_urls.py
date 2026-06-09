"""
Corrige URLs de Firestore: cambia firebasestorage.googleapis.com URLs
a /uploads/{filename} para que el endpoint /uploads las sirva desde GCS.
Corre: python fix_urls.py
"""
import json, re
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

SA = Path(__file__).parent / "service_account.json"
firebase_admin.initialize_app(credentials.Certificate(str(SA)))
db = firestore.client()

def extract_filename(url: str) -> str | None:
    """Extrae el nombre del archivo de una URL de Firebase Storage."""
    # Formato: .../o/filename.jpg?alt=media&token=...
    m = re.search(r'/o/([^?]+)', url)
    if m:
        from urllib.parse import unquote
        return unquote(m.group(1))
    return None

def is_firebase_url(url) -> bool:
    return bool(url) and "firebasestorage.googleapis.com" in url

fixed = 0

# 1. Coleccion reportes
print("=== reportes ===")
for doc in db.collection("reportes").stream():
    d = doc.to_dict()
    foto = d.get("foto_url", "")
    if is_firebase_url(foto):
        fname = extract_filename(foto)
        if fname:
            new_url = f"/uploads/{fname}"
            doc.reference.update({"foto_url": new_url})
            print(f"  {doc.id[:8]}: {fname}")
            fixed += 1

# 2. Candidatos -> visitas
print("\n=== candidatos/visitas ===")
for doc in db.collection("candidatos").stream():
    d = doc.to_dict()
    visitas = d.get("visitas", [])
    changed = False
    for v in visitas:
        url = v.get("foto_visita_url", "")
        if is_firebase_url(url):
            fname = extract_filename(url)
            if fname:
                v["foto_visita_url"] = f"/uploads/{fname}"
                changed = True
                print(f"  candidato {doc.id[:8]}: {fname}")
    if changed:
        doc.reference.update({"visitas": visitas})
        fixed += 1

print(f"\nListo. {fixed} documentos corregidos.")
