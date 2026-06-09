"""
Auditoria de categorias ambiguas para decidir si deben excluirse del cruce.
"""
import pandas as pd, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

df = pd.read_csv('data/data/gmaps_places_completo.csv', low_memory=False)
df = df[df['status']=='OPERATIONAL'].copy()

categorias = {
    'lodging':                  'Hospedaje / Hoteles',
    'transportation_service':   'Servicios de transporte',
    'association_or_organization': 'Asociaciones / ONGs',
    'corporate_office':         'Oficinas corporativas',
    'general_contractor':       'Constructoras',
    'tourist_attraction':       'Atracciones turisticas',
    'sports_complex':           'Complejos deportivos',
    'wholesaler':               'Mayoristas',
}

for tipo, label in categorias.items():
    mask = df['types'].fillna('').str.contains(tipo, case=False)
    subset = df[mask][['name','types']].head(20)
    print(f"\n{'='*60}")
    print(f"{label} ({tipo}) — {mask.sum()} total — muestra de 20:")
    print(f"{'='*60}")
    for _, r in subset.iterrows():
        nombre = str(r['name'])[:55]
        tipos  = str(r['types'])[:70]
        print(f"  {nombre:55s} | {tipos}")
