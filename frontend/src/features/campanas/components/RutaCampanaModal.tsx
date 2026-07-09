import { useEffect } from 'react';
import { MapCanvas, Modal, Spinner } from '@shared/ui';
import { RutaInfo, RutaLayer, useCalcularRuta } from '@features/rutas';
import type { NegocioCampana } from '../model/campana';

interface RutaCampanaModalProps {
  negocios: NegocioCampana[];
  onClose: () => void;
}

/** Calcula y muestra la ruta óptima de los negocios de la campaña. */
export function RutaCampanaModal({ negocios, onClose }: RutaCampanaModalProps) {
  const calcular = useCalcularRuta();
  const conCoords = negocios.filter((n) => n.lat != null && n.lng != null);

  useEffect(() => {
    if (conCoords.length >= 2) calcular.mutate(conCoords.map((n) => n.negocio_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal open onClose={onClose} title="Ruta de la campaña" width="lg">
      {conCoords.length < 2 ? (
        <p className="text-sm text-fg-muted">Se necesitan al menos 2 negocios con ubicación para trazar una ruta.</p>
      ) : calcular.isPending ? (
        <div className="flex justify-center p-6">
          <Spinner label="Calculando ruta…" />
        </div>
      ) : calcular.data ? (
        <div className="grid gap-3">
          <div className="h-72 overflow-hidden rounded-card border border-border">
            <MapCanvas>
              <RutaLayer ruta={calcular.data} />
            </MapCanvas>
          </div>
          <RutaInfo ruta={calcular.data} />
        </div>
      ) : (
        <p className="text-sm text-danger">No se pudo calcular la ruta.</p>
      )}
    </Modal>
  );
}
