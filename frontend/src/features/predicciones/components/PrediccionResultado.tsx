import { giroLabel } from '@features/candidatos';
import { Badge } from '@shared/ui';
import { PREDICCION_META, type Prediccion } from '../model/prediccion';

/** Tarjeta de resultado de la predicción puntual. */
export function PrediccionResultado({ prediccion }: { prediccion: Prediccion }) {
  const meta = PREDICCION_META[prediccion.status];

  return (
    <div className="grid gap-1.5 rounded-card border border-border bg-surface-raised p-4 text-center">
      <span className="text-3xl">{meta.icon}</span>
      <Badge tone={meta.tone} className="mx-auto">
        {meta.label}
      </Badge>
      {prediccion.status === 'zona' ? (
        <>
          <div className="font-display font-bold">Potencial {prediccion.zona_nivel}</div>
          <div className="text-xs text-fg-muted">Probabilidad: {prediccion.zona_score}%</div>
          {prediccion.estimado ? (
            <div className="text-[10px] text-warning">⚠️ Estimación extrapolada por ML</div>
          ) : null}
        </>
      ) : prediccion.status === 'sin_datos' ? (
        <div className="text-xs text-fg-muted">No se encontraron zonas con predicciones ML.</div>
      ) : (
        <>
          <div className="font-display font-bold">{prediccion.nombre}</div>
          <div className="text-xs text-fg-muted">
            {giroLabel(prediccion.tipos)}
            {prediccion.distancia_m != null ? ` · ${prediccion.distancia_m} m de distancia` : ''}
          </div>
        </>
      )}
    </div>
  );
}
