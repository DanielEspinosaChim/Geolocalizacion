export { CandidatosPage } from './routes/CandidatosPage';

/* API pública para otras features (rutas consume el mismo dataset). */
export { useCandidatos } from './api/useCandidatos';
export { tipoDe, type Candidato, type Tipo } from './model/candidato';
export { giroLabel } from './model/giros';
