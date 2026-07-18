import { useConfirm } from '@shared/ui';
import {
  mesLabel,
  totalesPorMes,
  trimestresActivos,
  type Mes,
  type Producto,
  type Trimestre,
  type VistaCanasta,
} from '../model/canasta';
import { CanastaCards } from './CanastaCards';
import { FilaProducto } from './CanastaFila';
import { PieTabla, PieTrimestres } from './CanastaPie';

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
  /** Abre el editor completo del producto (todos los meses en un modal). */
  onEditarProducto: (producto: Producto) => void;
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
  onEditarProducto,
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
    <>
      {/* Móvil: tarjetas (la tabla ancha es incómoda en pantalla chica). */}
      <div className="md:hidden">
        <CanastaCards
          productos={productos}
          meses={meses}
          vista={vista}
          year={year}
          onEditarProducto={onEditarProducto}
          onEliminar={(p) => void pedirEliminar(p)}
        />
      </div>

      {/* Escritorio: la tabla densa de siempre. */}
      <div className="hidden overflow-x-auto rounded-card border border-border md:block">
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
                  onEditarProducto={() => onEditarProducto(p)}
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
    </>
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
        <Th className="w-16" />
      </tr>
    </thead>
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
