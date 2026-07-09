import json
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from google.cloud import storage as _gcs_module

from backend.core.config import BASE

_BUCKET = "canaco-info.appspot.com"
_SA     = BASE / "service_account.json"

# ── Firebase Admin SDK ────────────────────────────────────────────────────────
if not firebase_admin._apps:
    if _SA.exists():
        firebase_admin.initialize_app(
            credentials.Certificate(str(_SA)),
            {"storageBucket": _BUCKET},
        )
        print("  [Firebase] Admin SDK inicializado con service_account.json")
    else:
        firebase_admin.initialize_app(
            options={"storageBucket": _BUCKET},
        )
        print("  [Firebase] Admin SDK inicializado con ADC (Cloud Run)")

firebase_ok = bool(firebase_admin._apps)

# ── Firestore + Storage ───────────────────────────────────────────────────────
if firebase_ok:
    from firebase_admin import firestore as fb_firestore, storage as fb_storage
    fdb     = fb_firestore.client()
    storage = fb_storage
    print("  [Firestore] Cliente OK")
else:
    fdb     = None
    storage = None

# ── GCS client ────────────────────────────────────────────────────────────────
if _SA.exists():
    _sa_info   = json.loads(_SA.read_text())
    gcs_client = _gcs_module.Client.from_service_account_info(_sa_info)
    print(f"  [GCS] Cliente SA OK ({_sa_info['project_id']})")
else:
    gcs_client = _gcs_module.Client()
    print("  [GCS] Cliente ADC")
