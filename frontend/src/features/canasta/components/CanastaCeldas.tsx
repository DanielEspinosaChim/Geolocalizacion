import { useEffect, useState } from 'react';
import {
  diaDeFecha,
  mesLabel,
  type Mes,
  type Producto,
} from '../model/canasta';

/**
 * Etiqueta bajo el precio con el valor del año B y el % de diferencia
 * `(val − valB) / valB`. Rojo si este año es más caro, verde si es más barato.
 */
export function BadgeComparacion({
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
export function BadgeMetadata({
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
export function CeldaVariacion({
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

/**
 * Celda de precio editable. Input sin bordes que parece texto hasta el foco;
 * guarda al salir (blur) o con Enter, solo si el valor cambió. Acepta coma o
 * punto decimal; vacío borra el precio del mes.
 */
export function CeldaPrecio({
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
