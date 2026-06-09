"""
Cruce de datos Google Maps vs DENUE para detección de negocios informales.

Metodología de 3 capas para GARANTIZAR que todo informal sea realmente informal:

  CAPA 1 — Filtro de tipos: excluir lugares que NO son negocios
           (parques, escuelas, iglesias, hospitales, gobierno, viviendas, etc.)

  CAPA 2 — Detección de cadenas/franquicias: negocios cuyo nombre coincide
           con cadenas comerciales conocidas → FORMAL automáticamente.
           Usa matching flexible: sin acentos, case-insensitive, substrings.

  CAPA 3 — Cruce fuzzy contra DENUE: matching espacial + similaridad de nombre
           con normalización robusta (acentos, abreviaturas, tokens).

  CAPA 4 — Tipos Google Maps que implican formalidad por definición
           (bancos, gasolineras, supermercados, hospitales, etc.)

Un negocio solo se clasifica como INFORMAL si pasa las 4 capas sin match.
"""

import json
import re
import unicodedata
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


# ═══════════════════════════════════════════════════════════════════════════════
# UTILIDADES DE NORMALIZACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

def quitar_acentos(texto: str) -> str:
    """Elimina acentos/diacríticos: café → cafe, Mérida → Merida."""
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def normalizar(texto: str) -> str:
    """Normalización robusta para comparación de nombres de negocios."""
    t = str(texto).upper().strip()
    t = quitar_acentos(t)
    # Quitar puntuación excepto &
    t = re.sub(r"[^\w\s&]", " ", t)
    # Quitar artículos y preposiciones comunes que no aportan
    t = re.sub(r"\b(EL|LA|LOS|LAS|DE|DEL|EN|Y|E|SA|CV|S\.A\.|C\.V\.|S DE RL|SAPI)\b", " ", t)
    # Colapsar espacios
    t = re.sub(r"\s+", " ", t).strip()
    return t


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ═══════════════════════════════════════════════════════════════════════════════
# CAPA 1: TIPOS DE GOOGLE MAPS QUE NO SON NEGOCIOS
# ═══════════════════════════════════════════════════════════════════════════════
# Si un lugar tiene CUALQUIERA de estos tipos como tipo principal (el primero
# o el dominante), se excluye del análisis de informalidad porque no es un
# negocio comercial.

TIPOS_NO_NEGOCIO = {
    # Educación
    "school", "primary_school", "secondary_school", "middle_school",
    "preschool", "kindergarten", "university", "academic_department",
    "educational_institution",
    # Religión
    "church", "mosque", "synagogue", "hindu_temple", "place_of_worship",
    # Gobierno
    "city_hall", "courthouse", "embassy", "fire_station", "police",
    "police_station", "post_office", "local_government_office",
    "government_office",
    # Salud pública (hospitales grandes son formales, no informales)
    "hospital",
    # Espacios públicos / recreación no-comercial
    "park", "city_park", "national_park", "playground", "dog_park",
    "cemetery", "funeral_home",
    # Transporte / infraestructura (incluyendo paradas de bus que GMaps a veces etiqueta mal)
    "parking", "parking_lot", "parking_garage",
    "transit_station", "transit_stop", "bus_stop", "bus_station",
    "train_station", "subway_station",
    "airport", "light_rail_station",
    # Vivienda / residencial
    "housing_complex", "condominium_complex", "apartment_complex",
    "apartment_building",
    # Monumentos / atracciones no-comerciales
    "historical_landmark", "historical_place",
    # Naturaleza
    "nature_preserve", "wildlife_refuge", "wildlife_park",
    "national_forest",
}

# Tipos que son negocios pero SIEMPRE formales (regulados por ley)
TIPOS_SIEMPRE_FORMALES = {
    "bank", "atm",
    "gas_station",
    "hospital", "medical_center",
    "supermarket", "department_store",
    "shopping_mall",
    "movie_theater", "cinema",
    "airport",
    "insurance_agency",
    "casino",           # casinos: regulados federalmente
    "car_dealership",   # agencias de autos: concesionarias registradas
    "resort_hotel",     # resorts de cadena
    "amusement_park",   # parques de diversiones con permiso
    "water_park",       # parques acuáticos comerciales
    "stadium",          # estadios/recintos registrados
}

# ═══════════════════════════════════════════════════════════════════════════════
# CAPA 0: PRE-FILTRO — Instituciones formales obvias por nombre
# ═══════════════════════════════════════════════════════════════════════════════
# Nombres de instituciones públicas / corporativas que son OBVIAMENTE formales
# y que ninguna lógica de tipos/DENUE debería necesitar: se sacan antes del cruce.

