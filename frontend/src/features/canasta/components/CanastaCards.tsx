import { Pencil, Store, Trash2 } from 'lucide-react';
import {
  diaDeFecha,
  formatoMoneda,
  mesLabel,
  promediosTrimestrales,
  totalesPorMes,
  trimestresActivos,
  type Mes,
  type Producto,
  type VistaCanasta,
} from '../model/canasta';
import { CeldaVariacion } from './CanastaCeldas';
import { CATEGORIA_TINT } from './CanastaFila';

interface CanastaCardsProps {
  productos: Producto[];
  meses: Mes[];
  vista: VistaCanasta;
  year: string;
  onEditarProducto: (p: Producto) => void;
  onEliminar: (p: Producto) => void;
}

/**
 * Vista de la canasta en tarjetas, para móvil (la tabla ancha obliga a scroll
 * horizontal y sus botones diminutos son incómodos con el dedo). Cada producto
 * es una tarjeta con sus meses en rejilla; en la vista de precios el lápiz abre
 * el editor completo (todos los meses en un modal) en vez de celda por celda.
 */
export function CanastaCards({
  productos,
  meses,
  vista,
  year,
  onEditarProducto,
  onEliminar,
}: CanastaCardsProps) {
  const totales = totalesPorMes(productos, meses);

  return (
    <div className="grid gap-3">
      {productos.map((p) => (
        <TarjetaProducto
          key={p.id}
          producto={p}
          meses={meses}
          vista={vista}
          onEditar={() => onEditarProducto(p)}
          onEliminar={() => onEliminar(p)}
        />
      ))}

      {/* Pie: total de la canasta por mes (paridad con el footer de la tabla). */}
      {vista === 'precios' ? (
        <div className="rounded-card border border-border bg-surface-raised p-3">
          <h4 className="mb-2 text-2xs font-bold uppercase tracking-wide text-fg-subtle">
            Total de la canasta · {year}
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {meses.map((m, i) => (
              <div key={m} className="rounded-control bg-bg px-2 py-1.5 text-center">
                <div className="text-2xs font-bold text-fg-subtle">{mesLabel(m)}</div>
                <div className="text-xs2 font-bold tabular-nums text-fg">
                  {totales[i] != null ? formatoMoneda(totales[i]!) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Fondo del token de categoría (o sin fondo si no hay). */
function tinteDe(categoria: string): string | undefined {
  const token = CATEGORIA_TINT[categoria];
  return token ? `hsl(var(${token}))` : undefined;
}

function TarjetaProducto({
  producto: p,
  meses,
  vista,
  onEditar,
  onEliminar,
}: {
  producto: Producto;
  meses: Mes[];
  vista: VistaCanasta;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const trimestres = vista === 'trimestres' ? trimestresActivos(meses) : null;
  const avgs = trimestres ? promediosTrimestrales(p.prices, trimestres, meses) : null;

  return (
    <div
      className="grid gap-3 rounded-card border border-border p-3"
      style={{ background: tinteDe(p.category) }}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-2xs font-bold uppercase tracking-wide text-fg-subtle">
            {p.category}
          </span>
          <h3 className="truncate text-sm font-bold text-fg">{p.name}</h3>
          {p.unit ? <span className="text-2xs text-fg-muted">{p.unit}</span> : null}
        </div>
        {vista === 'precios' ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEditar}
              aria-label={`Editar ${p.name}`}
              className="rounded-control border border-border bg-surface p-1.5 text-fg-muted transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onEliminar}
              aria-label={`Desactivar ${p.name}`}
              className="rounded-control border border-border bg-surface p-1.5 text-fg-muted transition-colors hover:border-danger hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </header>

      {/* Rejilla de meses (o trimestres). */}
      <div className="grid grid-cols-3 gap-2">
        {vista === 'trimestres' && trimestres
          ? trimestres.map((q, i) => (
              <CeldaMini key={q.key} label={q.label}>
                <span className={avgs![i] != null ? 'text-fg' : 'text-fg-subtle/60'}>
                  {avgs![i] != null ? avgs![i]!.toFixed(2) : '—'}
                </span>
              </CeldaMini>
            ))
          : meses.map((m, i) => (
              <CeldaMini key={m} label={mesLabel(m)}>
                {vista === 'variacion' ? (
                  <CeldaVariacion
                    valor={p.prices[m] ?? null}
                    previo={i > 0 ? (p.prices[meses[i - 1]] ?? null) : null}
                    esPrimero={i === 0}
                  />
                ) : (
                  <PrecioConTienda producto={p} month={m} />
                )}
              </CeldaMini>
            ))}
      </div>
    </div>
  );
}

/** Celda compacta con etiqueta arriba y valor abajo. */
function CeldaMini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 rounded-control bg-surface/70 px-2 py-1.5 text-center">
      <span className="text-2xs font-bold text-fg-subtle">{label}</span>
      <span className="text-xs2 font-semibold tabular-nums">{children}</span>
    </div>
  );
}

/** Precio del mes + tienda·día debajo (solo lectura; se edita en el modal). */
function PrecioConTienda({ producto: p, month }: { producto: Producto; month: Mes }) {
  const precio = p.prices[month] ?? null;
  const tienda = p.tiendas[month] ?? null;
  const dia = diaDeFecha(p.fechas_compra[month]);
  return (
    <span className="grid gap-0.5">
      <span className={precio != null ? 'text-fg' : 'text-fg-subtle/60'}>
        {precio != null ? formatoMoneda(precio) : '—'}
      </span>
      {tienda ? (
        <span className="flex items-center justify-center gap-0.5 text-2xs font-normal text-primary">
          <Store className="h-2.5 w-2.5" aria-hidden="true" />
          {tienda.slice(0, 8)}
          {dia != null ? ` ·${dia}` : ''}
        </span>
      ) : null}
    </span>
  );
}
