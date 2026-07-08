# Graph Report - frontend  (2026-07-07)

## Corpus Check
- 30 files · ~19,643 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 327 nodes · 452 edges · 24 communities (20 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6b9e00d2`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 12 edges
3. `scripts` - 9 edges
4. `showTab()` - 8 edges
5. `cargarUsuariosAdmin()` - 7 edges
6. `renderLista()` - 7 edges
7. `_abrirCamara()` - 6 edges
8. `_renderTablaNegociosCampana()` - 6 edges
9. `_actualizarMeta()` - 6 edges
10. `_epSyncDOM()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `onColoniaChange()` --calls--> `cargarCandidatos()`  [INFERRED]
  js/colonias.js → js/app.js
- `_applyTecnicoRestrictions()` --calls--> `showTab()`  [INFERRED]
  js/auth.js → js/app.js
- `irAReporte()` --calls--> `showTab()`  [INFERRED]
  js/reportes.js → js/app.js
- `_vfAbrirCamara()` --calls--> `_abrirCamara()`  [INFERRED]
  js/campanas.js → js/camera.js
- `_vfPlantillaAbrirCamara()` --calls--> `_abrirCamara()`  [INFERRED]
  js/campanas.js → js/camera.js

## Import Cycles
- None detected.

## Communities (24 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (52): abrirModalPlantillas(), abrirModalVisita(), _actualizarBadgeGPS(), _actualizarMeta(), agregarCampoPlantilla(), agregarNegocio(), buscarNegociosParaAgregar(), _cambiarPlantillaVisita() (+44 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (16): cargarAgebs(), cargarColonias(), cargarMunicipiosYucatan(), COLONIA_COLORS, coloniasData, onColoniaChange(), _poblarSelectColonia(), _renderAgebs() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (43): _actualizarMetricasLocales(), _agregarMarcadores(), allData, _calcIndice(), calcularRuta(), calcularRutaColonia(), cargarCandidatos(), cargarDatosIniciales() (+35 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (15): actualizarStatusReporte(), cargarReportes(), eliminarReporte(), enviarReporte(), _haversineM(), _obtenerGPS(), _onMapClickReporte(), _renderListaReportes() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.27
Nodes (14): _adminCampanas, _adminUsuarios, asignarCampana(), cambiarRoleUsuario(), cargarCampanasAdmin(), cargarPanelAdmin(), cargarUsuariosAdmin(), cerrarModalCrearUsuario() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (36): dependencies, axios, react, react-dom, react-router, @tanstack/react-query, zod, devDependencies (+28 more)

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
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, skipLibCheck, strict (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (5): rootElement, AppProviders(), FEATURES_PENDIENTES, HomePage(), router

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, preview, test, test:watch (+1 more)

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

## Knowledge Gaps
- **113 isolated node(s):** `_adminUsuarios`, `_adminCampanas`, `TIPOS_ES`, `map`, `allData` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showTab()` connect `Community 2` to `Community 7`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `verRutaCampana()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `cargarCandidatos()` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `showTab()` (e.g. with `_applyTecnicoRestrictions()` and `verRutaCampana()`) actually correct?**
  _`showTab()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `_adminUsuarios`, `_adminCampanas`, `TIPOS_ES` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.056051587301587304 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._