_INST_PUBLICAS = [
    # Energía
    "CFE", "COMISION FEDERAL DE ELECTRICIDAD",
    "PEMEX", "PETROLEOS MEXICANOS",
    "CRE",  # Comisión Reguladora de Energía
    # Agua
    "JAPAY", "JUNTA DE AGUA", "SISTEMA DE AGUA", "SIMAS", "SAPAM",
    # Salud pública
    "IMSS", "ISSSTE", "INSABI", "IMSS BIENESTAR", "SEGURO POPULAR",
    "CONAPRA", "CENSIDA",
    "UNIDAD MEDICA", "CLINICA IMSS", "CLINICA ISSSTE", "UMF ",
    "HOSPITAL GENERAL", "HOSPITAL REGIONAL", "HOSPITAL CIVIL",
    "HOSPITAL DEL NINO", "HOSPITAL DE LA MUJER",
    "CENTRO DE SALUD", "CASA DE SALUD",
    # Vivienda / crédito
    "INFONAVIT", "FOVISSSTE", "SHF", "FONHAPO",
    # Educación pública
    "SEP ", "CONAFE", "INEA", "CBTIS", "CBTA", "CONALEP", "COBACH",
    "PREPARATORIA FEDERAL", "BACHILLERES", "TELESECUNDARIA",
    "INSTITUTO TECNOLOGICO", "TECNOLOGICO NACIONAL",
    "UNIVERSIDAD AUTONOMA", "UADY", "UNAM", "IPN", "TECNOLOGICO DE MERIDA",
    # Gobierno / administración
    "AYUNTAMIENTO", "PRESIDENCIA MUNICIPAL", "COMISARIA MUNICIPAL",
    "DELEGACION", "SUBDELEGACION", "REGISTRO CIVIL",
    "SAT ", "SERVICIO DE ADMINISTRACION TRIBUTARIA",
    "INEGI", "CONAFOR", "SEMARNAT", "PROFEPA",
    "CONAGUA", "SAGARPA", "SADER",
    "SEDENA", "SEMAR", "PGR", "FGR", "FISCALIA",
    "POLICIA MUNICIPAL", "POLICIA ESTATAL", "POLICIA FEDERAL",
    # Paraestatales / fideicomisos
    "BANOBRAS", "NAFINSA", "BANJERCITO", "BANSEFI", "BIENESTAR",
    "LICONSA", "DICONSA", "CONASUPO",
    # Grandes corporativos obvios (no en la lista de cadenas)
    "MICROSOFT", "GOOGLE", "AMAZON MEXICO", "MERCADO LIBRE",
    "BIMBO", "CEMEX", "VITRO", "ALFA",
]

_INST_PUBLICAS_NORM = [normalizar(n) for n in _INST_PUBLICAS]


def es_institucion_formal_obvia(nombre: str) -> tuple[bool, str]:
    """
    Detecta si el nombre corresponde a una institución pública o corporativa
    registrada que es 100% formal por definición.
    Returns: (es_formal, razon)
    """
    nombre_norm = normalizar(nombre)
    for inst in _INST_PUBLICAS_NORM:
        # Coincidencia como subcadena (con espacio para evitar falsos positivos cortos)
        if inst in nombre_norm:
            return True, f"Institución formal: {inst}"
        # Para tokens muy cortos (≤4 chars) requerir que sea palabra completa
        if len(inst.strip()) <= 4:
            if re.search(r'\b' + re.escape(inst.strip()) + r'\b', nombre_norm):
                return True, f"Institución formal: {inst}"
    return False, ""


# ═══════════════════════════════════════════════════════════════════════════════
# CAPA 2: CADENAS Y FRANQUICIAS CONOCIDAS EN MÉXICO
# ═══════════════════════════════════════════════════════════════════════════════
# Cada entrada es una VARIACIÓN normalizada (sin acentos, mayúsculas).
# El matching busca si el nombre del negocio CONTIENE alguna de estas cadenas.
# Se agrupan por categoría para mantenibilidad.

_CADENAS_CONVENIENCIA = [
    "OXXO", "7 ELEVEN", "7-ELEVEN", "CIRCLE K", "EXTRA",
    "MODELORAMA",
    "TIENDA SIX", "TIENDAS SIX",   # conveniencia FEMSA (hermana de Oxxo)
]

# Cadenas regionales del sureste / Yucatán (no nacionales, pero formales)
_CADENAS_YUCATAN = [
    "DUNOSUSA", "ABARROTES DUNOSUSA",
    "HELADOS SANTA CLARA", "TIENDAS SANTA CLARA",
    "GRUPO MERZA",
]

_CADENAS_SUPER_DEPTO = [
    "WALMART", "BODEGA AURRERA", "AURRERA",
    "SORIANA", "CHEDRAUI", "COSTCO", "SAMS CLUB", "SAM'S CLUB",
    "MEGA SORIANA", "CITY CLUB", "HEB", "ALSUPER",
    "SUPERAMA", "LA COMER", "FRESKO", "CITY MARKET",
    "SUPER AKI", "SUPER WILLYS", "SUPER KOMPRAS",
    "LIVERPOOL", "PALACIO DE HIERRO", "SEARS",
    "COPPEL", "ELEKTRA", "WOOLWORTH", "FAMSA",
    "HOME DEPOT", "LOWES", "THE HOME STORE",
    "SUBURBIA", "SHASA", "PARISINA",
    "PROMODA", "FOREVER 21", "ZARA", "H&M", "C&A",
    "PULL AND BEAR", "BERSHKA", "STRADIVARIUS",
    "MINISO", "WALDOS", "TIENDAS 3B", "TIENDAS NETO",
    "LA MARINA", "SOLO UN PRECIO", "TONY TIENDAS", "PITICAS",
    "LA EUROPEA",
]

_CADENAS_COMIDA = [
    "MCDONALDS", "MCDONALD'S", "MC DONALDS",
    "BURGER KING", "WENDYS", "WENDY'S",
    "LITTLE CAESARS", "LITTLE CAESAR",
    "DOMINOS", "DOMINO'S", "DOMINOS PIZZA",
    "PIZZA HUT", "PAPA JOHNS", "PAPA JOHN'S",
    "SUBWAY", "KFC", "KENTUCKY FRIED",
    "STARBUCKS", "ITALIAN COFFEE", "CIELITO QUERIDO",
    "CARL'S JR", "CARLS JR",
    "POPEYES", "CHILIS", "CHILI'S",
    "APPLEBEES", "APPLEBEE'S", "IHOP",
    "VIPS", "SANBORNS", "WINGS",
    "PETER PIPER", "POLLO FELIZ", "POLLO LOCO",
    "BACHOCO", "POLLOS ASADOS NORTEÑOS",
    "TACOS INN", "POTZOLLCALLI",
    "LA TAQUERIA", "EL POLLO PEPE",
    "NUTRISA", "MOYO", "EL GLOBO",
    "ITALIANNIS", "OLIVE GARDEN", "WINGS ARMY", "BUFFALO WILD WINGS",
    "CINNABON", "KRISPY KREME", "BASKIN ROBBINS",
    "TOKS", "LA MICHOACANA",
]

