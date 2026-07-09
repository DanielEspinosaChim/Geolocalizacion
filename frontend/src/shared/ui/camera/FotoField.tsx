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
    <div className="flex items-center gap-2">
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
        <img src={preview} alt="Foto de la visita" className="h-14 w-14 rounded-control object-cover" />
      ) : null}
      <div className="flex flex-1 gap-1.5">
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
      <CameraModal open={camaraAbierta} onClose={() => setCamaraAbierta(false)} onCapture={usarArchivo} />
    </div>
  );
}
