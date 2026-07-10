# Graph Report - frontend  (2026-07-09)

## Corpus Check
- 209 files · ~41,344 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 824 nodes · 1596 edges · 42 communities (35 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9b7b7314`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `Candidato` - 23 edges
2. `compilerOptions` - 21 edges
3. `NegocioCampana` - 17 edges
4. `compilerOptions` - 12 edges
5. `getFirebaseAuth()` - 10 edges
6. `Tipo` - 10 edges
7. `tipoDe()` - 10 edges
8. `giroLabel()` - 10 edges
9. `scripts` - 9 edges
10. `CapaId` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Fila()` --calls--> `giroLabel()`  [INFERRED]
  src/features/campanas/components/AgregarNegocios.tsx → src/features/candidatos/model/giros.ts
- `requireAuth()` --calls--> `getSessionUser()`  [INFERRED]
  src/app/router/guards.ts → src/core/auth/session.ts
- `redirectIfAuthed()` --calls--> `getSessionUser()`  [INFERRED]
  src/app/router/guards.ts → src/core/auth/session.ts
- `signInWithEmail()` --calls--> `getFirebaseAuth()`  [INFERRED]
  src/features/auth/api/sign-in.ts → src/core/auth/firebase.ts
- `signInWithGoogle()` --calls--> `getFirebaseAuth()`  [INFERRED]
  src/features/auth/api/sign-in.ts → src/core/auth/firebase.ts

## Import Cycles
- None detected.

## Communities (42 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.32
Nodes (7): capturarGPS(), capturarVerificacion(), GPS_ERRORES, GpsError, haversineM(), obtenerGPS(), PosicionGPS

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (7): CAMERA_ERRORS, CameraModal(), CameraModalProps, FotoField(), FotoFieldProps, IconButton, IconButtonProps

### Community 2 - "Community 2"
Cohesion: 0.23
Nodes (11): Column, DataTable(), DataTableProps, Skeleton(), SkeletonProps, Table(), TBody(), Td() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (11): Alert(), AlertProps, TONE_CLASSES, Button, ButtonProps, EmptyState(), EmptyStateProps, QueryBoundary() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (20): ErrorBoundary, State, rootElement, renderForm(), renderGrid(), renderPanel(), NAV_ITEMS, NavItem (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (44): devDependencies, autoprefixer, eslint, eslint-import-resolver-typescript, @eslint/js, eslint-plugin-boundaries, eslint-plugin-import, eslint-plugin-jsx-a11y (+36 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (28): GuardarVisitaInput, useGuardarVisita(), PlantillaInput, usePlantillaMutations(), usePlantillas(), CampoEditor(), CampoEditorProps, CampoVisita() (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, jsx, lib, module, moduleDetection (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (19): dependencies, axios, class-variance-authority, firebase, @hookform/resolvers, leaflet, leaflet.markercluster, lucide-react (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): DateField, DateFieldProps, TAMANOS

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, skipLibCheck, strict (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): Arquitectura (dirección del flujo: app → features → shared → core), Arranque en desarrollo (puertos), Comandos, GeoFormal — frontend nuevo (React 19 + Screaming Architecture), Plan de fases, Stack

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (3): env, envSchema, parsed

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (5): plugins, printWidth, semi, singleQuote, trailingComma

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (3): Anatomía de una feature, features/ — el "grito" del dominio, Reglas (las aplica `eslint.config.js`)

### Community 17 - "Community 17"
Cohesion: 0.31
Nodes (5): apiClient, etagCache, Method, NotModifiedError, RequestOptions

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (33): reverseGeocode(), NuevoReporte, reportesKeys, useActualizarReporte(), useCrearReporte(), useEliminarReporte(), useReportes(), ReporteForm() (+25 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (17): activarAppCheck(), getFirebaseAuth(), EVENTOS, vigilarInactividad(), changePassword(), ensureWatcher(), getFreshToken(), getSessionSnapshot() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (21): FlyTo(), FlyToProps, MapCanvas(), MapCanvasProps, MERIDA_CENTER, MapPopup(), MapPopupProps, Card (+13 more)

### Community 27 - "Community 27"
Cohesion: 0.06
Nodes (64): candidatosKeys, useCandidatos(), useCargaProgresiva(), GuardarTipoInput, GuardarTipoResponse, useGuardarTipo(), useMetricas(), useMuestraValidacion() (+56 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (38): useColonias(), useGeoJsonLayer(), useZonas(), AgebProps, AgebsLayer(), CapasLayers(), CapasLayersProps, CapaId (+30 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (14): descargarReporteVisita(), useCalcularRuta(), useCalcularRutaColonia(), RutaInfo(), RutaLayer(), RutaLista(), RutaListaProps, CANDIDATOS (+6 more)

### Community 31 - "Community 31"
Cohesion: 0.07
Nodes (46): campanasKeys, useCampana(), NuevaCampana, useCampanaMutations(), Opciones, useCampanas(), usePatchNegocio(), AgregarNegocios() (+38 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (21): useAsignarCampana(), ERRORES, useCambiarPassword(), useUsuarioMutations(), useUsuarios(), usuariosKey, AsignacionesList(), AsignacionesListProps (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (35): indiceKeys, useIndice(), useMuestraValidacion(), usePredecir(), Conteo(), IndiceCalculadora(), pctDe(), ComoSeEstima() (+27 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (16): Combobox(), ComboboxOption, ComboboxProps, contenidoDelCampo(), DisparadorProps, TAMANOS, COLONIAS, MUCHAS (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (4): Badge(), BadgeProps, BadgeTone, TONE_CLASSES

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (17): ERROR_MESSAGES, SignInError, signInWithEmail(), signInWithGoogle(), SILENT_CODES, translate(), GoogleIcon(), LoginForm() (+9 more)

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (3): ANCHOS, Page(), PageProps

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (8): ConfirmContext, ConfirmFn, ConfirmOptions, ConfirmProvider(), Modal(), ModalProps, WIDTH_CLASSES, PortalContainerContext

## Knowledge Gaps
- **220 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `plugins` (+215 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useConfirm()` connect `Community 24` to `Community 32`, `Community 26`, `Community 46`, `Community 31`?**
  _High betweenness centrality (0.319) - this node is a cross-community bridge._
- **Why does `CampanaDetalle()` connect `Community 31` to `Community 24`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `useCandidatos()` connect `Community 27` to `Community 33`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _220 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.08377896613190731 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.10661268556005399 - nodes in this community are weakly interconnected._