_CADENAS_FARMACIA = [
    "FARMACIA SIMILARES", "FARMACIAS SIMILARES", "DR SIMI", "DOCTOR SIMI",
    "FARMACIA GUADALAJARA", "FARMACIAS GUADALAJARA",
    "FARMACIA BENAVIDES", "FARMACIAS BENAVIDES",
    "FARMACIA DEL AHORRO", "FARMACIAS DEL AHORRO",
    "FARMACIA SAN PABLO", "FARMACIAS SAN PABLO",
    "FARMACIA YZA", "FARMACIAS YZA",
    "GENERICO", "GENERICOS",
]

_CADENAS_BANCO = [
    "BBVA", "BANCOMER", "BANAMEX", "CITIBANAMEX",
    "BANORTE", "SANTANDER", "HSBC", "SCOTIABANK",
    "INBURSA", "BANCO AZTECA", "BANREGIO", "BANBAJIO",
    "INTERCAM", "MONEX", "AFIRME", "MULTIVA",
    "COMPARTAMOS", "BANKAOOL", "BANCOPPEL",
]

_CADENAS_GASOLINERA = [
    "PEMEX", "SHELL", "BP", "TOTAL ENERGIES", "MOBIL",
    "OXXO GAS", "G500", "GULF", "CHEVRON",
    "REDCO", "HIDROSINA",
]

_CADENAS_SERVICIOS = [
    "TELCEL", "TELMEX", "AT&T", "MOVISTAR", "MEGACABLE", "IZZI",
    "TOTALPLAY", "DISH", "UNEFON", "VIRGIN MOBILE",
    "DHL", "FEDEX", "ESTAFETA", "UPS", "REDPACK",
    "CINEPOLIS", "CINEMEX",
    "OFFICE DEPOT", "OFFICE MAX", "STAPLES", "LUMEN",
    "BEST BUY", "RADIOSHACK", "STEREN", "ISHOP", "ISHOP MIXUP", "MIXUP",
    "COSTCO", "SAMS",
    "AUTOZONE", "OREILYS", "O'REILLY", "GONHER",
    "TOYOTA", "NISSAN", "VOLKSWAGEN", "CHEVROLET", "FORD", "HONDA",
    "HYUNDAI", "KIA", "MAZDA", "SUZUKI", "RENAULT", "PEUGEOT",
    "MERCEDES BENZ", "BMW", "AUDI",
    "GOODYEAR", "BRIDGESTONE", "MICHELIN", "FIRESTONE",
    "INTERCERAMIC", "VITROMEX",
    "COMEX", "SHERWIN WILLIAMS", "BEREL",
    "CEMEX", "BIMBO", "LALA", "MARINELA",
    "DEVLYN", "OPTICAS LUX",
    "NIKE", "ADIDAS", "PUMA", "SKECHERS", "FLEXI",
    "HERTZ", "AVIS RENT", "EUROPCAR", "SIXT",
    # Hoteles de cadena
    "HOLIDAY INN", "FIESTA INN", "FIESTA AMERICANA",
    "HOTEL IBIS", "IBIS HOTEL", "HAMPTON INN", "HAMPTON BY HILTON",
    "MARRIOTT", "HILTON", "DOUBLETREE", "SHERATON",
    "HYATT", "WESTIN", "COURTYARD", "FOUR POINTS", "ALOFT",
    "HOTEL MISION", "HOTEL GAMMA", "CAMINO REAL",
    "RADISSON", "BEST WESTERN", "WYNDHAM", "DAYS INN",
    "FOUR SEASONS", "ST REGIS", "W HOTEL", "LE MERIDIEN",
    "NOVOTEL", "MERCURE", "SOFITEL",
    "WINPOT", "GOLDEN ISLAND CASINO", "PLAYCITY",   # Casinos
]

_CADENAS_LOGISTICA = [
    "AMAZON", "MERCADO LIBRE", "DHL", "FEDEX", "ESTAFETA", "UPS",
    "CEDIS",  # centro de distribución = siempre formal
]

_CADENAS_SALUD = [
    "HOSPITAL STAR MEDICA", "STAR MEDICA",
    "HOSPITAL ANGELES", "CLINICA DEL SUR",
    "SALUD DIGNA", "CHOPO", "LABORATORIOS AZTECA",
    "DIAGNOSTICO OPORTUNO",
]

# Compilar todas las cadenas normalizadas
CADENAS_FORMALES = set()
for lista in [_CADENAS_CONVENIENCIA, _CADENAS_YUCATAN, _CADENAS_SUPER_DEPTO,
              _CADENAS_COMIDA, _CADENAS_FARMACIA, _CADENAS_BANCO,
              _CADENAS_GASOLINERA, _CADENAS_SERVICIOS, _CADENAS_LOGISTICA,
              _CADENAS_SALUD]:
    for nombre in lista:
        CADENAS_FORMALES.add(normalizar(nombre))


def es_cadena_conocida(nombre_negocio: str) -> tuple[bool, str]:
    """
    Verifica si un nombre de negocio coincide con alguna cadena/franquicia.
    Usa matching flexible: el nombre normalizado del negocio debe CONTENER
    la cadena normalizada, o viceversa para nombres cortos.

    Returns: (es_cadena, nombre_cadena_match)
    """
    nombre_norm = normalizar(nombre_negocio)

    for cadena in CADENAS_FORMALES:
        # El nombre del negocio contiene la cadena
        if cadena in nombre_norm:
            return True, cadena
        # La cadena contiene el nombre (para nombres cortos como "PEMEX", "KFC")
        if len(cadena) <= 6 and nombre_norm in cadena:
            continue  # Evitar falsos positivos con nombres muy cortos
        # Matching por tokens: todas las palabras de la cadena están en el nombre
        tokens_cadena = set(cadena.split())
        tokens_nombre = set(nombre_norm.split())
        if len(tokens_cadena) >= 2 and tokens_cadena.issubset(tokens_nombre):
            return True, cadena

    return False, ""


