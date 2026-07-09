import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { Table, TBody, Td, Th, THead, Tr } from './Table';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Clases extra para <th> y <td> de esta columna (ej. ancho, alineación). */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Muestra filas skeleton mientras carga. */
  loading?: boolean;
  /** Contenido cuando no hay filas (default: EmptyState genérico). */
  empty?: ReactNode;
  /** Clases por fila según su dato (ej. atenuar filas deshabilitadas). */
  rowClassName?: (row: T) => string;
  skeletonRows?: number;
}

/**
 * Tabla de datos declarativa sobre los primitivos <Table>. Integra los estados
 * de carga (skeleton) y vacío (EmptyState), que antes cada vista resolvía a mano.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  rowClassName,
  skeletonRows = 4,
}: DataTableProps<T>) {
  if (!loading && rows.length === 0) {
    return empty ?? <EmptyState title="Sin datos." />;
  }

  const filas = loading
    ? Array.from({ length: skeletonRows }, (_, i) => ({ __skeleton: i }))
    : rows;

  return (
    <Table>
      <THead>
        <Tr>
          {columns.map((c) => (
            <Th key={c.key} className={c.className}>
              {c.header}
            </Th>
          ))}
        </Tr>
      </THead>
      <TBody>
        {filas.map((row, i) => (
          <Tr key={loading ? i : rowKey(row as T)} className={loading ? '' : rowClassName?.(row as T)}>
            {columns.map((c) => (
              <Td key={c.key} className={c.className}>
                {loading ? <Skeleton className="h-4 w-full" /> : c.cell(row as T)}
              </Td>
            ))}
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
