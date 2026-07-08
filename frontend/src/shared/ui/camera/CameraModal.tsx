import { useEffect, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (foto: File) => void;
}

const CAMERA_ERRORS: Record<string, string> = {
  NotAllowedError: 'Permiso denegado — permite el acceso a la cámara.',
  NotFoundError: 'No se encontró ninguna cámara.',
  NotReadableError: 'La cámara está siendo usada por otra aplicación.',
};

/** Modal getUserMedia para PC (en móvil se usa la captura nativa del input). */
export function CameraModal({ open, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captura, setCaptura] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setCaptura(null);
    setError(null);

    void (async () => {
      try {
        const stream = await pedirCamara();
        if (cancelado) {
          detener(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(CAMERA_ERRORS[(e as Error).name] ?? 'No se pudo abrir la cámara');
      }
    })();

    return () => {
      cancelado = true;
      detener(streamRef.current);
      streamRef.current = null;
    };
  }, [open]);

  function capturar() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camara_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCaptura({ file, url: URL.createObjectURL(file) });
      },
      'image/jpeg',
      0.92,
    );
  }

  function usar() {
    if (!captura) return;
    onCapture(captura.file);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Tomar foto" width="md">
      {error ? (
        <p className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : (
        <div className="grid gap-3">
          {captura ? (
            <img src={captura.url} alt="Vista previa de la captura" className="w-full rounded-control" />
          ) : (
            <video ref={videoRef} className="w-full rounded-control bg-black" muted playsInline />
          )}
          <Controles
            tomada={captura !== null}
            onCapturar={capturar}
            onRepetir={() => setCaptura(null)}
            onUsar={usar}
          />
        </div>
      )}
    </Modal>
  );
}

function Controles({
  tomada,
  onCapturar,
  onRepetir,
  onUsar,
}: {
  tomada: boolean;
  onCapturar: () => void;
  onRepetir: () => void;
  onUsar: () => void;
}) {
  if (!tomada) {
    return (
      <Button full onClick={onCapturar}>
        📷 Capturar
      </Button>
    );
  }
  return (
    <div className="flex gap-2">
      <Button variant="secondary" full onClick={onRepetir}>
        Repetir
      </Button>
      <Button full onClick={onUsar}>
        Usar foto
      </Button>
    </div>
  );
}

async function pedirCamara(): Promise<MediaStream> {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) throw new Error('Sin soporte de cámara');
  try {
    return await md.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch {
    return md.getUserMedia({ video: true });
  }
}

function detener(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}
