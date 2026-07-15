import { useEffect, useState } from 'react';
import { Button, Modal, ModalFooter, TextField } from '@shared/ui';
import { useActualizarMetadata } from '../api/useCanastaMutations';
import { diaDeFecha, fechaCompra, mesLabel, type Mes, type Producto } from '../model/canasta';

interface MetadataModalProps {
  year: string;
  /** Celda en edición; null = modal cerrado. */
  target: { producto: Producto; month: Mes } | null;
  onClose: () => void;
}

/**
 * Editor de la metadata de una celda: en qué tienda y qué día del mes se
 * levantó el precio. La tienda se guarda en MAYÚSCULAS y la fecha se arma con
 * el año del selector + el mes de la columna + el día capturado (vacío borra).
 */
export function MetadataModal({ year, target, onClose }: MetadataModalProps) {
  const [tienda, setTienda] = useState('');
  const [dia, setDia] = useState('');
  const [error, setError] = useState<string | undefined>();
  const actualizar = useActualizarMetadata(year);

  // Precarga los valores existentes cada vez que se abre otra celda.
  useEffect(() => {
    if (!target) return;
    const { producto, month } = target;
    setTienda(producto.tiendas[month] ?? '');
    const d = diaDeFecha(producto.fechas_compra[month]);
    setDia(d != null ? String(d) : '');
    setError(undefined);
  }, [target]);

  function guardar() {
    if (!target) return;
    const { producto, month } = target;

    let fecha: string | null = null;
    if (dia.trim() !== '') {
      const d = Number(dia);
      if (!Number.isInteger(d) || d < 1 || d > 31) {
        setError('Captura un día entre 1 y 31.');
        return;
      }
      fecha = fechaCompra(year, month, d);
    }

    actualizar.mutate(
      {
        id: producto.id,
        month,
        price: producto.prices[month] ?? null,
        tienda: tienda.trim() ? tienda.trim().toUpperCase() : null,
        fecha_compra: fecha,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal
      open={target != null}
      onClose={onClose}
      title="Tienda y fecha de compra"
      description={
        target ? `${target.producto.name} · ${mesLabel(target.month)} ${year}` : undefined
      }
      width="sm"
    >
      <div className="grid gap-3">
        <TextField
          label="Tienda"
          value={tienda}
          onChange={(e) => setTienda(e.target.value)}
          placeholder="Ej. CHEDRAUI"
          className="uppercase"
        />
        <TextField
          label="Día del mes"
          type="number"
          min={1}
          max={31}
          inputMode="numeric"
          value={dia}
          onChange={(e) => {
            setDia(e.target.value);
            setError(undefined);
          }}
          placeholder="1–31"
          error={error}
        />
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="sm" loading={actualizar.isPending} onClick={guardar}>
          Guardar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
