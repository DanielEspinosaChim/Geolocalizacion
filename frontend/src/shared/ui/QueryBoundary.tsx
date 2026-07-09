import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  /** Render del contenido con los datos ya cargados. */
  children: (data: T) => ReactNode;
  /** Slot de carga (default: Spinner centrado). */
  loading?: ReactNode;
  /** Predicado de "vacío" (ej. `(d) => d.length === 0`). */
  isEmpty?: (data: T) => boolean;
  /** Slot de vacío (default: EmptyState genérico). */
  empty?: ReactNode;
}

/**
 * Estados de una query de forma declarativa: carga → error (con reintentar) →
 * vacío → contenido. Reemplaza el `if (isPending || !data) return <Spinner/>`
 * repetido, que dejaba el spinner colgado si la query fallaba.
 */
export function QueryBoundary<T>({
  query,
  children,
  loading,
  isEmpty,
  empty,
}: QueryBoundaryProps<T>): ReactNode {
  if (query.status === 'pending') {
    return (
      loading ?? (
        <div className="flex h-full items-center justify-center p-6">
          <Spinner />
        </div>
      )
    );
  }
  if (query.status === 'error') {
    return (
      <div className="p-4">
        <Alert>
          No se pudieron cargar los datos.{' '}
          <Button variant="ghost" size="sm" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </Alert>
      </div>
    );
  }
  if (isEmpty?.(query.data)) {
    return empty ?? <EmptyState title="Sin datos." />;
  }
  return children(query.data);
}
