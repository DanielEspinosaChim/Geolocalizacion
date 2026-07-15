import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiClient } from '@shared/api';
import {
  Button,
  Checkbox,
  Modal,
  ModalFooter,
  SelectField,
  Spinner,
  TextField,
  toast,
} from '@shared/ui';
import { canastaKeys } from '../api/useCanasta';
import {
  MESES,
  mesActual,
  mesLabel,
  type Mes,
  type ScanItem,
} from '../model/canasta';

const CONF_META: Record<ScanItem['confidence'], { label: string; clase: string }> = {
  high: { label: 'Alta', clase: 'bg-success/10 text-success border-success/30' },
  medium: { label: 'Media', clase: 'bg-warning/10 text-warning border-warning/30' },
  low: { label: 'Baja', clase: 'bg-danger/10 text-danger border-danger/30' },
};

interface EscaneoModalProps {
  year: string;
  items: ScanItem[];
  open: boolean;
  onClose: () => void;
}

/**
 * Revisión de lo que la IA detectó en la factura. El usuario marca qué precios
 * aplicar y a qué mes; solo se guardan los items con producto mapeado al
 * catálogo. Los de confianza baja llegan desmarcados.
 */
export function EscaneoModal({ year, items, open, onClose }: EscaneoModalProps) {
  const qc = useQueryClient();
  const [mes, setMes] = useState<Mes>(() => mesActual());
  const [tienda, setTienda] = useState('');
  const [marcados, setMarcados] = useState<ReadonlySet<number>>(new Set());
  const [guardando, setGuardando] = useState(false);

  // Preselecciona los de confianza media/alta cada vez que llega un escaneo nuevo.
  useEffect(() => {
    const pre = items.map((it, i) => (it.confidence !== 'low' ? i : -1)).filter((i) => i >= 0);
    setMarcados(new Set(pre));
    setTienda('');
  }, [items]);

  function toggle(i: number) {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function guardar() {
    const seleccionados = [...marcados]
      .map((i) => items[i])
      .filter((it) => it && it.matched_id);
    if (!seleccionados.length) {
      toast.error('Marca al menos un producto con mapeo al catálogo.');
      return;
    }
    setGuardando(true);
    const tiendaNorm = tienda.trim() ? tienda.trim().toUpperCase() : null;
    const fechaHoy = new Date().toISOString().slice(0, 10);
    try {
      await Promise.all(
        seleccionados.map((it) =>
          apiClient.put(`/canasta/${year}/${it.matched_id}`, {
            month: mes,
            price: it.detected_price,
            tienda: tiendaNorm,
            fecha_compra: fechaHoy,
          }),
        ),
      );
      await qc.invalidateQueries({ queryKey: canastaKeys.year(year) });
      toast.success(`${seleccionados.length} precio(s) guardado(s) en ${mesLabel(mes)}.`);
      onClose();
    } catch {
      toast.error('No se pudieron guardar los precios.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revisar precios detectados"
      description="La IA leyó estos productos de la factura. Confirma cuáles aplicar."
      width="lg"
    >
      <EscaneoControles mes={mes} onMes={setMes} tienda={tienda} onTienda={setTienda} />

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">
          No se detectaron productos en la imagen.
        </p>
      ) : (
        <TablaResultados items={items} marcados={marcados} onToggle={toggle} />
      )}

      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="sm" loading={guardando} disabled={items.length === 0} onClick={() => void guardar()}>
          Guardar precios
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** Controles superiores del modal: mes destino y tienda (opcional). */
function EscaneoControles({
  mes,
  onMes,
  tienda,
  onTienda,
}: {
  mes: Mes;
  onMes: (mes: Mes) => void;
  tienda: string;
  onTienda: (tienda: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <div className="w-40">
        <SelectField label="Aplicar al mes" value={mes} onChange={(e) => onMes(e.target.value as Mes)}>
          {MESES.map((m) => (
            <option key={m} value={m}>
              {mesLabel(m)}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="w-48">
        <TextField
          label="Tienda (opcional)"
          value={tienda}
          onChange={(e) => onTienda(e.target.value)}
          placeholder="Ej. CHEDRAUI"
          className="uppercase"
        />
      </div>
    </div>
  );
}

/** Overlay a pantalla completa mientras la IA analiza la factura subida. */
export function EscaneoOverlay({ activo }: { activo: boolean }) {
  if (!activo) return null;
  return (
    <div className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-3 bg-black/50">
      <Spinner className="h-10 w-10 text-white" />
      <p className="text-sm font-semibold text-white">Analizando la factura con IA…</p>
    </div>
  );
}

function TablaResultados({
  items,
  marcados,
  onToggle,
}: {
  items: ScanItem[];
  marcados: ReadonlySet<number>;
  onToggle: (i: number) => void;
}) {
  return (
    <div className="max-h-[45vh] overflow-y-auto rounded-card border border-border">
      <table className="w-full text-left text-xs2">
        <thead className="sticky top-0 bg-surface-raised">
          <tr>
            <th className="w-8 px-2 py-2" />
            <ThScan>Detectado</ThScan>
            <ThScan>Catálogo</ThScan>
            <ThScan className="text-right">Precio</ThScan>
            <ThScan className="text-center">Confianza</ThScan>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const conf = CONF_META[it.confidence];
            return (
              <tr key={`${it.detected_name}-${i}`} className="border-t border-border/60">
                <td className="px-2 py-2">
                  <Checkbox
                    checked={marcados.has(i)}
                    onChange={() => onToggle(i)}
                    aria-label={`Aplicar ${it.detected_name}`}
                  />
                </td>
                <td className="px-3 py-2 text-fg-muted">
                  {it.detected_name}
                  {it.detected_unit ? (
                    <span className="ml-1 text-2xs text-fg-subtle">{it.detected_unit}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-semibold text-fg">
                  {it.matched_name ?? <span className="text-danger">Sin mapear</span>}
                </td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-fg">
                  ${it.detected_price.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-2xs font-bold ${conf.clase}`}
                  >
                    {conf.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ThScan({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 font-bold uppercase tracking-wider text-fg-subtle ${className}`}>
      {children}
    </th>
  );
}
