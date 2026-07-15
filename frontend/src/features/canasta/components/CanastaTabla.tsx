import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConfirm } from '@shared/ui';
import {
  diaDeFecha,
  mesLabel,
  promediosTrimestrales,
  promediosTrimestralesCanasta,
  totalesPorMes,
  trimestresActivos,
  type Mes,
  type Producto,
  type Trimestre,
  type VistaCanasta,
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
  vista: VistaCanasta;
  year: string;
  /** Año B de comparación (opcional) y sus productos ya cargados. */
  yearB?: string | null;
  productosB?: Producto[] | null;
  onGuardarPrecio: (id: string, month: Mes, price: number | null) => void;
  onEliminar: (id: string) => void;
  onEditarMetadata: (producto: Producto, month: Mes) => void;
}

export function CanastaTabla({
  productos,
  meses,
  vista,
  year,
  yearB = null,
  productosB = null,
  onGuardarPrecio,
  onEliminar,
  onEditarMetadata,
}: CanastaTablaProps) {
  const confirm = useConfirm();
  const totales = totalesPorMes(productos, meses);
  const trimestres = vista === 'trimestres' ? trimestresActivos(meses) : null;
  const comparando = yearB != null && productosB != null;

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
        <EncabezadoTabla meses={meses} trimestres={trimestres} />
        <tbody>
          {productos.map((p) => {
            const nuevaCat = p.category !== ultimaCat;
            ultimaCat = p.category;
            return (
              <FilaProducto
                key={p.id}
                producto={p}
                productoB={comparando ? (productosB.find((x) => x.id === p.id) ?? null) : null}
                yearB={comparando ? yearB : null}
                meses={meses}
                vista={vista}
                trimestres={trimestres}
                nuevaCat={nuevaCat}
                onGuardarPrecio={onGuardarPrecio}
                onEditarMetadata={onEditarMetadata}
                onEliminar={() => void pedirEliminar(p)}
              />
            );
          })}
        </tbody>
        {trimestres ? (
          <PieTrimestres productos={productos} trimestres={trimestres} meses={meses} />
        ) : (
          <PieTabla
            meses={meses}
            totales={totales}
            year={year}
            yearB={comparando ? yearB : null}
            totalesB={comparando ? totalesPorMes(productosB, meses) : null}
          />
        )}
      </table>
    </div>
  );
}

