# features/ — el "grito" del dominio

Cada carpeta es una capacidad de negocio autocontenida. Se crean en su fase del plan:

| Feature           | Contenido                                  | Fase |
| ----------------- | ------------------------------------------ | ---- |
| `auth/`           | login · sesión · roles                     | 1    |
| `candidatos/`     | mapa · lista · filtros DENUE               | 3    |
| `reportes/`       | visita · GPS · foto                        | 4    |
| `rutas/`          | optimización de recorrido                  | 4    |
| `colonias-zonas/` | AGEBs · colonias · geojson                 | 4    |
| `campanas/`       | campañas · plantillas · checklist          | 5    |
| `predicciones/`   | modelo · calculadora índice                | 6    |
| `admin/`          | usuarios · asignación de rol               | 6    |

## Anatomía de una feature

```
features/<nombre>/
├─ api/         hooks de TanStack Query (queries + mutations)
├─ components/  componentes propios de la feature
├─ hooks/       lógica de UI reutilizable dentro de la feature
├─ model/       tipos + esquemas Zod + mappers
├─ routes/      elemento de ruta + loader/guard
└─ index.ts     ÚNICA superficie pública (ESLint lo exige)
```

## Reglas (las aplica `eslint.config.js`)

- Una feature importa de `@shared` y `@core`, y de su propio interior con rutas relativas cortas.
- Otra feature solo se consume vía `@features/<x>` (su `index.ts`), nunca sus archivos internos.
- Prohibido importar desde `@app`.
