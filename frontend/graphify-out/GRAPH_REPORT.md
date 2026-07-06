# Graph Report - frontend  (2026-07-06)

## Corpus Check
- 7 files · ~17,335 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 193 nodes · 323 edges · 16 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a885af1b`
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

## God Nodes (most connected - your core abstractions)
1. `showTab()` - 8 edges
2. `cargarUsuariosAdmin()` - 7 edges
3. `renderLista()` - 6 edges
4. `_abrirCamara()` - 6 edges
5. `_renderTablaNegociosCampana()` - 6 edges
6. `_actualizarMeta()` - 6 edges
7. `_epSyncDOM()` - 6 edges
8. `_renderEditorCampos()` - 6 edges
9. `cargarReportes()` - 6 edges
10. `crearUsuario()` - 5 edges

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

## Communities (16 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (12): _campanaNegocios, cargarCampanas(), cerrarCampana(), cerrarModalCampana(), crearCampana(), eliminarCampana(), _epCampos, _plantillasCache (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (16): cargarAgebs(), cargarColonias(), cargarMunicipiosYucatan(), COLONIA_COLORS, coloniasData, onColoniaChange(), _poblarSelectColonia(), _renderAgebs() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (11): allData, map, markers, _renderLeyendaZonas(), renderZonas(), _rutaData, rutaMarkersExtra, rutaSeleccion (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (15): actualizarStatusReporte(), cargarReportes(), eliminarReporte(), enviarReporte(), _haversineM(), _obtenerGPS(), _onMapClickReporte(), _renderListaReportes() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.27
Nodes (14): _adminCampanas, _adminUsuarios, asignarCampana(), cambiarRoleUsuario(), cargarCampanasAdmin(), cargarPanelAdmin(), cargarUsuariosAdmin(), cerrarModalCrearUsuario() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (14): _actualizarMeta(), agregarNegocio(), buscarNegociosParaAgregar(), quitarNegocioCampana(), renderBusquedaResultados(), _renderChecklistTecnico(), _renderDetalleCampana(), _renderDetalleCampanaTecnico() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (10): _abrirCamara(), _abrirCamaraModal(), _cameraCancelar(), _cameraDetenerStream(), _cameraReintentar(), _cameraShowLive(), _esMobil(), _vfAbrirCamara() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (5): _applyTecnicoRestrictions(), _bootApp(), doLogin(), doLoginGoogle(), _showLoginError()

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (10): _agregarMarcadores(), cargarCandidatos(), cargarDatosIniciales(), filtrar(), filtrarPorTipo(), _mergeData(), renderLista(), renderMapa() (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (10): _calcIndice(), calcularRuta(), calcularRutaColonia(), cargarIndice(), cargarValidacion(), _renderCalculadoraIndice(), renderRutaEnMapa(), showTab() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.28
Nodes (9): agregarCampoPlantilla(), cerrarModalPlantillas(), _epHandleDown(), _epHandleUp(), _epQuitarCampo(), _epSyncDOM(), _epUpdateCampo(), mostrarEditorPlantilla() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (8): _actualizarMetricasLocales(), fetchPredecir(), guardarTipo(), popupHtml(), predecirManual(), _revertirTipo(), tipoColor(), tipoLeg()

### Community 12 - "Community 12"
Cohesion: 0.40
Nodes (6): abrirModalVisita(), _cambiarPlantillaVisita(), _renderCamposVisita(), _renderSelectorPlantilla(), _vfSetVisitado(), _vfVisitadoChange()

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (6): _actualizarBadgeGPS(), cerrarModalVisita(), _guardarGPSVisita(), guardarVisita(), _haversineM(), _vfClearFoto()

### Community 14 - "Community 14"
Cohesion: 0.40
Nodes (5): abrirModalPlantillas(), cerrarEditorPlantilla(), eliminarPlantilla(), guardarPlantilla(), _renderListaPlantillas()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (3): limpiarRuta(), renderListaRuta(), togglePunto()

## Knowledge Gaps
- **20 isolated node(s):** `_adminUsuarios`, `_adminCampanas`, `TIPOS_ES`, `map`, `allData` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showTab()` connect `Community 9` to `Community 2`, `Community 7`, `Community 15`?**
  _High betweenness centrality (0.351) - this node is a cross-community bridge._
- **Why does `verRutaCampana()` connect `Community 9` to `Community 0`?**
  _High betweenness centrality (0.344) - this node is a cross-community bridge._
- **Why does `cargarCandidatos()` connect `Community 8` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `showTab()` (e.g. with `_applyTecnicoRestrictions()` and `verRutaCampana()`) actually correct?**
  _`showTab()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `_abrirCamara()` (e.g. with `_vfAbrirCamara()` and `_vfPlantillaAbrirCamara()`) actually correct?**
  _`_abrirCamara()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `_adminUsuarios`, `_adminCampanas`, `TIPOS_ES` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._