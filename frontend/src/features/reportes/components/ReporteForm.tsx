import { LocateFixed, MapPin, Send, X } from 'lucide-react';
import { useState } from 'react';
import { obtenerGPS } from '@shared/lib/geo';
import { Button, Combobox, FotoField, TextField, TextareaField, toast } from '@shared/ui';
import { reverseGeocode } from '@shared/api';
import { useCrearReporte } from '../api/useReportes';
import { REPORTE_META, TIPOS_REPORTE, type Reporte, type TipoReporte } from '../model/reporte';

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
  /** Recibe el reporte ya guardado, con su id y su foto. */
  onCreado?: (reporte: Reporte) => void;
}

export function ReporteForm({
  ubicacion,
  onUbicacion,
  modoMapa,
  onToggleModoMapa,
  onCreado,
}: ReporteFormProps) {
  const [tipo, setTipo] = useState<TipoReporte>('bache');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  // Cambiar la key remonta FotoField y así limpia su preview al enviar.
  const [fotoKey, setFotoKey] = useState(0);
  const crear = useCrearReporte();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!ubicacion) return;
    crear.mutate(
      { tipo, descripcion, foto, ...ubicacion },
      {
        onSuccess: (reporte) => {
          setDescripcion('');
          setFoto(null);
          setFotoKey((k) => k + 1);
          onUbicacion(null);
          onCreado?.(reporte);
        },
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-3">
      <Combobox
        label="Tipo de problema"
        // El tipo es obligatorio: sin fila de "limpiar", el desplegable solo
        // ofrece valores válidos y `tipo` nunca puede quedar en null.
        clearable={false}
        options={TIPOS_REPORTE.map((t) => ({
          value: t,
          label: `${REPORTE_META[t].emoji} ${REPORTE_META[t].label}`,
        }))}
        value={tipo}
        onChange={(t) => t && setTipo(t as TipoReporte)}
      />

      <TextareaField
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

      <div className="grid gap-1.5">
        <span className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
          Foto (opcional)
        </span>
        <FotoField key={fotoKey} onChange={(f) => setFoto(f)} />
      </div>

      <Button type="submit" full disabled={!ubicacion} loading={crear.isPending}>
        {crear.isPending ? null : <Send className="h-4 w-4" aria-hidden="true" />} Enviar reporte
      </Button>
    </form>
  );
}

function UbicacionControls({
  ubicacion,
  onUbicacion,
  modoMapa,
  onToggleModoMapa,
}: ReporteFormProps) {
  const [buscandoGPS, setBuscandoGPS] = useState(false);

  async function usarGPS() {
    setBuscandoGPS(true);
    try {
      const pos = await obtenerGPS();
      onUbicacion({ lat: pos.lat, lng: pos.lng, direccion: await reverseGeocode(pos.lat, pos.lng) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo obtener tu ubicación');
    } finally {
      setBuscandoGPS(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={buscandoGPS}
          onClick={() => void usarGPS()}
        >
          {buscandoGPS ? null : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
          {buscandoGPS ? 'Obteniendo tu ubicación…' : 'Mi ubicación'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-pressed={modoMapa}
          onClick={onToggleModoMapa}
        >
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
      <TextField
        label="Dirección detectada"
        readOnly
        value={ubicacion?.direccion ?? ''}
        placeholder="Se llenará al colocar el punto en el mapa…"
        className={ubicacion ? 'border-success/40' : ''}
      />
    </>
  );
}
