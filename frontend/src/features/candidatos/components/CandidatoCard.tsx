import { Car, MapPin } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, Combobox } from '@shared/ui';
import { useGuardarTipo } from '../api/useGuardarTipo';
import { TIPO_LABELS, TIPO_TONES, TIPOS, tipoDe, type Candidato, type Tipo } from '../model/candidato';
import { giroLabel } from '../model/giros';
import { PuntoTipo } from './PuntoTipo';

interface CandidatoCardProps {
  candidato: Candidato;
  /** Acción contextual al pie (p. ej. "Registrar visita" desde una ruta de campaña). */
  accion?: ReactNode;
}

/**
 * Detalle del negocio (reemplaza el popupHtml del legacy). Va dentro de un
 * `MapPopup`, que ya aporta el cierre; por eso no trae botón propio.
 */
export function CandidatoCard({ candidato, accion }: CandidatoCardProps) {
  const [tipo, setTipo] = useState<Tipo>(tipoDe(candidato));
  const guardar = useGuardarTipo();
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${candidato.lat},${candidato.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${candidato.lat},${candidato.lng}&navigate=yes`;

  return (
    <Card as="section" className="w-72 p-4 shadow-overlay">
      {/* pr-6: deja sitio a la ✕ del globo, que Leaflet fija en la esquina. */}
      <header className="flex items-start justify-between gap-2 pr-6">
        <div>
          <h3 className="text-sm font-bold leading-tight text-fg">{candidato.nombre}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {giroLabel(candidato.tipos)}
            {candidato.colonia_nombre ? ` · ${candidato.colonia_nombre}` : ''}
          </p>
        </div>
        <Badge tone={TIPO_TONES[tipoDe(candidato)]}>{TIPO_LABELS[tipoDe(candidato)]}</Badge>
      </header>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <Combobox
            label="Formalización"
            clearable={false}
            options={TIPOS.map((t) => ({
              value: t,
              label: TIPO_LABELS[t],
              icon: <PuntoTipo tipo={t} />,
            }))}
            value={tipo}
            onChange={(t) => t && setTipo(t as Tipo)}
          />
        </div>
        <Button
          disabled={guardar.isPending || tipo === tipoDe(candidato)}
          onClick={() => guardar.mutate({ placeId: candidato.place_id, tipo })}
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold">
        <a href={gmapsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-control border border-border py-2 text-fg-muted transition-colors hover:text-fg">
          <MapPin className="h-4 w-4" aria-hidden="true" /> Google Maps
        </a>
        <a href={wazeUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-control border border-border py-2 text-fg-muted transition-colors hover:text-fg">
          <Car className="h-4 w-4" aria-hidden="true" /> Waze
        </a>
      </div>
      {accion ? <div className="mt-3">{accion}</div> : null}
    </Card>
  );
}
