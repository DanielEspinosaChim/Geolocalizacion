"""
Test de filtros pre-cruce sobre el dataset Google Maps.
Reproduce la logica de cruce.py de forma autonoma para validacion rapida.
"""
import pandas as pd, re, unicodedata, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ══════════════════════════════════════════════════════
# Copiar las definiciones de cruce.py que necesitamos
# ══════════════════════════════════════════════════════

def quitar_acentos(texto):
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def normalizar(texto):
    t = str(texto).upper().strip()
    t = quitar_acentos(t)
    t = re.sub(r"[^\w\s&]", " ", t)
    t = re.sub(r"\b(EL|LA|LOS|LAS|DE|DEL|EN|Y|E|SA|CV|S\.A\.|C\.V\.|S DE RL|SAPI)\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

TIPOS_SIEMPRE_FORMALES = {
    "bank", "atm", "gas_station", "hospital", "medical_center",
    "supermarket", "department_store", "shopping_mall",
    "movie_theater", "cinema", "airport", "insurance_agency",
    "casino", "car_dealership", "resort_hotel",
    "amusement_park", "water_park", "stadium",
}

TIPOS_FUERZA_EXCLUIR = {
    "park", "city_park", "national_park", "state_park", "dog_park",
    "church", "mosque", "synagogue", "hindu_temple", "place_of_worship",
    "university", "academic_department",
    "cemetery", "funeral_home",
    "museum", "art_gallery", "bridge",
    "national_forest", "nature_preserve", "wildlife_refuge", "wildlife_park",
    "historical_landmark", "historical_place",
    "school", "primary_school", "secondary_school", "preschool",
    "kindergarten", "educational_institution",
    "government_office", "local_government_office",
    "city_hall", "courthouse", "embassy", "fire_station",
    "police", "police_station", "post_office",
    "transit_station", "transit_stop", "bus_stop", "bus_station",
    "train_station", "subway_station", "light_rail_station",
    "association_or_organization",
    "tourist_attraction",
}

TIPOS_NEGOCIO_REAL = {
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
    "wholesaler", "manufacturer", "building_materials_store",
}

TIPOS_NO_NEGOCIO_SUAVE = {
    "housing_complex", "condominium_complex", "apartment_complex", "apartment_building",
    "parking", "parking_lot", "parking_garage",
    "transit_station", "transit_stop", "bus_stop", "bus_station",
    "train_station", "subway_station", "airport", "light_rail_station",
    "local_government_office", "government_office",
    "city_hall", "courthouse", "embassy", "fire_station",
    "police", "police_station", "post_office", "playground",
}

TIPOS_GENERICOS = {"point_of_interest", "establishment", "service"}

def clasificar_tipos(tipos_str):
    tipos = set(t.strip() for t in str(tipos_str).replace("|",",").split(","))
    tipos_rel = tipos - TIPOS_GENERICOS
    if tipos_rel & TIPOS_SIEMPRE_FORMALES:
        return "formal"
    tiene_excluir = bool(tipos_rel & TIPOS_FUERZA_EXCLUIR)
    tiene_negocio = bool(tipos_rel & TIPOS_NEGOCIO_REAL)
    if tiene_excluir and not tiene_negocio:
        return "excluir"
    if tipos_rel and tipos_rel.issubset(TIPOS_NO_NEGOCIO_SUAVE | {"tourist_attraction", "garden"}):
        return "excluir"
    return "analizar"

# Instituciones publicas obvias
_INST = [
    "CFE","COMISION FEDERAL DE ELECTRICIDAD","PEMEX","PETROLEOS MEXICANOS",
    "JAPAY","JUNTA DE AGUA","SISTEMA DE AGUA","SIMAS","SAPAM",
    "IMSS","ISSSTE","INSABI","IMSS BIENESTAR","SEGURO POPULAR",
    "UNIDAD MEDICA","CLINICA IMSS","CLINICA ISSSTE","UMF ",
    "HOSPITAL GENERAL","HOSPITAL REGIONAL","HOSPITAL CIVIL",
    "CENTRO DE SALUD","CASA DE SALUD",
    "INFONAVIT","FOVISSSTE","SHF","FONHAPO",
    "SEP ","CONAFE","INEA","CBTIS","CBTA","CONALEP","COBACH",
    "PREPARATORIA FEDERAL","BACHILLERES","TELESECUNDARIA",
    "INSTITUTO TECNOLOGICO","TECNOLOGICO NACIONAL",
    "UNIVERSIDAD AUTONOMA","UADY","UNAM","IPN",
    "AYUNTAMIENTO","PRESIDENCIA MUNICIPAL","COMISARIA MUNICIPAL",
    "DELEGACION","SUBDELEGACION","REGISTRO CIVIL",
    "SAT ","SERVICIO DE ADMINISTRACION TRIBUTARIA",
    "INEGI","CONAFOR","SEMARNAT","PROFEPA","CONAGUA","SAGARPA","SADER",
    "SEDENA","SEMAR","PGR","FGR","FISCALIA",
    "POLICIA MUNICIPAL","POLICIA ESTATAL","POLICIA FEDERAL",
    "BANOBRAS","NAFINSA","BANJERCITO","BANSEFI","BIENESTAR",
    "LICONSA","DICONSA","MICROSOFT","GOOGLE",
]
_INST_NORM = [normalizar(n) for n in _INST]

def es_institucion(nombre):
    nn = normalizar(nombre)
    for inst in _INST_NORM:
        if inst in nn:
            return True
    return False

# Patrones de nombre no-negocio
PATRONES = [
    r"\bPARQUE\b", r"\bESCUELA\b", r"\bPRIMARIA\b", r"\bSECUNDARIA\b",
    r"\bPREESCOLAR\b", r"\bKINDER\b", r"\bUNIVERSIDAD\b", r"\bFACULTAD\b",
    r"\bTECNOLOGICO\b", r"\bIGLESIA\b", r"\bTEMPLO\b", r"\bCAPILLA\b",
    r"\bCATEDRAL\b", r"\bPARROQUIA\b", r"\bCOMISARIA\b", r"\bAYUNTAMIENTO\b",
    r"\bPRESIDENCIA MUNICIPAL\b", r"\bREGISTRO CIVIL\b", r"\bDELEGACION\b",
    r"\bCEMENTERIO\b", r"\bPANTEON\b", r"\bHOSPITAL\b", r"\bCLINICA IMSS\b",
    r"\bCLINICA ISSSTE\b", r"\bUNIDAD MEDICA\b", r"\bCENTRO DE SALUD\b",
    r"\bCASA DE SALUD\b", r"\bCBTA\b", r"\bCBTIS\b", r"\bCONALEP\b",
    r"\bCOBACH\b", r"\bCOBACHE\b", r"\bPREPARATORIA\b", r"\bBACHILLERES\b",
    r"\bSEMINARIO\b", r"\bCOLEGIO\b", r"\bINSTITUTO TECNOLOGICO\b",
    r"\bTELESECUNDARIA\b", r"\bCAMPO DE BEISBOL\b", r"\bCAMPO DE FUTBOL\b",
    r"\bCANCHA\b", r"\bESTADIO\b", r"\bALBERCA PUBLICA\b",
    r"\bUNIDAD DEPORTIVA\b", r"\bCOMPLEJO DEPORTIVO\b", r"\bPOLIFUNCIONAL\b",
    r"\bBIBLIOTECA\b", r"\bMUSEO\b", r"\bRECINTO FERIAL\b", r"\bFERIA\b",
    r"\bPLAZA CIVICA\b", r"\bMONUMENTO\b", r"\bFUENTE\b", r"\bARCO\b",
    r"\bHACIENDA\b", r"\bZONA ARQUEOLOGICA\b", r"\bARQUEOLOGICO\b",
    r"\bGLORIETA\b", r"\bRESERVA ECOLOGICA\b", r"\bZOOLOGICO\b", r"\bZOO\b",
    r"\bAEROPUERTO\b", r"\bTERMINAL AEREA\b", r"\bAIRPORT\b",
    r"\bTREN MAYA\b", r"\bESTACION DE TREN\b", r"\bESTACION DEL TREN\b",
    r"\bFRACCIONAMIENTO\b", r"\bRESIDENCIAL\b", r"\bESTACIONAMIENTO\b",
    r"\bPARADERO\b", r"\bTERMINAL DE AUTOBUSES\b", r"\bTRAMO CARRETERA\b",
    r"\bQUINTA\b", r"\bPARISH\b", r"\bCHURCH\b", r"\bCHAPEL\b",
    r"\bASSEMBLY HALL\b", r"\bFACULTY\b", r"\bECOLOGICAL PARK\b",
    r"\bNATIONAL PARK\b", r"\bTOWNSHIP\b", r"\bCOMMISSION BUILDING\b",
    r"\bARCHAEOLOGICAL ZONE\b", r"\bARCHAEOLOGICAL SITE\b",
    r"\bACUAPARQUE\b", r"\bBIOPARQUE\b", r"\bPLAZA GRANDE\b",
    r"\bDEPORTIVO UNIVERSITARIO\b", r"\bBRIDGE\b", r"\bPUENTE\b",
    r"\bBRECHA\b", r"\bAGUADA\b", r"\bPREDIO\b", r"\bLOTE\b",
]

def es_nombre_no_negocio(nombre):
    nn = normalizar(nombre)
    return any(re.search(p, nn) for p in PATRONES)

# Cadenas formales simplificadas
_CADENAS = [
    "OXXO","7 ELEVEN","CIRCLE K","MODELORAMA","WALMART","AURRERA","SORIANA",
    "CHEDRAUI","COSTCO","HEB","LIVERPOOL","COPPEL","ELEKTRA","HOME DEPOT",
    "ZARA","H&M","MINISO","WALDOS","MCDONALDS","BURGER KING","LITTLE CAESARS",
    "DOMINOS","PIZZA HUT","SUBWAY","KFC","STARBUCKS","ITALIAN COFFEE",
    "VIPS","SANBORNS","FARMACIA GUADALAJARA","FARMACIAS SIMILARES","DR SIMI",
    "BENAVIDES","FARMACIA DEL AHORRO","FARMACIA YZA",
    "BBVA","BANCOMER","BANAMEX","BANORTE","SANTANDER","HSBC","SCOTIABANK",
    "BANCO AZTECA","COMPARTAMOS",
    "PEMEX","SHELL","OXXO GAS","G500","HIDROSINA",
    "TELCEL","TELMEX","MOVISTAR","MEGACABLE","IZZI","CINEPOLIS","CINEMEX",
    "OFFICE DEPOT","BEST BUY","AUTOZONE","TOYOTA","NISSAN","VOLKSWAGEN",
    "HONDA","FORD","CHEVROLET","HYUNDAI","KIA","GOODYEAR","BRIDGESTONE",
    "COMEX","SHERWIN WILLIAMS","BIMBO","LALA","NIKE","ADIDAS","SKECHERS",
    "HOLIDAY INN","FIESTA INN","HAMPTON INN","MARRIOTT","HILTON","HYATT",
    "WESTIN","COURTYARD","RADISSON","BEST WESTERN","WYNDHAM","DOUBLETREE",
    "FOUR SEASONS","NOVOTEL","SOFITEL","MERCURE",
    "WINPOT","GOLDEN ISLAND CASINO","PLAYCITY",
    "DHL","FEDEX","ESTAFETA","UPS","AMAZON","MERCADO LIBRE","CEDIS",
]
_CADENAS_NORM = [normalizar(c) for c in _CADENAS]

def es_cadena(nombre):
    nn = normalizar(nombre)
    for c in _CADENAS_NORM:
        if c in nn:
            return True
        tokens_c = set(c.split())
        tokens_n = set(nn.split())
        if len(tokens_c) >= 2 and tokens_c.issubset(tokens_n):
            return True
    return False

# ══════════════════════════════════════════════════════
# Correr sobre el dataset
# ══════════════════════════════════════════════════════
df = pd.read_csv('data/data/gmaps_places_completo.csv', low_memory=False)
df = df[df['status']=='OPERATIONAL'].copy()
total = len(df)
print(f"Total OPERATIVOS: {total:,}\n")

stats = {'inst':0, 'excl_tipo':0, 'formal_tipo':0, 'excl_nombre':0, 'cadena':0, 'pasa':0}
pasan = []

for _, row in df.iterrows():
    nombre = str(row.get('name','') or '')
    tipos  = str(row.get('types','') or '')
    dec = None

    if es_institucion(nombre):
        stats['inst'] += 1; dec = 'inst'

    if not dec:
        ct = clasificar_tipos(tipos)
        if ct == 'excluir':
            stats['excl_tipo'] += 1; dec = 'excl'
        elif ct == 'formal':
            stats['formal_tipo'] += 1; dec = 'formal'

    if not dec and es_nombre_no_negocio(nombre):
        stats['excl_nombre'] += 1; dec = 'excl'

    if not dec and es_cadena(nombre):
        stats['cadena'] += 1; dec = 'cadena'

    if not dec:
        stats['pasa'] += 1
        if len(pasan) < 40:
            pasan.append({'nombre': nombre, 'tipos': tipos[:80]})

print("=" * 65)
print("RESULTADO DE FILTROS PRE-CRUCE")
print("=" * 65)
print(f"  Capa 0 - Institucion publica obvia:    {stats['inst']:>6,}")
print(f"  Capa 1a - Excluido por tipo GMaps:     {stats['excl_tipo']:>6,}")
print(f"  Capa 1a - Formal por tipo regulado:    {stats['formal_tipo']:>6,}")
print(f"  Capa 1b - Excluido por nombre:         {stats['excl_nombre']:>6,}")
print(f"  Capa 2  - Cadena/franquicia formal:    {stats['cadena']:>6,}")
fil = total - stats['pasa']
print(f"  -------------------------------------------------")
print(f"  TOTAL FILTRADOS ANTES DEL CRUCE:       {fil:>6,}  ({fil/total*100:.1f}%)")
print(f"  PASAN AL CRUCE DENUE (cuestionables):  {stats['pasa']:>6,}  ({stats['pasa']/total*100:.1f}%)")

print()
print("=" * 65)
print("MUESTRA DE LOS QUE PASAN (deben ser negocios cuestionables):")
print("=" * 65)
for e in pasan:
    print(f"  {e['nombre'][:55]:55s} | {e['tipos'][:70]}")
