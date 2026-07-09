import json, os

ruta = r'data\raw\gmaps_places.json'
with open(ruta, encoding='utf-8') as f:
    data = json.load(f)

print(f'Total places en cache: {len(data):,}')

items = list(data.items())[:3]
for pid, p in items:
    print(f'\n  name: {p.get("name","")}')
    print(f'  lat/lng: {p.get("lat")}, {p.get("lng")}')
    print(f'  types: {p.get("types",[])}')
    print(f'  rating: {p.get("rating")} | reviews: {p.get("reviews")}')

lats = [p['lat'] for p in data.values() if p.get('lat')]
lngs = [p['lng'] for p in data.values() if p.get('lng')]
print(f'\nRango lat: {min(lats):.4f} - {max(lats):.4f}')
print(f'Rango lng: {min(lngs):.4f} - {max(lngs):.4f}')

con_rating = sum(1 for p in data.values() if p.get('rating'))
sin_rating = len(data) - con_rating
print(f'\nCon rating: {con_rating:,} ({con_rating/len(data)*100:.1f}%)')
print(f'Sin rating: {sin_rating:,} ({sin_rating/len(data)*100:.1f}%)')

# Tamaño del archivo
size_mb = os.path.getsize(ruta) / 1024 / 1024
print(f'\nTamaño archivo: {size_mb:.1f} MB')

# Revisar si hay features_gmaps ya calculados
feat_ruta = r'data\procesado\features_gmaps.csv'
if os.path.exists(feat_ruta):
    print(f'\nfeatures_gmaps.csv: YA EXISTE ({os.path.getsize(feat_ruta)/1024:.0f} KB)')
else:
    print(f'\nfeatures_gmaps.csv: NO EXISTE (hay que calcularlo)')