# ═══════════════════════════════════════════════════════════════════════════════
# CAPA 1 bis: FILTRO POR NOMBRE — nombres que claramente no son negocios
# ═══════════════════════════════════════════════════════════════════════════════

PATRONES_NO_NEGOCIO = [
    # Educación
    r"\bPARQUE\b",          # parques públicos
    r"\bESCUELA\b",         # escuelas
    r"\bPRIMARIA\b",        # escuelas primarias
    r"\bSECUNDARIA\b",      # escuelas secundarias
    r"\bPREESCOLAR\b",
    r"\bKINDER\b",
    r"\bJARDIN DE NINOS\b",
    r"\bUNIVERSIDAD\b",
    r"\bFACULTAD\b",
    r"\bTECNOLOGICO\b",     # ITESM, UADY, IPN, etc.
    # Religión
    r"\bIGLESIA\b",
    r"\bTEMPLO\b",
    r"\bCAPILLA\b",
    r"\bCATEDRAL\b",
    r"\bPARROQUIA\b",
    r"\bPARROCHIA\b",
    # Gobierno / infraestructura
    r"\bCOMISARIA\b",       # comisarías municipales
    r"\bAYUNTAMIENTO\b",
    r"\bPRESIDENCIA MUNICIPAL\b",
    r"\bREGISTRO CIVIL\b",
    r"\bDELEGACION\b",
    # Salud pública (no privada)
    r"\bCEMENTERIO\b",
    r"\bPANTEON\b",
    r"\bHOSPITAL\b",        # hospitales grandes = formales
    r"\bCLINICA IMSS\b",
    r"\bCLINICA ISSSTE\b",
    r"\bUNIDAD MEDICA\b",
    r"\bCENTRO DE SALUD\b",
    r"\bCASA DE SALUD\b",
    # Educación técnica federal
    r"\bCBTA\b",
    r"\bCBTIS\b",
    r"\bCONALEP\b",
    r"\bCOBACH\b",
    r"\bCOBACHE\b",
    r"\bPREPARATORIA\b",
    r"\bBACHILLERES\b",
    r"\bSEMINARIO\b",
    r"\bCOLEGIO\b",
    r"\bINSTITUTO TECNOLOGICO\b",
    r"\bTELESECUNDARIA\b",
    # Deportes / espacios públicos
    r"\bCAMPO DE BEISBOL\b",
    r"\bCAMPO DE FUTBOL\b",
    r"\bCANCHA\b",
    r"\bESTADIO\b",
    r"\bALBERCA PUBLICA\b",
    r"\bUNIDAD DEPORTIVA\b",   # unidades deportivas municipales
    r"\bCOMPLEJO DEPORTIVO\b",
    r"\bPOLIFUNCIONAL\b",
    # Cultura / turismo / atracciones no comerciales
    r"\bBIBLIOTECA\b",
    r"\bMUSEO\b",
    r"\bRECINTO FERIAL\b",
    r"\bFERIA\b",
    r"\bPLAZA CIVICA\b",
    r"\bMONUMENTO\b",
    r"\bFUENTE\b",          # fuentes de plaza
    r"\bARCO\b",
    r"\bHACIENDA\b",        # haciendas históricas
    r"\bZONA ARQUEOLOGICA\b",
    r"\bARQUEOLOGICO\b",
    r"\bGLORIETA\b",        # glorietas viales
    r"\bRESERVA ECOLOGICA\b",
    r"\bZOOLOGICO\b",
    r"\bZOO\b",
    # Transporte público / infraestructura
    r"\bAEROPUERTO\b",
    r"\bTERMINAL AEREA\b",
    r"\bAIRPORT\b",
    r"\bTREN MAYA\b",
    r"\bESTACION DE TREN\b",
    r"\bESTACION DEL TREN\b",
    r"\bFRACCIONAMIENTO\b",
    r"\bRESIDENCIAL\b",
    r"\bESTACIONAMIENTO\b",
    r"\bPARADERO\b",
    r"\bTERMINAL DE AUTOBUSES\b",
    r"\bCAMINO REAL\b",     # vialidades, no el hotel
    r"\bTRAMO CARRETERA\b",
    # Quinteros / haciendas / ranchos sin negocio aparente
    r"\bQUINTA\b",          # quintas de eventos (se revisan por tipo también)
    # Inglés (Google Maps a veces usa en inglés)
    r"\bPARISH\b",
    r"\bCHURCH\b",
    r"\bCHAPEL\b",
    r"\bASSEMBLY HALL\b",
    r"\bFACULTY\b",
    r"\bECOLOGICAL PARK\b",
    r"\bNATIONAL PARK\b",
    r"\bTOWNSHIP\b",
    r"\bCOMMISSION BUILDING\b",
    r"\bARCHAEOLOGICAL ZONE\b",
    r"\bARCHAEOLOGICAL SITE\b",
    # Otros no-negocios
    r"\bACUAPARQUE\b",
    r"\bBIOPARQUE\b",
    r"\bPLAZA GRANDE\b",      # plaza central, no negocio
    r"\bCDU DEPORTES\b",
    r"\bDEPORTIVO UNIVERSITARIO\b",
    r"\bBRIDGE\b",            # puentes
    r"\bPUENTE\b",
    r"\bBRECHA\b",            # brechas / caminos rurales
    r"\bAGUADA\b",            # aguadas / estanques naturales
    r"\bPREDIO\b",            # predios / terrenos sin uso comercial
    r"\bLOTE\b",              # lotes baldios
]


