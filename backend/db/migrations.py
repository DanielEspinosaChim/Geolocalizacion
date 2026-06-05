"""
Migraciones de base de datos.
Se ejecutan automáticamente al arrancar la aplicación.
Todas las operaciones son idempotentes.
"""
from .database import get_db


def run_migrations():
    conn = get_db()
    cur  = conn.cursor()

    # ── Tabla colonias (Feature 1) ────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS colonias (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre           TEXT NOT NULL,
            geometry_geojson TEXT NOT NULL
        )
    """)

    # ── Columnas extra en candidatos (Feature 4) ──────────────────────────────
    for col, definition in [
        ("tipo",               "TEXT DEFAULT 'informal'"),
        ("fecha_actualizacion","TEXT"),
        ("colonia_id",         "INTEGER"),
    ]:
        try:
            cur.execute(f"ALTER TABLE candidatos ADD COLUMN {col} {definition}")
        except Exception:
            pass  # columna ya existe

    # ── Tabla reportes ciudadanos (Feature 3) ─────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS reportes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo        TEXT NOT NULL,
            descripcion TEXT,
            lat         REAL NOT NULL,
            lng         REAL NOT NULL,
            direccion   TEXT,
            fecha       TEXT NOT NULL,
            status      TEXT DEFAULT 'pendiente',
            foto_url    TEXT
        )
    """)

    # ── Tablas campañas (Feature 6) ───────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS campanas (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre       TEXT NOT NULL,
            descripcion  TEXT,
            colonia      TEXT,
            fecha_inicio TEXT,
            fecha_fin    TEXT,
            status       TEXT DEFAULT 'activa',
            created_at   TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS campana_negocios (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            campana_id     INTEGER NOT NULL,
            negocio_id     TEXT NOT NULL,
            checklist_json TEXT,
            completado     INTEGER DEFAULT 0,
            notas          TEXT,
            fecha_visita   TEXT,
            FOREIGN KEY (campana_id) REFERENCES campanas(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Migraciones aplicadas correctamente.")
