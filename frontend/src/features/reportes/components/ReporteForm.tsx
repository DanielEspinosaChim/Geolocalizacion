import { Check, LocateFixed, MapPin, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { obtenerGPS } from '@shared/lib/geo';
import { Button, SelectField, TextField } from '@shared/ui';
import { reverseGeocode } from '../api/reverseGeocode';
import { useCrearReporte } from '../api/useReportes';
import { REPORTE_META, TIPOS_REPORTE, type TipoReporte } from '../model/reporte';

export interface Ubicacion {
  lat: number;
  lng: number;
  direccion: string;
}

interface ReporteFormProps {
  ubicacion: Ubicacion | null;
  onUbicacion: (u: Ubicacion | null) => void;
  modoMapa: boolean;
  onToggleModoMapa: () => void;
}

export function ReporteForm({ ubicacion, onUbicacion, modoMapa, onToggleModoMapa }: ReporteFormProps) {
  const [tipo, setTipo] = useState<TipoReporte>('bache');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const fotoInput = useRef<HTMLInputElement>(null);
  const crear = useCrearReporte();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!ubicacion) return;
    crear.mutate(
      { tipo, descripcion, foto, ...ubicacion },
      {
        onSuccess: () => {
          setDescripcion('');
          setFoto(null);
          onUbicacion(null);
          if (fotoInput.current) fotoInput.current.value = '';
        },
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-2.5 border-b border-border p-3">
      <SelectField label="Tipo de problema" value={tipo} onChange={(e) => setTipo(e.target.value as TipoReporte)}>
        {TIPOS_REPORTE.map((t) => (
          <option key={t} value={t}>
            {REPORTE_META[t].emoji} {REPORTE_META[t].label}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Describe el problema…"
      />
      <UbicacionControls
        ubicacion={ubicacion}
        onUbicacion={onUbicacion}
        modoMapa={modoMapa}
        onToggleModoMapa={onToggleModoMapa}
      />
      <FotoPicker foto={foto} onFoto={setFoto} inputRef={fotoInput} />
      <Button type="submit" disabled={!ubicacion || crear.isPending}>
        <Send className="h-4 w-4" aria-hidden="true" /> {crear.isPending ? 'Enviando…' : 'Enviar reporte'}
      </Button>
    </form>
  );
}

function UbicacionControls({ ubicacion, onUbicacion, modoMapa, onToggleModoMapa }: ReporteFormProps) {
  const [buscandoGPS, setBuscandoGPS] = useState(false);

  async function usarGPS() {
    setBuscandoGPS(true);
    try {
      const pos = await obtenerGPS();
      onUbicacion({ lat: pos.lat, lng: pos.lng, direccion: await reverseGeocode(pos.lat, pos.lng) });
    } finally {
      setBuscandoGPS(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={buscandoGPS} onClick={() => void usarGPS()}>
          <LocateFixed className="h-4 w-4" aria-hidden="true" /> {buscandoGPS ? 'Buscando…' : 'Mi ubicación'}
        </Button>
        <Button type="button" variant="secondary" size="sm" aria-pressed={modoMapa} onClick={onToggleModoMapa}>
          {modoMapa ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" /> Cancelar clic
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" aria-hidden="true" /> Clic en mapa
            </>
          )}
        </Button>
      </div>
      {ubicacion ? (
        <p className="flex items-center gap-1 rounded-control border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs2 text-success">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{' '}
          {ubicacion.direccion || `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`}
        </p>
      ) : (
        <p className="text-xs2 text-fg-subtle">Ubica el problema con GPS o clic en el mapa.</p>
      )}
    </>
  );
}

function FotoPicker({
  foto,
  onFoto,
  inputRef,
}: {
  foto: File | null;
  onFoto: (f: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor="reporte-foto" className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
        Foto (opcional)
      </label>
      <input
        ref={inputRef}
        id="reporte-foto"
        type="file"
        accept="image/*"
        onChange={(e) => onFoto(e.target.files?.[0] ?? null)}
        className="text-xs text-fg-muted file:mr-2 file:rounded-control file:border file:border-border file:bg-surface-raised file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-fg"
      />
      {foto ? (
        <img src={URL.createObjectURL(foto)} alt="Vista previa de la foto" className="max-h-36 w-full rounded-control object-cover" />
      ) : null}
    </div>
  );
}