def es_no_negocio_por_nombre(nombre: str) -> bool:
    """Detecta por nombre si el lugar claramente NO es un negocio."""
    nombre_norm = normalizar(nombre)
    for patron in PATRONES_NO_NEGOCIO:
        if re.search(patron, nombre_norm):
            return True
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# MATCHING FUZZY MEJORADO
# ═══════════════════════════════════════════════════════════════════════════════

def mejor_match_fuzzy(nombre_maps: str, nombre_denue: str) -> float:
    """
    Calcula similaridad entre nombres usando MÚLTIPLES estrategias
    y devuelve el mejor score.

    Estrategias:
      1. token_sort_ratio  — reordena tokens y compara
      2. token_set_ratio   — ignora tokens duplicados, compara intersección
      3. partial_ratio     — busca la mejor subcadena
      4. ratio simple      — Levenshtein clásico

    Todas se aplican sobre nombres normalizados (sin acentos, sin artículos).
    """
    n1 = normalizar(nombre_maps)
    n2 = normalizar(nombre_denue)

    if not n1 or not n2:
        return 0.0

    # Si uno contiene al otro completamente, es match seguro
    if n1 in n2 or n2 in n1:
        return 95.0

    scores = [
        fuzz.token_sort_ratio(n1, n2),
        fuzz.token_set_ratio(n1, n2),
        fuzz.partial_ratio(n1, n2),
        fuzz.ratio(n1, n2),
    ]

    return max(scores)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN: EJECUTAR CRUCE
# ═══════════════════════════════════════════════════════════════════════════════

# ── 1. CARGAR GOOGLE MAPS + OSM ──────────────────────────────────────────────
print("=" * 60)
print("CRUCE DE DATOS - DETECCION DE NEGOCIOS INFORMALES")
print("=" * 60)

# 1a. Google Maps (CSV con 27k registros)
print("\n[1/6] Cargando Google Maps CSV (gmaps_places_completo.csv)...")
df_gmaps_csv = pd.read_csv("data/data/gmaps_places_completo.csv", low_memory=False)
print(f"  {len(df_gmaps_csv)} filas totales en CSV")

places = []
for idx_csv, row in df_gmaps_csv.iterrows():
    name = str(row.get("name", "") or "").strip()
    lat = row.get("lat")
    lng = row.get("lng")
    status = str(row.get("status", "") or "").strip()
    addr = str(row.get("direccion", "") or "").strip()
    # tipos en el CSV usan '|' como separador
    tipos_raw = str(row.get("types", "") or "")
    tipos = ",".join(t.strip() for t in tipos_raw.split("|") if t.strip())

    if name and pd.notna(lat) and pd.notna(lng) and status == "OPERATIONAL":
        places.append({
            "place_id":    f"csv_{idx_csv}",
            "nombre_maps": name,
            "lat":         float(lat),
            "lng":         float(lng),
            "direccion":   addr,
            "tipos":       tipos,
            "fuente":      "google_maps",
        })

print(f"  {len(places)} negocios operativos de Google Maps")

# 1b. OpenStreetMap
OSM_FILE = "data/raw/osm_negocios.json"
import os
if os.path.exists(OSM_FILE):
    print("  Cargando OpenStreetMap negocios...")
    with open(OSM_FILE, encoding="utf-8") as f:
        osm_raw = json.load(f)

    # Mapeo de tipos OSM a tipos Google Maps equivalentes (para los filtros)
    OSM_TIPO_MAP = {
        "shop": "store", "amenity=restaurant": "restaurant",
        "amenity=cafe": "cafe", "amenity=bar": "bar",
        "amenity=fast_food": "meal_takeaway", "amenity=pharmacy": "pharmacy",
        "amenity=bank": "bank", "amenity=atm": "atm",
        "amenity=fuel": "gas_station", "amenity=car_wash": "car_wash",
        "amenity=clinic": "health", "amenity=dentist": "dentist",
        "amenity=doctors": "doctor", "amenity=veterinary": "veterinary_care",
        "amenity=laundry": "laundry", "amenity=dry_cleaning": "dry_cleaning",
        "office": "corporate_office", "craft": "manufacturer",
        "tourism=hotel": "lodging", "tourism=hostel": "lodging",
        "tourism=motel": "lodging", "tourism=guest_house": "lodging",
        "healthcare": "health",
        "leisure=fitness_centre": "gym", "leisure=sports_centre": "sports_complex",
    }

    # Deduplicar: si un negocio OSM esta a <30m de uno de Google Maps con
    # nombre similar, es duplicado
    gmaps_lats = np.array([p["lat"] for p in places])
    gmaps_lngs = np.array([p["lng"] for p in places])
    gmaps_names = [normalizar(p["nombre_maps"]) for p in places]

    osm_added = 0
    osm_dupes = 0
    for neg in osm_raw:
        lat_osm = neg["lat"]
        lng_osm = neg["lng"]
        nombre_osm = neg["nombre"]

        # Buscar duplicado cercano en Google Maps
        mask = (np.abs(gmaps_lats - lat_osm) < 0.0005) & (np.abs(gmaps_lngs - lng_osm) < 0.0005)
        es_dupe = False
        if mask.any():
            nombre_norm = normalizar(nombre_osm)
            for idx in np.where(mask)[0]:
                dist = haversine_m(lat_osm, lng_osm, gmaps_lats[idx], gmaps_lngs[idx])
                if dist <= 30:
                    score = fuzz.token_sort_ratio(nombre_norm, gmaps_names[idx])
                    if score >= 55:
                        es_dupe = True
                        break
        if es_dupe:
            osm_dupes += 1
            continue

        # Mapear tipo OSM a tipo Google Maps equivalente
        tipo_osm = neg.get("tipo_osm", "")
        tipo_key = tipo_osm.split("=")[0] if "=" in tipo_osm else tipo_osm
        tipo_mapped = OSM_TIPO_MAP.get(tipo_osm, OSM_TIPO_MAP.get(tipo_key, "store"))

        addr_parts = [neg.get("addr_street", ""), neg.get("addr_housenumber", "")]
        addr = " ".join(p for p in addr_parts if p).strip()

        places.append({
            "place_id":    f"osm_{neg['osm_type']}_{neg['osm_id']}",
            "nombre_maps": nombre_osm,
            "lat":         lat_osm,
            "lng":         lng_osm,
            "direccion":   addr,
            "tipos":       f"{tipo_mapped},point_of_interest,establishment",
            "fuente":      "osm",
        })
        osm_added += 1

    print(f"  {len(osm_raw)} negocios OSM cargados")
    print(f"  {osm_dupes} duplicados con Google Maps descartados")
    print(f"  {osm_added} negocios OSM nuevos agregados")
