# Graph Report - frontend  (2026-07-07)

## Corpus Check
- 60 files · ~23,807 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 449 nodes · 673 edges · 27 communities (23 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ea42173`
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

## God Nodes (most connected - your core abstractions)
1. `Alert()` - 21 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 12 edges
4. `scripts` - 9 edges
5. `showTab()` - 8 edges
6. `getFirebaseAuth()` - 8 edges
7. `cargarUsuariosAdmin()` - 7 edges
8. `renderLista()` - 7 edges
9. `crearUsuario()` - 6 edges
10. `_abrirCamara()` - 6 edges

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

## Communities (27 total, 4 thin omitted)

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
Cohesion: 0.17
Nodes (15): actualizarStatusReporte(), cargarReportes(), eliminarReporte(), enviarReporte(), _haversineM(), _obtenerGPS(), _onMapClickReporte(), _renderListaReportes() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (15): _adminCampanas, _adminUsuarios, asignarCampana(), cambiarRoleUsuario(), cargarCampanasAdmin(), cargarPanelAdmin(), cargarUsuariosAdmin(), cerrarModalCrearUsuario() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (39): devDependencies, autoprefixer, eslint, eslint-import-resolver-typescript, @eslint/js, eslint-plugin-boundaries, eslint-plugin-import, eslint-plugin-jsx-a11y (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (10): _abrirCamara(), _abrirCamaraModal(), _cameraCancelar(), _cameraDetenerStream(), _cameraReintentar(), _cameraShowLive(), _esMobil(), _vfAbrirCamara() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (5): _applyTecnicoRestrictions(), _bootApp(), doLogin(), doLoginGoogle(), _showLoginError()

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (25): compilerOptions, allowImportingTsExtensions, baseUrl, jsx, lib, module, moduleDetection, moduleResolution (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (15): dependencies, axios, firebase, @hookform/resolvers, leaflet, @radix-ui/react-dialog, @radix-ui/react-tabs, react (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (15): rootElement, getSessionUser(), AppProviders(), indexLoader(), redirectIfAuthed(), requireAuth(), requireRole(), admin (+7 more)

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
Cohesion: 0.12
Nodes (12): GoogleIcon(), LoginForm(), { signInWithEmail }, useSession(), AppShell(), NAV_ITEMS, NavItem, NavTabs() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (18): ERROR_MESSAGES, SignInError, signInWithEmail(), signInWithGoogle(), SILENT_CODES, translate(), getFirebaseAuth(), ensureWatcher() (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (34): MapCanvas(), MapCanvasProps, MERIDA_CENTER, AlertProps, TONE_CLASSES, Badge(), BadgeProps, BadgeTone (+26 more)

## Knowledge Gaps
- **147 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `_adminUsuarios` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Alert()` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`, `Community 6`, `Community 26`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `showTab()` connect `Community 2` to `Community 7`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `verRutaCampana()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `Alert()` (e.g. with `asignarCampana()` and `cambiarRoleUsuario()`) actually correct?**
  _`Alert()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05734767025089606 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._