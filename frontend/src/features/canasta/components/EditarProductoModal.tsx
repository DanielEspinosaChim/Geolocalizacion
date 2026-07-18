import { useEffect, useState } from 'react';
import { Button, Modal, ModalFooter, toast } from '@shared/ui';
import { useActualizarMetadata } from '../api/useCanastaMutations';
import {
  diaDeFecha,
  fechaCompra,
  formatoMoneda,
  mesLabel,
  type Mes,
  type Producto,
} from '../model/canasta';

interface EditarProductoModalProps {
  year: string;
  /** Producto en edición (null = cerrado). */
  producto: Producto | null;
  /** Meses visibles a editar (los mismos de la tabla). */
  meses: Mes[];
  onClose: () => void;
}

/** Valores editables de un mes: precio, tienda y día del mes. */
interface FilaMes {
  precio: string;
  tienda: string;
  dia: string;
}

/** Arma el estado inicial de todos los meses desde el producto. */
function estadoInicial(producto: Producto, meses: Mes[]): Record<string, FilaMes> {
  const out: Record<string, FilaMes> = {};
  for (const m of meses) {
    const precio = producto.prices[m];
    const dia = diaDeFecha(producto.fechas_compra[m]);
    out[m] = {
      precio: precio != null ? String(precio) : '',
      tienda: producto.tiendas[m] ?? '',
      dia: dia != null ? String(dia) : '',
    };
  }
  return out;
}

/** Parseo tolerante de precio: coma o punto; vacío = null; NaN = inválido. */
function parsePrecio(texto: string): number | null | 'invalido' {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isNaN(n) ? 'invalido' : n;
}

/**
 * Editor de un producto completo: una fila por mes con precio, tienda y día en
 * un solo modal. Reemplaza el flujo celda-por-celda (precio en la tabla +
 * "+ tienda" aparte), incómodo sobre todo en móvil. Guarda solo los meses que
 * cambiaron, reusando el PUT de metadata (que ya manda precio+tienda+fecha).
 */