else:
    print("  [INFO] No hay datos OSM (ejecuta descargar_negocios_osm.py para mas cobertura)")

df_maps = pd.DataFrame(places)
print(f"  TOTAL COMBINADO: {len(df_maps)} negocios")


# ── 2. CARGAR DENUE ───────────────────────────────────────────────────────────
print("\n[2/6] Cargando DENUE...")
df_denue = pd.read_csv("data/procesado/denue_merida_limpio.csv", low_memory=False)
print(f"  {len(df_denue)} registros | columnas: {df_denue.columns.tolist()[:8]}")

# Detectar columnas automáticamente
name_col = next((c for c in df_denue.columns
                 if "nom_estab" in c.lower() or ("nombre" in c.lower() and "estab" in c.lower())), None)
lat_col = next((c for c in df_denue.columns if "latitud" in c.lower() or c.lower() == "lat"), None)
lng_col = next((c for c in df_denue.columns if "longitud" in c.lower() or c.lower() in ("lon", "lng")), None)

# Columnas extra de DENUE para enriquecer el resultado
razon_col = next((c for c in df_denue.columns if "raz_social" in c.lower()), None)
activ_col = next((c for c in df_denue.columns if "nombre_act" in c.lower()), None)
colon_col = next((c for c in df_denue.columns if "nomb_asent" in c.lower()), None)

if not all([name_col, lat_col, lng_col]):
    print(f"ERROR: no encuentro columnas. Columnas disponibles: {df_denue.columns.tolist()}")
    raise SystemExit(1)

print(f"  Columnas detectadas: nombre={name_col} | lat={lat_col} | lng={lng_col}")

# Preparar array de DENUE para búsqueda rápida
cols_denue = [name_col, lat_col, lng_col]
if razon_col: cols_denue.append(razon_col)
if activ_col: cols_denue.append(activ_col)
if colon_col: cols_denue.append(colon_col)

df_d = df_denue[cols_denue].dropna(subset=[name_col, lat_col, lng_col]).copy()
rename_map = {name_col: "nombre_denue", lat_col: "lat", lng_col: "lng"}
if razon_col: rename_map[razon_col] = "razon_social"
if activ_col: rename_map[activ_col] = "actividad"
if colon_col: rename_map[colon_col] = "colonia"
df_d = df_d.rename(columns=rename_map)

df_d["nombre_denue"] = df_d["nombre_denue"].astype(str).str.strip()
df_d = df_d[(df_d["lat"] != 0) & (df_d["lng"] != 0)]

denue_lat = df_d["lat"].values
denue_lng = df_d["lng"].values
denue_nom = df_d["nombre_denue"].values
denue_nom_norm = np.array([normalizar(n) for n in denue_nom])
denue_razon = df_d["razon_social"].values if "razon_social" in df_d.columns else np.array([""] * len(df_d))
denue_activ = df_d["actividad"].values if "actividad" in df_d.columns else np.array([""] * len(df_d))
denue_colon = df_d["colonia"].values if "colonia" in df_d.columns else np.array([""] * len(df_d))
print(f"  {len(df_d)} registros DENUE con coordenadas válidas")


# ── 3. APLICAR CAPA 1: FILTRO DE TIPOS NO-NEGOCIO ────────────────────────────
print("\n[3/6] Aplicando filtros de calidad...")

stats = {"total": len(df_maps), "excl_tipo": 0, "excl_nombre": 0,
         "formal_cadena": 0, "formal_tipo_gmaps": 0,
         "formal_denue": 0, "informal": 0}


