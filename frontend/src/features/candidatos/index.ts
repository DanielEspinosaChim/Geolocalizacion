export { CandidatosPage } from './routes/CandidatosPage';

/* API pública para otras features (rutas y predicción pintan el mismo mapa). */
export { CandidatoCard } from './components/CandidatoCard';
export { CapaCandidatos } from './components/CapaCandidatos';
export { Simbologia } from './components/Simbologia';
export { useCandidatos, candidatosKeys } from './api/useCandidatos';
export { useCargaProgresiva } from './api/useCargaProgresiva';
export { useMetricas } from './api/useMetricas';
export { useMuestraValidacion } from './api/useMuestraValidacion';
export { useGuardarTipo } from './api/useGuardarTipo';
export { tipoDe, type Candidato, type Tipo } from './model/candidato';
export { type CacheStatus, type Metricas } from './model/metricas';
export { type MatchValidacion, type MuestraValidacion } from './model/validacion';
export { giroLabel } from './model/giros';
