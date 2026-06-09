"""
Analisis del dataset de negocios para detectar establecimientos
formales que se estan clasificando incorrectamente como informales.
"""
import pandas as pd
import sys, io
import re
import unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def quitar_acentos(texto):
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def normalizar(texto):
    t = str(texto).upper().strip()
    t = quitar_acentos(t)
    t = re.sub(r"[^\w\s&]", " ", t)
    t = re.sub(r"\b(EL|LA|LOS|LAS|DE|DEL|EN|Y|E|SA|CV|S\.A\.|C\.V\.|S DE RL|SAPI)\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

# ── Cargar datasets ─────────────────────────────────────────────────────────
print("="*60)
print("ANALISIS DEL DATASET DE NEGOCIOS GOOGLE MAPS")
print("="*60)

df_gmaps = pd.read_csv("data/data/gmaps_places_completo.csv", low_memory=False)
df_inf   = pd.read_csv("data/procesado/candidatos_informales.csv", low_memory=False)

print(f"\nDataset Google Maps total:     {len(df_gmaps):,}")
print(f"Candidatos informales actuales: {len(df_inf):,}")

# ── 1. ANALISIS DE TIPOS EN INFORMALES ─────────────────────────────────────
print("\n" + "="*60)
print("1. TIPOS GOOGLE MAPS EN CANDIDATOS INFORMALES")
print("="*60)

tipos_inf = df_inf['tipos'].fillna('').str.split(',').explode().str.strip()
tipos_inf_clean = tipos_inf[~tipos_inf.isin(['point_of_interest','establishment','service',''])]
print("\nTop 40 tipos presentes en 'informales':")
print(tipos_inf_clean.value_counts().head(40).to_string())

# ── 2. TIPOS QUE SON OBVIAMENTE FORMALES ────────────────────────────────────
print("\n" + "="*60)
print("2. TIPOS CLARAMENTE FORMALES EN EL POOL DE 'INFORMALES'")
print("="*60)

tipos_formales_obv = {
    'bank':             'Bancos',
    'gas_station':      'Gasolineras',
    'hospital':         'Hospitales',
    'supermarket':      'Supermercados',
    'department_store': 'Tiendas departamentales',
    'shopping_mall':    'Centros comerciales',
    'movie_theater':    'Cines',
    'insurance_agency': 'Aseguradoras',
    'university':       'Universidades',
    'school':           'Escuelas',
    'church':           'Iglesias',
    'government_office':'Oficinas gobierno',
    'local_government_office': 'Gobierno local',
    'police':           'Policia',
    'fire_station':     'Bomberos',
    'transit_station':  'Estaciones transito',
    'airport':          'Aeropuertos',
    'car_dealership':   'Agencias de autos',
    'lodging':          'Hoteles/hospedaje',
    'casino':           'Casinos',
}

total_falsos_positivos = 0
falsos_positivos_df = []

for tipo, label in tipos_formales_obv.items():
    mask = df_inf['tipos'].fillna('').str.contains(r'\b' + tipo + r'\b', case=False, regex=True)
    cnt = mask.sum()
    if cnt > 0:
        total_falsos_positivos += cnt
        subset = df_inf[mask].copy()
        subset['tipo_detectado'] = tipo
        subset['categoria'] = label
        falsos_positivos_df.append(subset)
        print(f"\n  [{label}] -> {cnt} negocios marcados como informales")
        sample = df_inf[mask][['nombre','tipos']].head(5)
        for _, r in sample.iterrows():
            print(f"    * {r['nombre'][:60]}")
            print(f"      tipos: {r['tipos'][:80]}")

if falsos_positivos_df:
    df_fp = pd.concat(falsos_positivos_df, ignore_index=True).drop_duplicates(subset=['place_id'])
    print(f"\n  TOTAL negocios con tipo formal = {len(df_fp):,} (de {len(df_inf):,} informales)")

# ── 3. NOMBRES QUE GRITAN FORMALIDAD ────────────────────────────────────────
print("\n" + "="*60)
print("3. NOMBRES QUE IMPLICAN FORMALIDAD OBVIA (en candidatos informales)")
print("="*60)

CADENAS_EXTRA = [
    "PEMEX","OXXO","WALMART","AURRERA","SORIANA","CHEDRAUI","COSTCO",
    "MCDONALDS","MCDONALD","BURGER KING","STARBUCKS","KFC","SUBWAY",
    "DOMINOS","PIZZA HUT","LITTLE CAESARS",
    "BBVA","BANCOMER","BANAMEX","BANORTE","SANTANDER","HSBC","SCOTIABANK",
    "FARMACIA GUADALAJARA","FARMACIAS SIMILARES","DR SIMI","BENAVIDES","AHORRO",
    "TELCEL","TELMEX","MOVISTAR","MEGACABLE","IZZI",
    "CINEPOLIS","CINEMEX",
    "HOME DEPOT","OFFICE DEPOT","BEST BUY",
    "LIVERPOOL","COPPEL","ELEKTRA","FAMSA",
    "NISSAN","TOYOTA","VOLKSWAGEN","HONDA","FORD","CHEVROLET","HYUNDAI","KIA",
    "GOODYEAR","BRIDGESTONE","FIRESTONE",
    "IMSS","ISSSTE","CONAFOR","SEMARNAT","INFONAVIT","SAT","CFE",
    "PREPARATORIA","SECUNDARIA","PRIMARIA","KINDER","PREESCOLAR","UNIVERSIDAD",
    "IGLESIA","TEMPLO","CAPILLA","CATEDRAL",
    "HOSPITAL","CLINICA IMSS","UNIDAD MEDICA","CENTRO DE SALUD",
    "CEMENTERIO","PANTEON","PARQUE",
    "MARRIOTT","HILTON","HYATT","HOLIDAY INN","FIESTA INN","IBIS",
]

nombre_formales = []
for cadena in CADENAS_EXTRA:
    mask = df_inf['nombre'].fillna('').apply(
        lambda x: cadena in normalizar(x)
    )
    cnt = mask.sum()
    if cnt > 0:
        nombre_formales.append({'cadena': cadena, 'count': cnt,
                                 'ejemplos': df_inf[mask]['nombre'].head(3).tolist()})

nombre_formales.sort(key=lambda x: -x['count'])
total_nombre_formal = 0
for item in nombre_formales:
    print(f"  [{item['cadena']}] -> {item['count']} negocios")
    for ej in item['ejemplos']:
        print(f"    * {ej[:70]}")
    total_nombre_formal += item['count']

print(f"\n  TOTAL con nombre claramente formal: ~{total_nombre_formal:,}")

# ── 4. RESUMEN FINAL ─────────────────────────────────────────────────────────
print("\n" + "="*60)
print("4. RESUMEN: IMPACTO ESTIMADO DE FALSOS POSITIVOS")
print("="*60)
print(f"  Informales actuales en DB: {len(df_inf):,}")
print(f"  Con tipo formal obvio (duplicados posibles): ~{total_falsos_positivos:,}")
print(f"  Con nombre cadena formal: ~{total_nombre_formal:,}")
print()
print("  Nota: Hay solapamiento entre categorias.")
print("  Se recomienda correr el pre-filtro para limpiar antes del cruce.")

print("\nAnalisis completado.")
