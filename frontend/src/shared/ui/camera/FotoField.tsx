import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { esMovil } from '@shared/lib/device';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { CameraModal } from './CameraModal';

interface FotoFieldProps {
  /** URL existente (foto ya guardada) o null. */
  valorInicial?: string | null;
  onChange: (foto: File | null, borrada: boolean) => void;
}

/**
 * Selector de foto adaptativo: en PC abre el modal getUserMedia; en móvil,
 * la cámara nativa (input capture) o la galería. Muestra preview y permite borrar.
 */
export function FotoField({ valorInicial = null, onChange }: FotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(valorInicial);
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  function usarArchivo(foto: File) {
    setPreview(URL.createObjectURL(foto));
    onChange(foto, false);
  }

  function abrirCamara() {
    if (esMovil()) {
      inputRef.current?.setAttribute('capture', 'environment');
      inputRef.current?.click();
    } else {
      setCamaraAbierta(true);
    }
  }

  function abrirGaleria() {
    inputRef.current?.removeAttribute('capture');
    inputRef.current?.click();
  }

  function borrar() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    onChange(null, true);
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-card border p-2.5 transition-colors ${
        preview ? 'border-border bg-surface-raised' : 'border-dashed border-border bg-bg'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const foto = e.target.files?.[0];
          if (foto) usarArchivo(foto);
        }}
      />

      {preview ? (
        <img
          src={preview}
          alt="Foto de la visita"
          className="h-16 w-16 shrink-0 rounded-control border border-border object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control bg-surface-raised">
          <ImageIcon className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-2xs text-fg-subtle">
          {preview ? 'Foto lista. Puedes reemplazarla.' : 'Aún sin foto.'}
        </span>
        <div className="flex gap-1.5">
          <Button type="button" variant="secondary" size="sm" onClick={abrirCamara} className="flex-1">
            <Camera className="h-4 w-4" aria-hidden="true" /> Cámara
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={abrirGaleria} className="flex-1">
            <ImageIcon className="h-4 w-4" aria-hidden="true" /> Galería
          </Button>
          {preview ? (
            <IconButton type="button" variant="danger" size="sm" icon={X} label="Quitar foto" onClick={borrar} />
          ) : null}
        </div>
      </div>

      <CameraModal open={camaraAbierta} onClose={() => setCamaraAbierta(false)} onCapture={usarArchivo} />
    </div>
  );
}
