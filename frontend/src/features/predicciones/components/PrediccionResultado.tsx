import { AlertTriangle } from 'lucide-react';
import { Badge, Card } from '@shared/ui';
import { giroLabel } from '@features/candidatos';
import { PREDICCION_META, type Prediccion } from '../model/prediccion';

const TONE_TEXT: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-primary',
  neutral: 'text-fg-muted',
};

/** Tarjeta de resultado de la predicción puntual. */
export function PrediccionResultado({ prediccion }: { prediccion: Prediccion }) {
  const meta = PREDICCION_META[prediccion.status];
  const Icon = meta.Icon;

  return (
    <Card raised className="grid gap-1.5 p-4 text-center">
      <Icon className={`mx-auto h-8 w-8 ${TONE_TEXT[meta.tone]}`} aria-hidden="true" />
      <Badge tone={meta.tone} className="mx-auto">
        {meta.label}
      </Badge>
      {prediccion.status === 'zona' ? (
        <>
          <div className="font-display font-bold">Potencial {prediccion.zona_nivel}</div>
          <div className="text-xs text-fg-muted">Probabilidad: {prediccion.zona_score}%</div>
          {prediccion.estimado ? (
            <div className="flex items-center justify-center gap-1 text-2xs text-warning">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Estimación extrapolada por ML
            </div>
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
    </Card>
  );
}