export function EditarProductoModal({ year, producto, meses, onClose }: EditarProductoModalProps) {
  const [filas, setFilas] = useState<Record<string, FilaMes>>({});
  const actualizar = useActualizarMetadata(year);

  useEffect(() => {
    if (producto) setFilas(estadoInicial(producto, meses));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto]);

  function set(m: Mes, campo: keyof FilaMes, valor: string) {
    setFilas((prev) => ({ ...prev, [m]: { ...prev[m], [campo]: valor } }));
  }

  async function guardar() {
    if (!producto) return;
    const original = estadoInicial(producto, meses);
    const cambios: { month: Mes; price: number | null; tienda: string | null; fecha: string | null }[] = [];

    for (const m of meses) {
      const f = filas[m];
      if (!f) continue;
      const orig = original[m];
      // Sin cambios en ninguno de los tres campos: se salta.
      if (f.precio === orig.precio && f.tienda === orig.tienda && f.dia === orig.dia) continue;

      const precio = parsePrecio(f.precio);
      if (precio === 'invalido') {
        toast.error(`Precio inválido en ${mesLabel(m)}.`);
        return;
      }
      let fecha: string | null = null;
      if (f.dia.trim() !== '') {
        const d = Number(f.dia);
        if (!Number.isInteger(d) || d < 1 || d > 31) {
          toast.error(`Día inválido en ${mesLabel(m)} (1–31).`);
          return;
        }
        fecha = fechaCompra(year, m, d);
      }
      cambios.push({
        month: m,
        price: precio,
        tienda: f.tienda.trim() ? f.tienda.trim().toUpperCase() : null,
        fecha,
      });
    }

    if (cambios.length === 0) {
      onClose();
      return;
    }

    try {
      await Promise.all(
        cambios.map((c) =>
          actualizar.mutateAsync({
            id: producto.id,
            month: c.month,
            price: c.price,
            tienda: c.tienda,
            fecha_compra: c.fecha,
          }),
        ),
      );
      toast.success(`Guardado · ${cambios.length} ${cambios.length === 1 ? 'mes' : 'meses'}`);
      onClose();
    } catch {
      /* el interceptor ya muestra el toast de error */
    }
  }

  return (
    <Modal
      open={producto != null}
      onClose={onClose}
      title={producto ? `Editar ${producto.name}` : 'Editar producto'}
      description={producto ? `${producto.category} · ${producto.unit || 'sin presentación'} · ${year}` : undefined}
      width="lg"
    >
      {producto ? (
        <div className="grid gap-2">
          {/* Cabecera de columnas (solo en pantallas con ancho: en la fila de
              abajo esas mismas columnas quedan sin rótulo propio). */}
          <div className="hidden grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 px-1 text-2xs font-bold uppercase tracking-wide text-fg-subtle sm:grid">
            <span>Mes</span>
            <span>Precio</span>
            <span>Tienda</span>
            <span>Día</span>
          </div>

          {meses.map((m) => {
            const f = filas[m] ?? { precio: '', tienda: '', dia: '' };
            const precioInput = (
              <input
                inputMode="decimal"
                value={f.precio}
                onChange={(e) => set(m, 'precio', e.target.value)}
                placeholder="0.00"
                aria-label={`Precio de ${mesLabel(m)}`}
                className="w-full rounded-control border border-border bg-surface px-2.5 py-1.5 text-right text-sm tabular-nums text-fg outline-none transition-colors focus:border-primary sm:text-right"
              />
            );
            const tiendaInput = (
              <input
                value={f.tienda}
                onChange={(e) => set(m, 'tienda', e.target.value)}
                placeholder="Tienda"
                aria-label={`Tienda de ${mesLabel(m)}`}
                className="w-full rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm uppercase text-fg outline-none transition-colors placeholder:normal-case focus:border-primary"
              />
            );
            const diaInput = (
              <input
                inputMode="numeric"
                value={f.dia}
                onChange={(e) => set(m, 'dia', e.target.value)}
                placeholder="Día"
                aria-label={`Día de compra de ${mesLabel(m)}`}
                className="w-full rounded-control border border-border bg-surface px-2.5 py-1.5 text-center text-sm tabular-nums text-fg outline-none transition-colors focus:border-primary"
              />
            );

            return (
              <div key={m} className="rounded-control border border-border bg-bg p-2 sm:border-0 sm:bg-transparent sm:p-0">
                {/* Móvil: título del mes + un rótulo pequeño sobre cada campo
                    (sin esto no se distinguía precio/tienda/día a simple
                    vista, solo cajas de texto). */}
                <div className="grid gap-2 sm:hidden">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-fg">{mesLabel(m)}</span>
                    <span className="text-2xs text-fg-subtle">
                      {f.precio ? formatoMoneda(Number(f.precio.replace(',', '.')) || 0) : 'sin precio'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CampoMovil label="Precio">{precioInput}</CampoMovil>
                    <CampoMovil label="Tienda">{tiendaInput}</CampoMovil>
                  </div>
                  <CampoMovil label="Día del mes">{diaInput}</CampoMovil>
                </div>

                {/* sm+: fila de tabla, ya con la cabecera de columnas de arriba. */}
                <div className="hidden items-center gap-2 sm:grid sm:grid-cols-[3.5rem_1fr_1fr_3.5rem]">
                  <span className="pl-1 text-xs font-bold text-fg">{mesLabel(m)}</span>
                  {precioInput}
                  {tiendaInput}
                  {diaInput}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button loading={actualizar.isPending} onClick={() => void guardar()}>
          Guardar cambios
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** Rótulo pequeño sobre un campo, solo para la vista móvil apilada. */
function CampoMovil({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-2xs font-bold uppercase tracking-wide text-fg-subtle">{label}</span>
      {children}
    </label>
  );
}