function EncabezadoTabla({ meses, trimestres }: { meses: Mes[]; trimestres: Trimestre[] | null }) {
  return (
    <thead>
      <tr className="bg-surface-raised">
        <Th>Categoría</Th>
        <Th>Suministro</Th>
        <Th>Pres.</Th>
        {trimestres
          ? trimestres.map((q) => (
              <Th key={q.key} className="text-right">
                {q.label}
              </Th>
            ))
          : meses.map((m) => (
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
  productoB,
  yearB,
  meses,
  vista,
  trimestres,
  nuevaCat,
  onGuardarPrecio,
  onEditarMetadata,
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
  onEliminar: () => void;
}) {
  return (
    <tr className="border-t border-border/60" style={{ background: CATEGORIA_TINT[p.category] }}>
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

      <td className="px-1 py-1 text-center">
        {vista === 'precios' ? (
          <button
            type="button"
            onClick={onEliminar}
            aria-label={`Desactivar ${p.name}`}
            className="rounded-control p-1 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </td>
    </tr>
  );
}

/**
 * Etiqueta bajo el precio con el valor del año B y el % de diferencia
 * `(val − valB) / valB`. Rojo si este año es más caro, verde si es más barato.
 */
function BadgeComparacion({
  valor,
  valorB,
  yearB,
}: {
  valor: number | null;
  valorB: number | null;
  yearB: string | null;
}) {
  if (yearB == null || valor == null || valorB == null || valorB === 0) return null;
  const pct = ((valor - valorB) / valorB) * 100;
  const clase = valor > valorB ? 'text-danger' : valor < valorB ? 'text-success' : 'text-fg-subtle';
  return (
    <span className={`whitespace-nowrap text-2xs font-semibold leading-tight tabular-nums ${clase}`}>
      {yearB}: ${valorB.toFixed(2)} ({pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%)
    </span>
  );
}

/** Etiqueta clicable "TIENDA · día" (o "+ tienda") que abre el editor de metadata. */
function BadgeMetadata({
  producto,
  month,
  onEditar,
}: {
  producto: Producto;
  month: Mes;
  onEditar: (producto: Producto, month: Mes) => void;
}) {
  const tienda = producto.tiendas[month] ?? null;
  const dia = diaDeFecha(producto.fechas_compra[month]);
  const texto = tienda ? `${tienda.slice(0, 9)}${dia != null ? ` · ${dia}` : ''}` : '+ tienda';
  return (
    <button
      type="button"
      onClick={() => onEditar(producto, month)}
      title={tienda ? `${tienda}${dia != null ? `, día ${dia}` : ''}` : 'Agregar tienda y fecha'}
      aria-label={`Tienda y fecha de ${producto.name} en ${mesLabel(month)}`}
      className={`whitespace-nowrap rounded-full border px-1.5 py-px text-2xs leading-tight transition-colors ${
        tienda
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-surface text-fg-subtle hover:text-fg'
      }`}
    >
      {texto}
    </button>
  );
}

/**
 * Celda de la vista Variación %: cambio contra el mes visible anterior; solo
 * se calcula si ambos meses tienen precio y el anterior no es cero.
 */
function CeldaVariacion({
  valor,
  previo,
  esPrimero,
}: {
  valor: number | null;
  previo: number | null;
  esPrimero: boolean;
}) {
  if (esPrimero || valor == null || previo == null || previo === 0) {
    return <span className="text-xs2 text-fg-subtle/50">—</span>;
  }
  const pct = ((valor - previo) / previo) * 100;
  const clase =
    pct > 0
      ? 'bg-danger/10 text-danger'
      : pct < 0
        ? 'bg-success/10 text-success'
        : 'bg-surface-raised text-fg-subtle';
  return (
    <span className={`inline-block rounded-control px-2 py-0.5 text-xs2 font-bold tabular-nums ${clase}`}>
      {pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

function PieTabla({
  meses,
  totales,
  year,
  yearB,
  totalesB,
}: {
  meses: Mes[];
  totales: (number | null)[];
  year: string;
  yearB: string | null;
  totalesB: (number | null)[] | null;
}) {
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
      {yearB != null && totalesB != null ? (
        <FilaAnioB year={year} yearB={yearB} meses={meses} totales={totales} totalesB={totalesB} />
      ) : null}
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

/**
 * Fila comparativa anual del pie: total del año B y % de diferencia
 * `(totalA − totalB) / totalB` con la etiqueta "$totalB → +x%".
 */
function FilaAnioB({
  year,
  yearB,
  meses,
  totales,
  totalesB,
}: {
  year: string;
  yearB: string;
  meses: Mes[];
  totales: (number | null)[];
  totalesB: (number | null)[];
}) {
  return (
    <tr className="border-t border-border/60 bg-surface-raised/60">
      <td colSpan={3} className="px-3 py-1.5 text-fg-subtle">
        <span className="font-bold text-primary">{year}</span> vs{' '}
        <span className="font-bold">{yearB}</span>
        <span className="text-2xs"> — diferencia anual</span>
      </td>
      {totalesB.map((tB, i) => {
        if (tB == null) return <td key={meses[i]} />;
        const tA = totales[i];
        if (tA == null) {
          return (
            <td key={meses[i]} className="px-2 py-1.5 text-right tabular-nums text-fg-subtle">
              ${tB.toFixed(2)}
            </td>
          );
        }
        const pct = tB > 0 ? ((tA - tB) / tB) * 100 : null;
        const clase =
          pct == null || pct === 0 ? 'text-fg-subtle' : pct > 0 ? 'text-danger' : 'text-success';
        return (
          <td key={meses[i]} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
            <span className="text-2xs text-fg-subtle">${tB.toFixed(2)} → </span>
            <span className={`font-bold ${clase}`}>
              {pct != null ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
            </span>
          </td>
        );
      })}
      <td />
    </tr>
  );
}

/** Pie de la vista Trimestres: promedio trimestral de los totales mensuales. */
function PieTrimestres({
  productos,
  trimestres,
  meses,
}: {
  productos: Producto[];
  trimestres: Trimestre[];
  meses: Mes[];
}) {
  const promedios = promediosTrimestralesCanasta(productos, trimestres, meses);
  return (
    <tfoot className="text-xs2">
      <tr className="border-t-2 border-border bg-surface-raised font-bold text-fg">
        <td colSpan={3} className="px-3 py-2">
          PROMEDIO CANASTA
        </td>
        {promedios.map((t, i) => (
          <td key={trimestres[i].key} className="px-2 py-2 text-right tabular-nums">
            {t != null ? `$${t.toFixed(2)}` : ''}
          </td>
        ))}
        <td />
      </tr>
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
