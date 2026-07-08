# Graph Report - frontend  (2026-07-07)

## Corpus Check
- 153 files · ~23,755 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 617 nodes · 1138 edges · 28 communities (24 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `812f0ce1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `Candidato` - 19 edges
3. `NegocioCampana` - 16 edges
4. `compilerOptions` - 12 edges
5. `getFirebaseAuth()` - 10 edges
6. `tipoDe()` - 10 edges
7. `scripts` - 9 edges
8. `Campo` - 8 edges
9. `Tipo` - 8 edges
10. `campanasKeys` - 7 edges

## Surprising Connections (you probably didn't know these)
- `signInWithEmail()` --calls--> `getFirebaseAuth()`  [INFERRED]
  src/features/auth/api/sign-in.ts → src/core/auth/firebase.ts
- `signInWithGoogle()` --calls--> `getFirebaseAuth()`  [INFERRED]
  src/features/auth/api/sign-in.ts → src/core/auth/firebase.ts
- `AdminPage()` --calls--> `useCampanas()`  [INFERRED]
  src/features/admin/routes/AdminPage.tsx → src/features/campanas/api/useCampanas.ts
- `AdminPage()` --calls--> `useSession()`  [INFERRED]
  src/features/admin/routes/AdminPage.tsx → src/features/auth/hooks/useSession.ts
- `CampanasPage()` --calls--> `useSession()`  [INFERRED]
  src/features/campanas/routes/CampanasPage.tsx → src/features/auth/hooks/useSession.ts

## Import Cycles
- None detected.

## Communities (28 total, 4 thin omitted)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (18): ERROR_MESSAGES, SignInError, signInWithEmail(), signInWithGoogle(), SILENT_CODES, translate(), GoogleIcon(), LoginForm() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, eslint, eslint-import-resolver-typescript, @eslint/js, eslint-plugin-boundaries, eslint-plugin-import, eslint-plugin-jsx-a11y (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (34): capturarGPS(), GuardarVisitaInput, useGuardarVisita(), PlantillaInput, usePlantillaMutations(), usePlantillas(), CampoEditor(), CampoEditorProps (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, jsx, lib, module, moduleDetection (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (32): dependencies, axios, firebase, @hookform/resolvers, leaflet, leaflet.markercluster, @radix-ui/react-dialog, @radix-ui/react-tabs (+24 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, skipLibCheck, strict (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (5): Arquitectura (dirección del flujo: app → features → shared → core), Comandos, GeoFormal — frontend nuevo (React 19 + Screaming Architecture), Plan de fases, Stack

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (3): env, envSchema, parsed

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (3): Anatomía de una feature, features/ — el "grito" del dominio, Reglas (las aplica `eslint.config.js`)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (31): reverseGeocode(), NuevoReporte, reportesKeys, useActualizarReporte(), useCrearReporte(), useEliminarReporte(), useReportes(), FlyTo() (+23 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (29): ErrorBoundary, State, rootElement, activarAppCheck(), getFirebaseAuth(), changePassword(), ensureWatcher(), getFreshToken() (+21 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (40): CAMERA_ERRORS, CameraModal(), CameraModalProps, FotoField(), FotoFieldProps, MapCanvas(), MapCanvasProps, MERIDA_CENTER (+32 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (48): candidatosKeys, useCandidatos(), CacheStatus, cacheStatusSchema, useCargaProgresiva(), GuardarTipoInput, useGuardarTipo(), CandidatoCard() (+40 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (21): useColonias(), useGeoJsonLayer(), AgebProps, AgebsLayer(), CapaId, CAPAS, CapasToggles(), CapasTogglesProps (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (12): descargarReporteVisita(), useCalcularRuta(), useCalcularRutaColonia(), RutaInfo(), RutaLayer(), RutaLista(), RutaListaProps, formatearTiempo() (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.07
Nodes (43): campanasKeys, useCampana(), NuevaCampana, useCampanaMutations(), Opciones, useCampanas(), usePatchNegocio(), AgregarNegocios() (+35 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (20): useAsignarCampana(), ERRORES, useCambiarPassword(), useUsuarioMutations(), useUsuarios(), usuariosKey, AsignacionesList(), AsignacionesListProps (+12 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (22): useIndice(), useMuestraValidacion(), usePredecir(), Escenario(), fmt(), IndicePanel(), PrediccionResultado(), PredictLayer() (+14 more)

## Knowledge Gaps
- **181 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+176 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCandidatos()` connect `Community 27` to `Community 29`, `Community 31`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `AgregarNegocios()` connect `Community 31` to `Community 27`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 4` to `Community 32`, `Community 31`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _181 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09655172413793103 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.0851063829787234 - nodes in this community are weakly interconnected._