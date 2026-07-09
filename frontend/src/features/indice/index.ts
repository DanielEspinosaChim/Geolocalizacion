export { IndicePage } from './routes/IndicePage';

/* API pública: otras features pueden reusar el panel o el cálculo. */
export { IndicePanel } from './components/IndicePanel';
export { useIndice, indiceKeys } from './api/useIndice';
export { recalcularIndice, type Indice, type IndiceRecalculado } from './model/indice';