def clasificar_por_tipos(tipos_str: str) -> str:
    """
    Clasifica un lugar según sus tipos de Google Maps.
    Returns: 'excluir', 'formal', o 'analizar'
    """
    tipos = set(t.strip() for t in str(tipos_str).split(","))

    # Tipos genéricos que no aportan info
    tipos_genericos = {"point_of_interest", "establishment", "service"}
    tipos_relevantes = tipos - tipos_genericos

    # Tipos que indican que ES un negocio comercial (prevalecen sobre no-negocio)
    tipos_negocio_real = {
        "store", "restaurant", "food", "cafe", "bakery", "bar", "night_club",
        "gym", "fitness_center", "spa", "beauty_salon", "hair_care",
        "laundry", "dry_cleaning", "car_repair", "car_wash",
        "pharmacy", "doctor", "dentist", "veterinary_care",
        "convenience_store", "supermarket", "grocery_store", "food_store",
        "clothing_store", "shoe_store", "jewelry_store", "electronics_store",
        "hardware_store", "home_goods_store", "furniture_store", "book_store",
        "pet_store", "florist", "shopping_mall", "department_store",
        "lodging", "hotel", "motel", "hostel",
        "real_estate_agency", "travel_agency", "insurance_agency",
        "accounting", "lawyer", "consultant",
        "gas_station", "bank", "atm",
        "meal_takeaway", "meal_delivery", "pizza_restaurant",
        "fast_food_restaurant", "coffee_shop",
        "wholesaler", "manufacturer",
        "building_materials_store",
    }

    # Si tiene tipos que implican formalidad regulada
    if tipos_relevantes & TIPOS_SIEMPRE_FORMALES:
        return "formal"

    # Tipos que fuerzan exclusión INCLUSO si hay otros tipos presentes
    # (excepto si también tiene un tipo de negocio real)
    tipos_fuerza_excluir = {
        "park", "city_park", "national_park", "state_park", "dog_park",
        "church", "mosque", "synagogue", "hindu_temple", "place_of_worship",
        "university", "academic_department",
        "cemetery", "funeral_home",
        "museum", "art_gallery",
        "bridge",
        "national_forest", "nature_preserve", "wildlife_refuge", "wildlife_park",
        "historical_landmark", "historical_place",
        "school", "primary_school", "secondary_school", "preschool",
        "kindergarten", "educational_institution",
        # Gobierno — si su tipo principal es gobierno, no es negocio informal
        "government_office", "local_government_office",
        "city_hall", "courthouse", "embassy", "fire_station",
        "police", "police_station", "post_office",
        # Transporte público — paradas de bus que GMaps etiqueta como negocios
        "transit_station", "transit_stop", "bus_stop", "bus_station",
        "train_station", "subway_station", "light_rail_station",
        # Asociaciones / ONGs: iglesias, clubs, asociaciones sin giro comercial
        # (se excluyen solo si NO tienen ningún tipo de negocio real)
        "association_or_organization",
        # Atracciones turísticas sin actividad comercial
        # (se excluyen solo si NO tienen ningún tipo de negocio real)
        "tourist_attraction",
    }

    tiene_no_negocio = bool(tipos_relevantes & tipos_fuerza_excluir)
    tiene_negocio_real = bool(tipos_relevantes & tipos_negocio_real)

    # Si tiene tipo no-negocio Y NO tiene tipo de negocio real → excluir
    if tiene_no_negocio and not tiene_negocio_real:
        return "excluir"

    # Si solo tiene tipos no-negocio suaves (housing, parking, etc.)
    tipos_no_negocio_suave = {
        "housing_complex", "condominium_complex", "apartment_complex",
        "apartment_building",
        "parking", "parking_lot", "parking_garage",
        "transit_station", "transit_stop", "bus_stop", "bus_station",
        "train_station", "subway_station",
        "airport", "light_rail_station",
        "local_government_office", "government_office",
        "city_hall", "courthouse", "embassy", "fire_station",
        "police", "police_station", "post_office",
        "playground",
    }
    if tipos_relevantes and tipos_relevantes.issubset(
            tipos_no_negocio_suave | {"tourist_attraction", "garden"}):
        return "excluir"

    return "analizar"


# ── 4. CRUCE PRINCIPAL ────────────────────────────────────────────────────────
RADIO_M = 100     # metros — ampliado de 50 a 100 para no perder matches legítimos
FUZZY_MIN = 65    # bajado de 72 a 65 porque ahora normalizamos mejor

print(f"\n[4/6] Cruzando {len(df_maps)} negocios Maps vs {len(df_d)} DENUE...")
print(f"  Radio espacial: {RADIO_M}m  |  Fuzzy mínimo: {FUZZY_MIN}")
print(f"  Cadenas conocidas: {len(CADENAS_FORMALES)}")
print(f"  Tipos no-negocio: {len(TIPOS_NO_NEGOCIO)}")
print(f"  Instituciones formales obvias: {len(_INST_PUBLICAS_NORM)}")

