import { useState } from 'react';
import { Badge, Button, SelectField } from '@shared/ui';
import { useGuardarTipo } from '../api/useGuardarTipo';
import { TIPO_LABELS, TIPO_TONES, TIPOS, tipoDe, type Candidato, type Tipo } from '../model/candidato';
import { giroLabel } from '../model/giros';

interface CandidatoCardProps {
  candidato: Candidato;
  onClose: () => void;
}

/** Detalle al hacer click en un marcador (reemplaza el popupHtml del legacy). */
export function CandidatoCard({ candidato, onClose }: CandidatoCardProps) {
  const [tipo, setTipo] = useState<Tipo>(tipoDe(candidato));
  const guardar = useGuardarTipo();
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${candidato.lat},${candidato.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${candidato.lat},${candidato.lng}&navigate=yes`;

  return (
    <section className="w-72 rounded-card border border-border bg-surface p-4 shadow-2xl">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold leading-tight">{candidato.nombre}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {giroLabel(candidato.tipos)}
            {candidato.colonia_nombre ? ` · ${candidato.colonia_nombre}` : ''}
          </p>
        </div>
        <Badge tone={TIPO_TONES[tipoDe(candidato)]}>{TIPO_LABELS[tipoDe(candidato)]}</Badge>
      </header>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <SelectField label="Formalización" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABELS[t]}
              </option>
            ))}
          </SelectField>
        </div>
        <Button
          disabled={guardar.isPending || tipo === tipoDe(candidato)}
          onClick={() => guardar.mutate({ placeId: candidato.place_id, tipo })}
          className="px-3 py-2.5"
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold">
        <a href={gmapsUrl} target="_blank" rel="noreferrer" className="rounded-control border border-border py-2 text-fg-muted transition-colors hover:text-fg">
          📍 Google Maps
        </a>
        <a href={wazeUrl} target="_blank" rel="noreferrer" className="rounded-control border border-border py-2 text-fg-muted transition-colors hover:text-fg">
          🚗 Waze
        </a>
      </div>
      <Button variant="ghost" full onClick={onClose} className="mt-2 py-1.5 text-xs">
        Cerrar
      </Button>
    </section>
  );
}
