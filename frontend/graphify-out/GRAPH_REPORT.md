# Graph Report - frontend  (2026-07-07)

## Corpus Check
- 137 files · ~38,302 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 743 nodes · 1347 edges · 36 communities (32 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8905a1c2`
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

## God Nodes (most connected - your core abstractions)
1. `Alert()` - 21 edges
2. `compilerOptions` - 21 edges
3. `Candidato` - 19 edges
4. `NegocioCampana` - 16 edges
5. `compilerOptions` - 12 edges
6. `tipoDe()` - 10 edges
7. `scripts` - 9 edges
8. `showTab()` - 8 edges
9. `getFirebaseAuth()` - 8 edges
10. `Campo` - 8 edges

## Surprising Connections (you probably didn't know these)
- `cambiarRoleUsuario()` --calls--> `Alert()`  [INFERRED]
  legacy/js/admin.js → src/shared/ui/Alert.tsx
- `toggleUsuario()` --calls--> `Alert()`  [INFERRED]
  legacy/js/admin.js → src/shared/ui/Alert.tsx
- `eliminarUsuario()` --calls--> `Alert()`  [INFERRED]
  legacy/js/admin.js → src/shared/ui/Alert.tsx
- `crearUsuario()` --calls--> `Alert()`  [INFERRED]
  legacy/js/admin.js → src/shared/ui/Alert.tsx
- `asignarCampana()` --calls--> `Alert()`  [INFERRED]
  legacy/js/admin.js → src/shared/ui/Alert.tsx

## Import Cycles
- None detected.

## Communities (36 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (52): abrirModalPlantillas(), abrirModalVisita(), _actualizarBadgeGPS(), _actualizarMeta(), agregarCampoPlantilla(), agregarNegocio(), buscarNegociosParaAgregar(), _cambiarPlantillaVisita() (+44 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (16): cargarAgebs(), cargarColonias(), cargarMunicipiosYucatan(), COLONIA_COLORS, coloniasData, onColoniaChange(), _poblarSelectColonia(), _renderAgebs() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (46): _actualizarMetricasLocales(), _agregarMarcadores(), allData, _calcIndice(), calcularRuta(), calcularRutaColonia(), cargarCandidatos(), cargarDatosIniciales() (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (25): _abrirCamara(), _abrirCamaraModal(), _cameraCancelar(), _cameraDetenerStream(), _cameraReintentar(), _cameraShowLive(), _esMobil(), _vfAbrirCamara() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (15): _adminCampanas, _adminUsuarios, asignarCampana(), cambiarRoleUsuario(), cargarCampanasAdmin(), cargarPanelAdmin(), cargarUsuariosAdmin(), cerrarModalCrearUsuario() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, eslint, eslint-import-resolver-typescript, @eslint/js, eslint-plugin-boundaries, eslint-plugin-import, eslint-plugin-jsx-a11y (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (19): PlantillaInput, usePlantillaMutations(), CampoEditor(), CampoEditorProps, EditorPlantilla(), EditorPlantillaProps, EstadoEditor, PlantillasModal() (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (5): _applyTecnicoRestrictions(), _bootApp(), doLogin(), doLoginGoogle(), _showLoginError()

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, jsx, lib, module, moduleDetection (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (32): dependencies, axios, firebase, @hookform/resolvers, leaflet, leaflet.markercluster, @radix-ui/react-dialog, @radix-ui/react-tabs (+24 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (21): rootElement, useSession(), AppShell(), NAV_ITEMS, NavItem, NavTabs(), UserMenu(), AppProviders() (+13 more)

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
Cohesion: 0.10
Nodes (24): ERROR_MESSAGES, SignInError, signInWithEmail(), signInWithGoogle(), SILENT_CODES, translate(), getFirebaseAuth(), ensureWatcher() (+16 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (39): CAMERA_ERRORS, CameraModal(), CameraModalProps, FotoField(), FotoFieldProps, MapCanvas(), MapCanvasProps, MERIDA_CENTER (+31 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (48): candidatosKeys, useCandidatos(), CacheStatus, cacheStatusSchema, useCargaProgresiva(), GuardarTipoInput, useGuardarTipo(), CandidatoCard() (+40 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (21): useColonias(), useGeoJsonLayer(), AgebProps, AgebsLayer(), CapaId, CAPAS, CapasToggles(), CapasTogglesProps (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (12): descargarReporteVisita(), useCalcularRuta(), useCalcularRutaColonia(), RutaInfo(), RutaLayer(), RutaLista(), RutaListaProps, formatearTiempo() (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.32
Nodes (7): capturarGPS(), capturarVerificacion(), GPS_ERRORES, GpsError, haversineM(), obtenerGPS(), PosicionGPS

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (17): Opciones, useCampanas(), CampanaCard(), CampanaCardProps, CampanasList(), CampanasListProps, ProgresoHero(), Campana (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (16): usePatchNegocio(), AgregarNegocios(), AgregarNegociosProps, CampanaDetalleProps, ChecklistItem(), ChecklistItemProps, lineaMeta(), navUrls() (+8 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (10): GuardarVisitaInput, useGuardarVisita(), usePlantillas(), CampoVisita(), CampoVisitaProps, CAMPOS_FIJOS, VisitaModal(), VisitaModalProps (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.23
Nodes (8): campanasKeys, useCampana(), NuevaCampana, useCampanaMutations(), CampanaDetalle(), CrearCampanaModal(), CrearCampanaModalProps, detalleCampanaSchema

## Knowledge Gaps
- **192 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `_adminUsuarios` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCandidatos()` connect `Community 27` to `Community 32`, `Community 29`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `AgregarNegocios()` connect `Community 32` to `Community 34`, `Community 27`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 10` to `Community 31`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `Alert()` (e.g. with `asignarCampana()` and `cambiarRoleUsuario()`) actually correct?**
  _`Alert()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05734767025089606 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._