# shared/ — reutilizable y agnóstico al dominio

Si un módulo menciona "campaña", "candidato" o "reporte", NO va aquí: va en su feature.

```
shared/
├─ ui/      design system: Button, Modal, Tabs, Badge, Field, Toast… (Fase 2)
├─ hooks/   useDebounce, useMediaQuery, useDisclosure…
├─ lib/     helpers de mapa (Leaflet), fechas, formato
└─ types/   tipos utilitarios compartidos
```

Reglas: `shared` solo importa de `shared` y `core` (lo aplica `eslint.config.js`).
