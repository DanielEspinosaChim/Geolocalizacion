import json
import pandas as pd
import numpy as np
import math
import sqlite3

try:
    from rapidfuzz import fuzz
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "rapidfuzz", "-q"])
    from rapidfuzz import fuzz


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── 1. CARGAR GOOGLE MAPS CACHE ──────────────────────────────────────────────
print("Cargando Google Maps cache...")
with open("data/raw/gmaps_places.json", encoding="utf-8") as f:
    raw = json.load(f)

places = []
for place_id, d in raw.items():
    name = d.get("name") or d.get("displayName", {}).get("text") or ""
    lat  = d.get("lat") or d.get("location", {}).get("latitude")
    lng  = d.get("lng") or d.get("lon") or d.get("location", {}).get("longitude")
    types = d.get("types", [])
    status = d.get("status", "")
    addr = d.get("address") or d.get("formattedAddress") or ""
    if name and lat and lng and status == "OPERATIONAL":
        places.append({
            "place_id":    place_id,
            "nombre_maps": name,
            "lat":         float(lat),
            "lng":         float(lng),
            "direccion":   addr,
            "tipos":       ",".join(types) if isinstance(types, list) else str(types),
        })

df_maps = pd.DataFrame(places)
print(f"  {len(df_maps)} negocios operativos de Google Maps")


# ── 2. CARGAR DENUE ───────────────────────────────────────────────────────────
print("Cargando DENUE...")
df_denue = pd.read_csv("data/procesado/denue_merida_limpio.csv", low_memory=False)
print(f"  {len(df_denue)} registros | columnas: {df_denue.columns.tolist()[:8]}")

# Detectar columnas automaticamente
name_col = next((c for c in df_denue.columns
                 if "nom_estab" in c.lower() or ("nombre" in c.lower() and "estab" in c.lower())), None)
lat_col  = next((c for c in df_denue.columns if "latitud" in c.lower() or c.lower() == "lat"), None)
lng_col  = next((c for c in df_denue.columns if "longitud" in c.lower() or c.lower() in ("lon","lng")), None)

if not all([name_col, lat_col, lng_col]):
    print(f"ERROR: no encuentro columnas. Columnas disponibles: {df_denue.columns.tolist()}")
    raise SystemExit(1)

print(f"  Columnas detectadas: nombre={name_col} | lat={lat_col} | lng={lng_col}")

df_d = df_denue[[name_col, lat_col, lng_col]].dropna().copy()
df_d.columns = ["nombre_denue", "lat", "lng"]
df_d["nombre_denue"] = df_d["nombre_denue"].astype(str).str.upper().str.strip()
df_d = df_d[(df_d["lat"] != 0) & (df_d["lng"] != 0)]

denue_lat = df_d["lat"].values
denue_lng = df_d["lng"].values
denue_nom = df_d["nombre_denue"].values
print(f"  {len(df_d)} registros DENUE con coordenadas validas")


# ── 3. CRUCE NEGOCIO POR NEGOCIO ──────────────────────────────────────────────
RADIO_M   = 50   # metros
FUZZY_MIN = 72   # 0-100, score minimo para considerar match de nombre

print(f"\nCruzando {len(df_maps)} negocios Maps vs {len(df_d)} DENUE...")
print(f"  Radio espacial: {RADIO_M}m  |  Fuzzy minimo: {FUZZY_MIN}")

resultados = []
for i, row in df_maps.iterrows():
    if i > 0 and i % 300 == 0:
        pct = i / len(df_maps) * 100
        print(f"  {i}/{len(df_maps)}  ({pct:.0f}%)")

    nombre_maps = row["nombre_maps"].upper().strip()

    # Filtro rapido: bbox ~1km antes de calcular haversine
    mask = (np.abs(denue_lat - row["lat"]) < 0.01) & (np.abs(denue_lng - row["lng"]) < 0.01)
    idx_cercanos = np.where(mask)[0]

    match = False
    mejor_score = 0
    mejor_nombre_denue = ""
    dist_min = 9999.0

    for idx in idx_cercanos:
        dist = haversine_m(row["lat"], row["lng"], denue_lat[idx], denue_lng[idx])
        if dist <= RADIO_M:
            score = fuzz.token_sort_ratio(nombre_maps, denue_nom[idx])
            if score > mejor_score:
                mejor_score = score
                mejor_nombre_denue = denue_nom[idx]
                dist_min = dist
            if score >= FUZZY_MIN:
                match = True
                break

    resultados.append({
        "place_id":          row["place_id"],
        "nombre":            row["nombre_maps"],
        "lat":               row["lat"],
        "lng":               row["lng"],
        "direccion":         row["direccion"],
        "tipos":             row["tipos"],
        "match_denue":       match,
        "nombre_denue":      mejor_nombre_denue,
        "fuzzy_score":       mejor_score,
        "distancia_m":       round(dist_min, 1),
        "es_informal":       not match,
    })

df_res = pd.DataFrame(resultados)
df_inf = df_res[df_res["es_informal"]].copy()
df_for = df_res[~df_res["es_informal"]].copy()


# ── 4. RESULTADOS ─────────────────────────────────────────────────────────────
print(f"\n{'='*52}")
print("RESULTADO DEL CRUCE")
print(f"{'='*52}")
print(f"Total analizados:          {len(df_res):>6,}")
print(f"Formales (match DENUE):    {len(df_for):>6,}  ({len(df_for)/len(df_res)*100:.1f}%)")
print(f"Candidatos informales:     {len(df_inf):>6,}  ({len(df_inf)/len(df_res)*100:.1f}%)")
print(f"{'='*52}")
print("\nTop 15 candidatos informales:")
cols_show = ["nombre", "direccion", "tipos"]
cols_show = [c for c in cols_show if c in df_inf.columns]
print(df_inf[cols_show].head(15).to_string(index=False))


# ── 5. GUARDAR ────────────────────────────────────────────────────────────────
df_inf.to_csv("data/procesado/candidatos_informales.csv", index=False, encoding="utf-8")
df_res.to_csv("data/procesado/cruce_completo.csv",       index=False, encoding="utf-8")

conn = sqlite3.connect("data/procesado/negocios.db")
df_inf.to_sql("candidatos", conn, if_exists="replace", index=False)
df_for.to_sql("formales",   conn, if_exists="replace", index=False)
conn.close()

print(f"\nGuardado:")
print(f"  data/procesado/candidatos_informales.csv  ({len(df_inf)} registros)")
print(f"  data/procesado/cruce_completo.csv")
print(f"  data/procesado/negocios.db")
print(f"\nSiguiente: python app.py")
