import { Database, FileSpreadsheet, ImageDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, EmptyState, toast } from '@shared/ui';
import { descargarExcelCanasta } from '../api/descargarExcel';
import { useEliminarProducto, useActualizarPrecio, useSeedCanasta } from '../api/useCanastaMutations';
import { generarInfografia } from '../lib/generarInfografia';
import type { Mes, Producto, VistaCanasta } from '../model/canasta';
import { CanastaTabla } from './CanastaTabla';
import { EditarProductoModal } from './EditarProductoModal';
import { MetadataModal } from './MetadataModal';
import { ResumenCanasta } from './ResumenCanasta';

interface CanastaContenidoProps {
  productos: Producto[];
  year: string;
  /** Meses visibles del año (para la gráfica de resumen). */
  meses: Mes[];
  /** Meses visibles ∩ seleccionados por chips (para la tabla y el Excel). */
  mesesTabla: Mes[];
  vista: VistaCanasta;
  yearB: string | null;
  productosB: Producto[] | null;
  onAgregar: () => void;
}

/** Cuerpo de la vista: estado vacío, o gráfica de resumen (arriba) + tabla editable. */
export function CanastaContenido({
  productos,
  year,
  meses,
  mesesTabla,
  vista,
  yearB,
  productosB,
  onAgregar,
}: CanastaContenidoProps) {
  const guardarPrecio = useActualizarPrecio(year);
  const eliminar = useEliminarProducto(year);
  const seed = useSeedCanasta(year);
  const [meta, setMeta] = useState<{ producto: Producto; month: Mes } | null>(null);
  // Producto en edición completa (todos sus meses en un solo modal).
  const [editando, setEditando] = useState<Producto | null>(null);

  if (productos.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          title={`Sin productos capturados para ${year}.`}
          action={
            year === '2026' ? (
              <Button
                variant="secondary"
                size="sm"
                loading={seed.isPending}
                onClick={() =>
                  seed.mutate(undefined, {
                    onSuccess: (r) =>
                      toast.success(`Insertados ${r.insertados} · ya existían ${r.ya_existian}`),
                  })
                }
              >
                <Database className="h-4 w-4" aria-hidden="true" /> Cargar histórico 2026
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onAgregar}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Agregar el primer producto
              </Button>
            )
          }
        />
      </Card>
    );
  }

  if (meses.length === 0) {
    return <Card className="p-4 text-sm text-fg-muted">{year} aún no tiene meses que mostrar.</Card>;
  }

  return (
    <div className="grid gap-5">
      <ResumenCanasta
        productos={productos}
        meses={mesesTabla}
        year={year}
        yearB={yearB}
        productosB={productosB}
        vista={vista}
        acciones={
          <AccionesExporta productos={productos} year={year} meses={mesesTabla} yearB={yearB} />
        }
      />
      <CanastaTabla
        productos={productos}
        meses={mesesTabla}
        vista={vista}
        year={year}
        yearB={yearB}
        productosB={productosB}
        onGuardarPrecio={(id, month, price) => guardarPrecio.mutate({ id, month, price })}
        onEliminar={(id) => eliminar.mutate(id)}
        onEditarMetadata={(producto, month) => setMeta({ producto, month })}
        onEditarProducto={setEditando}
      />
      <MetadataModal year={year} target={meta} onClose={() => setMeta(null)} />
      <EditarProductoModal
        year={year}
        producto={editando}
        meses={mesesTabla}
        onClose={() => setEditando(null)}
      />
    </div>
  );
}

function AccionesExporta({
  productos,
  year,
  meses,
  yearB,
}: {
  productos: Producto[];
  year: string;
  meses: Mes[];
  yearB: string | null;
}) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          void descargarExcelCanasta(year, meses, yearB).catch(() =>
            toast.error('No se pudo generar el Excel.'),
          )
        }
      >
        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (!generarInfografia(productos, year)) {
            toast.error('Aún no hay meses comparables para la infografía.');
          }
        }}
      >
        <ImageDown className="h-4 w-4" aria-hidden="true" /> Infografía PNG
      </Button>
    </>
  );
}