resultados = []
for i, row in df_maps.iterrows():
    if i > 0 and i % 300 == 0:
        pct = i / len(df_maps) * 100
        print(f"  {i}/{len(df_maps)}  ({pct:.0f}%)")

    nombre_maps = row["nombre_maps"]
    tipos_str = row["tipos"]
    decision = "analizar"
    razon = ""
    es_informal = None  # None = pendiente

    # ── CAPA 0: Pre-filtro — Institución pública/corporativa obvia por nombre ──
    # Se aplica ANTES que cualquier otra capa para evitar que instituciones
    # como CFE, IMSS, ISSSTE, INFONAVIT, etc. lleguen al cruce.
    if es_informal is None:
        es_inst, razon_inst = es_institucion_formal_obvia(nombre_maps)
        if es_inst:
            es_informal = False
            decision = "formal_institucion"
            razon = razon_inst
            stats.setdefault("formal_institucion", 0)
            stats["formal_institucion"] += 1

    # ── CAPA 1a: Filtrar por tipo de Google Maps ──
    if es_informal is None:
        clasif_tipo = clasificar_por_tipos(tipos_str)
        if clasif_tipo == "excluir":
            es_informal = False
            decision = "excluido_tipo"
            razon = "No es negocio (tipo Google Maps)"
            stats["excl_tipo"] += 1
        elif clasif_tipo == "formal":
            es_informal = False
            decision = "formal_tipo_gmaps"
            razon = "Tipo regulado (banco/gasolinera/super/hospital/casino)"
            stats["formal_tipo_gmaps"] += 1

    # ── CAPA 1b: Filtrar por nombre claramente no-negocio ──
    if es_informal is None and es_no_negocio_por_nombre(nombre_maps):
        es_informal = False
        decision = "excluido_nombre"
        razon = "No es negocio (nombre detectado)"
        stats["excl_nombre"] += 1

    # ── CAPA 2: Detección de cadena/franquicia ──
    cadena_match = ""
    if es_informal is None:
        es_cadena, cadena_match = es_cadena_conocida(nombre_maps)
        if es_cadena:
            es_informal = False
            decision = "formal_cadena"
            razon = f"Cadena conocida: {cadena_match}"
            stats["formal_cadena"] += 1

    # ── CAPA 3: Cruce fuzzy contra DENUE ──
    mejor_score = 0
    mejor_nombre_denue = ""
    mejor_razon_denue = ""
    mejor_activ_denue = ""
    mejor_colon_denue = ""
    dist_match = 9999.0

    # Siempre buscar en DENUE (incluso si ya se clasificó) para enriquecer datos
    mask = (np.abs(denue_lat - row["lat"]) < 0.01) & (np.abs(denue_lng - row["lng"]) < 0.01)
    idx_cercanos = np.where(mask)[0]

    for idx in idx_cercanos:
        dist = haversine_m(row["lat"], row["lng"], denue_lat[idx], denue_lng[idx])
        if dist <= RADIO_M:
            score = mejor_match_fuzzy(nombre_maps, denue_nom[idx])
            if score > mejor_score:
                mejor_score = score
                mejor_nombre_denue = denue_nom[idx]
                mejor_razon_denue = str(denue_razon[idx]) if str(denue_razon[idx]) != "nan" else ""
                mejor_activ_denue = str(denue_activ[idx]) if str(denue_activ[idx]) != "nan" else ""
                mejor_colon_denue = str(denue_colon[idx]) if str(denue_colon[idx]) != "nan" else ""
                dist_match = round(dist, 1)

    match_denue = mejor_score >= FUZZY_MIN

    if es_informal is None:
        if match_denue:
            es_informal = False
            decision = "formal_denue"
            razon = f"Match DENUE: {mejor_nombre_denue} (score={mejor_score:.0f}, dist={dist_match}m)"
            stats["formal_denue"] += 1
        else:
            es_informal = True
            decision = "informal"
            razon = "Sin match en ninguna capa"
            stats["informal"] += 1

    resultados.append({
        "place_id":      row["place_id"],
        "nombre":        nombre_maps,
        "lat":           row["lat"],
        "lng":           row["lng"],
        "direccion":     row["direccion"],
        "tipos":         tipos_str,
        "match_denue":   match_denue,
        "nombre_denue":  mejor_nombre_denue,
        "razon_denue":   mejor_razon_denue,
        "actividad_denue": mejor_activ_denue,
        "colonia_denue": mejor_colon_denue,
        "fuzzy_score":   round(mejor_score, 1),
        "distancia_m":   dist_match,
        "es_informal":   es_informal,
        "decision_fuente": decision,
        "cadena_detectada": cadena_match,
        "razon_decision": razon,
        "fuente":        row.get("fuente", "google_maps"),
    })


# ── 5. RESULTADOS ─────────────────────────────────────────────────────────────
df_res = pd.DataFrame(resultados)
df_inf = df_res[df_res["es_informal"] == True].copy()
df_for = df_res[df_res["es_informal"] == False].copy()

print(f"\n{'=' * 60}")
print("RESULTADO DEL CRUCE")
print(f"{'=' * 60}")
print(f"Total analizados:                {stats['total']:>6,}")
print(f"  Formal (institución pública):  {stats.get('formal_institucion', 0):>6,}")
print(f"  Excluidos (tipo no-negocio):   {stats['excl_tipo']:>6,}")
print(f"  Excluidos (nombre no-negocio): {stats['excl_nombre']:>6,}")
print(f"  Formal (cadena/franquicia):    {stats['formal_cadena']:>6,}")
print(f"  Formal (tipo GMaps regulado):  {stats['formal_tipo_gmaps']:>6,}")
print(f"  Formal (match DENUE):          {stats['formal_denue']:>6,}")
print(f"  -------------------------------------")
print(f"  INFORMALES CONFIRMADOS:        {stats['informal']:>6,}  "
      f"({stats['informal'] / stats['total'] * 100:.1f}%)")
print(f"{'=' * 60}")

# Verificación: mostrar los informales más "sospechosos" para revisión
print("\nVERIFICACION - Top 20 informales (revisar que sean realmente informales):")
cols_show = ["nombre", "tipos", "fuzzy_score", "nombre_denue"]
cols_show = [c for c in cols_show if c in df_inf.columns]
print(df_inf[cols_show].head(20).to_string(index=False))

# Distribución de tipos en informales
print("\nTipos Google Maps en informales confirmados:")
tipos_inf = df_inf["tipos"].dropna().str.split(",").explode().str.strip()
tipos_inf = tipos_inf[~tipos_inf.isin(["point_of_interest", "establishment", "service"])]
print(tipos_inf.value_counts().head(15).to_string())


# ── 6. GUARDAR ─────────────────────────────────────────────────────────────────
print(f"\n[6/6] Guardando resultados...")

df_inf.to_csv("data/procesado/candidatos_informales.csv", index=False, encoding="utf-8")
df_res.to_csv("data/procesado/cruce_completo.csv", index=False, encoding="utf-8")

conn = sqlite3.connect("data/procesado/negocios.db")
df_inf.to_sql("candidatos", conn, if_exists="replace", index=False)
df_for.to_sql("formales", conn, if_exists="replace", index=False)
conn.close()

print(f"  data/procesado/candidatos_informales.csv  ({len(df_inf)} registros)")
print(f"  data/procesado/cruce_completo.csv          ({len(df_res)} registros)")
print(f"  data/procesado/negocios.db")

# Resumen de decisiones
print(f"\nDesglose de decisiones:")
print(df_res["decision_fuente"].value_counts().to_string())

print(f"\nSiguiente: python app.py")
