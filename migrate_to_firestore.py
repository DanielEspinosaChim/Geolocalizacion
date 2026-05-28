"""
Migra candidatos y colonias de SQLite → Firestore.
Corre UNA vez: python migrate_to_firestore.py
"""
import sqlite3, json, sys
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("service_account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

conn = sqlite3.connect("data/procesado/negocios.db")
conn.row_factory = sqlite3.Row

# ── 1. CANDIDATOS ────────────────────────────────────────────────────────────
print("Migrando candidatos...")
rows = conn.execute("SELECT * FROM candidatos").fetchall()
total = len(rows)
batch = db.batch()
count = 0
committed = 0

for r in rows:
    d = dict(r)
    # Limpiar None / valores vacios
    d = {k: v for k, v in d.items() if v is not None}
    # Normalizar colonia_denue a mayusculas
    if "colonia_denue" in d:
        d["colonia_denue"] = str(d["colonia_denue"]).strip().upper()
    # Sanitize place_id para usarlo como doc ID
    raw_id = d.get("place_id", "")
    doc_id = raw_id.replace("/", "__")
    d["place_id"] = raw_id  # guardar original en el campo
    ref = db.collection("candidatos").document(doc_id)
    batch.set(ref, d)
    count += 1
    if count % 400 == 0:
        batch.commit()
        committed += count
        print(f"  {committed}/{total} candidatos subidos...")
        batch = db.batch()
        count = 0

if count > 0:
    batch.commit()
    committed += count

print(f"  Candidatos migrados: {committed}")

# ── 2. COLONIAS (zonas con geometria para el mapa) ───────────────────────────
print("Migrando colonias/zonas...")
rows = conn.execute("SELECT id, nombre, geometry_geojson FROM colonias").fetchall()
batch = db.batch()
for r in rows:
    d = {
        "id":     r["id"],
        "nombre": r["nombre"],
    }
    if r["geometry_geojson"]:
        # Guardar como string JSON — Firestore no soporta arrays anidados profundos
        d["geometry_json"] = r["geometry_geojson"]
    ref = db.collection("zonas").document(str(r["id"]))
    batch.set(ref, d)

batch.commit()
print(f"  Zonas migradas: {len(rows)}")

conn.close()
print("\nMigracion completa. Puedes borrar data/procesado/negocios.db")
