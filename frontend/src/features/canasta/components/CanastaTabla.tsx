import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConfirm } from '@shared/ui';
import {
  mesLabel,
  totalesPorMes,
  type Mes,
  type Producto,
} from '../model/canasta';

/** Tinte suave por categoría (mismos tonos pastel del Excel de CANACO). */
const CATEGORIA_TINT: Record<string, string> = {
  FRUTAS: '#eff6fb',
  VEGETALES: '#ecf8f1',
  ABARROTES: '#fdf9ea',
  CARNES: '#fdeeec',
  LECHES: '#f5eef8',
  HIGIENE: '#eef3ff',
  FARMACÉUTICOS: '#fdf3ea',
};

interface CanastaTablaProps {
  productos: Producto[];
  meses: Mes[];
  onGuardarPrecio: (id: string, month: Mes, price: number | null) => void;
  onEliminar: (id: string) => void;
}

export function CanastaTabla({ productos, meses, onGuardarPrecio, onEliminar }: CanastaTablaProps) {
  const confirm = useConfirm();
  const totales = totalesPorMes(productos, meses);

  async function pedirEliminar(p: Producto) {
    const ok = await confirm({
      title: `Desactivar ${p.name}`,
      description: 'Dejará de aparecer en la tabla. El histórico se conserva.',
      confirmLabel: 'Desactivar',
      tone: 'danger',
    });
    if (ok) onEliminar(p.id);
  }

  let ultimaCat: string | null = null;

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-left">
        <EncabezadoTabla meses={meses} />
        <tbody>
          {productos.map((p) => {
            const nuevaCat = p.category !== ultimaCat;
            ultimaCat = p.category;
            return (
              <FilaProducto
                key={p.id}
                producto={p}
                meses={meses}
                nuevaCat={nuevaCat}
                onGuardarPrecio={onGuardarPrecio}
                onEliminar={() => void pedirEliminar(p)}
              />
            );
          })}
        </tbody>
        <PieTabla meses={meses} totales={totales} />
      </table>
    </div>
  );
}

function EncabezadoTabla({ meses }: { meses: Mes[] }) {
  return (
    <thead>
      <tr className="bg-surface-raised">
        <Th>Categoría</Th>
        <Th>Suministro</Th>
        <Th>Pres.</Th>
        {meses.map((m) => (
          <Th key={m} className="text-right">
            {mesLabel(m)}
          </Th>
        ))}
        <Th className="w-10" />
      </tr>
    </thead>
  );
}

function FilaProducto({
  producto: p,
  meses,
  nuevaCat,
  onGuardarPrecio,
  onEliminar,
}: {
  producto: Producto;
  meses: Mes[];
  nuevaCat: boolean;
  onGuardarPrecio: (id: string, month: Mes, price: number | null) => void;
  onEliminar: () => void;
}) {
  return (
    <tr className="border-t border-border/60" style={{ background: CATEGORIA_TINT[p.category] }}>
      <td className="px-3 py-1.5 text-xs2">
        <span className={nuevaCat ? 'font-bold text-fg' : 'text-fg-subtle'}>{p.category}</span>
      </td>
      <td className="px-3 py-1.5 text-[13px] font-medium text-fg">{p.name}</td>
      <td className="px-3 py-1.5 text-xs2 text-fg-muted">{p.unit}</td>
      {meses.map((m) => (
        <td key={m} className="px-1 py-1">
          <CeldaPrecio
            valor={p.prices[m] ?? null}
            onGuardar={(price) => onGuardarPrecio(p.id, m, price)}
          />
        </td>
      ))}
      <td className="px-1 py-1 text-center">
        <button
          type="button"
          onClick={onEliminar}
          aria-label={`Desactivar ${p.name}`}
          className="rounded-control p-1 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function PieTabla({ meses, totales }: { meses: Mes[]; totales: (number | null)[] }) {
  return (
    <tfoot className="text-xs2">
      <tr className="border-t-2 border-border bg-surface-raised font-bold text-fg">
        <td colSpan={3} className="px-3 py-2">
          TOTAL
        </td>
        {totales.map((t, i) => (
          <td key={meses[i]} className="px-2 py-2 text-right tabular-nums">
            {t != null ? `$${t.toFixed(2)}` : ''}
          </td>
        ))}
        <td />
      </tr>
      <FilaComparativa
        etiqueta="Diferencia vs mes anterior"
        meses={meses}
        valores={totales.map((t, i) => {
          const prev = totales[i - 1];
          if (i === 0 || t == null || prev == null) return null;
          return { texto: `${t - prev > 0 ? '+' : ''}$${(t - prev).toFixed(2)}`, sube: t - prev > 0 };
        })}
      />
      <FilaComparativa
        etiqueta="% vs mes anterior"
        meses={meses}
        valores={totales.map((t, i) => {
          const prev = totales[i - 1];
          if (i === 0 || t == null || prev == null || prev === 0) return null;
          const pct = ((t - prev) / prev) * 100;
          return { texto: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, sube: pct > 0 };
        })}
      />
    </tfoot>
  );
}

function FilaComparativa({
  etiqueta,
  meses,
  valores,
}: {
  etiqueta: string;
  meses: Mes[];
  valores: ({ texto: string; sube: boolean } | null)[];
}) {
  return (
    <tr className="border-t border-border/60 bg-surface-raised/60">
      <td colSpan={3} className="px-3 py-1.5 text-fg-subtle">
        {etiqueta}
      </td>
      {valores.map((v, i) => (
        <td
          key={meses[i]}
          className={`px-2 py-1.5 text-right font-bold tabular-nums ${
            v ? (v.sube ? 'text-danger' : 'text-success') : ''
          }`}
        >
          {v?.texto ?? ''}
        </td>
      ))}
      <td />
    </tr>
  );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-2xs font-bold uppercase tracking-wider text-fg-subtle ${className}`}
    >
      {children}
    </th>
  );
}

/**
 * Celda de precio editable. Input sin bordes que parece texto hasta el foco;
 * guarda al salir (blur) o con Enter, solo si el valor cambió. Acepta coma o
 * punto decimal; vacío borra el precio del mes.
 */
function CeldaPrecio({
  valor,
  onGuardar,
}: {
  valor: number | null;
  onGuardar: (price: number | null) => void;
}) {
  const [texto, setTexto] = useState(valor != null ? valor.toFixed(2) : '');

  // Sincroniza cuando el valor externo cambia (recarga tras guardar/escaneo).
  useEffect(() => {
    setTexto(valor != null ? valor.toFixed(2) : '');
  }, [valor]);

  function guardar() {
    const limpio = texto.trim().replace(',', '.');
    const parsed = limpio === '' ? null : Number(limpio);
    if (parsed != null && Number.isNaN(parsed)) {
      setTexto(valor != null ? valor.toFixed(2) : ''); // revierte entrada inválida
      return;
    }
    if (parsed !== valor) onGuardar(parsed);
  }

  return (
    <input
      inputMode="decimal"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      aria-label="Precio"
      className={`w-16 rounded-control bg-transparent px-2 py-1 text-right text-xs2 tabular-nums outline-none transition-colors hover:bg-surface focus:bg-surface focus:ring-1 focus:ring-primary ${
        valor != null ? 'text-fg' : 'text-fg-subtle'
      }`}
    />
  );
}
