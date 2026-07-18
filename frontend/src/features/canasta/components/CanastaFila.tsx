import { Pencil, Trash2 } from 'lucide-react';
import {
  promediosTrimestrales,
  type Mes,
  type Producto,
  type Trimestre,
  type VistaCanasta,
} from '../model/canasta';
import { BadgeComparacion, BadgeMetadata, CeldaPrecio, CeldaVariacion } from './CanastaCeldas';

/**
 * Tinte suave por categoría. Apunta a un token HSL (tokens.css) en vez de un
 * hex fijo, para que el tema oscuro lo redefina y la fila no quede clara sobre
 * texto claro.
 */
export const CATEGORIA_TINT: Record<string, string> = {
  FRUTAS: '--cat-frutas',
  VEGETALES: '--cat-vegetales',
  ABARROTES: '--cat-abarrotes',
  CARNES: '--cat-carnes',
  LECHES: '--cat-leches',
  HIGIENE: '--cat-higiene',
  FARMACÉUTICOS: '--cat-farmaceuticos',
};

/** Fondo CSS de la fila a partir del token de la categoría (o sin fondo). */
function tinteDe(categoria: string): string | undefined {
  const token = CATEGORIA_TINT[categoria];
  return token ? `hsl(var(${token}))` : undefined;
}

export function FilaProducto({
  producto: p,
  productoB,
  yearB,
  meses,
  vista,
  trimestres,
  nuevaCat,
  onGuardarPrecio,
  onEditarMetadata,
  onEditarProducto,
  onEliminar,
}: {
  producto: Producto;
  productoB: Producto | null;
  yearB: string | null;
  meses: Mes[];
  vista: VistaCanasta;
  trimestres: Trimestre[] | null;
  nuevaCat: boolean;
  onGuardarPrecio: (id: string, month: Mes, price: number | null) => void;
  onEditarMetadata: (producto: Producto, month: Mes) => void;
  onEditarProducto: () => void;
  onEliminar: () => void;
}) {
  return (
    <tr className="border-t border-border/60" style={{ background: tinteDe(p.category) }}>
      <td className="px-3 py-1.5 text-xs2">
        <span className={nuevaCat ? 'font-bold text-fg' : 'text-fg-subtle'}>{p.category}</span>
      </td>
      <td className="px-3 py-1.5 text-[13px] font-medium text-fg">{p.name}</td>
      <td className="px-3 py-1.5 text-xs2 text-fg-muted">{p.unit}</td>

      {vista === 'precios' &&
        meses.map((m) => (
          <td key={m} className="px-1 py-1 align-top">
            <div className="flex flex-col items-end gap-0.5">
              <CeldaPrecio
                valor={p.prices[m] ?? null}
                onGuardar={(price) => onGuardarPrecio(p.id, m, price)}
              />
              <BadgeComparacion valor={p.prices[m] ?? null} valorB={productoB?.prices[m] ?? null} yearB={yearB} />
              <BadgeMetadata producto={p} month={m} onEditar={onEditarMetadata} />
            </div>
          </td>
        ))}

      {vista === 'variacion' &&
        meses.map((m, i) => (
          <td key={m} className="px-2 py-1.5 text-right">
            <CeldaVariacion
              valor={p.prices[m] ?? null}
              previo={i > 0 ? (p.prices[meses[i - 1]] ?? null) : null}
              esPrimero={i === 0}
            />
          </td>
        ))}

      {vista === 'trimestres' &&
        trimestres &&
        promediosTrimestrales(p.prices, trimestres, meses).map((avg, i) => (
          <td
            key={trimestres[i].key}
            className={`px-2 py-1.5 text-right text-xs2 tabular-nums ${avg != null ? 'text-fg' : 'text-fg-subtle/50'}`}
          >
            {avg != null ? avg.toFixed(2) : '—'}
          </td>
        ))}

      <td className="px-1 py-1">
        {vista === 'precios' ? (
          <div className="flex items-center justify-center gap-0.5">
            <button
              type="button"
              onClick={onEditarProducto}
              aria-label={`Editar ${p.name}`}
              className="rounded-control p-1 text-fg-subtle transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onEliminar}
              aria-label={`Desactivar ${p.name}`}
              className="rounded-control p-1 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
