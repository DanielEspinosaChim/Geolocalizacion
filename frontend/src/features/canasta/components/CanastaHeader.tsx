import type { RefObject } from 'react';
import { Card, PageHeader } from '@shared/ui';
import type { Mes, VistaCanasta } from '../model/canasta';
import { CanastaAcciones } from './CanastaAcciones';
import { CanastaControles } from './CanastaControles';

interface CanastaHeaderProps {
  year: string;
  onYear: (year: string) => void;
  yearB: string;
  onYearB: (yearB: string) => void;
  aniosB: string[];
  escaneando: boolean;
  onAgregar: () => void;
  onArchivo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileRef: RefObject<HTMLInputElement | null>;
  vista: VistaCanasta;
  onVista: (vista: VistaCanasta) => void;
  meses: Mes[];
  mesesSel: Set<Mes>;
  onToggleMes: (mes: Mes) => void;
}

/**
 * Encabezado + barra de controles de la página. El título va limpio en el
 * PageHeader y TODOS los controles (año, comparación, acciones, modo de vista y
 * meses) viven en una sola Card debajo, para que no se amontonen con el título.
 */
export function CanastaHeader(props: CanastaHeaderProps) {
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="CANACO Servytur"
        title="Canasta básica"
        description="Comparativo mensual del costo de la canasta básica en Mérida."
      />
      <Card className="grid gap-3 p-3">
        <CanastaAcciones
          year={props.year}
          onYear={props.onYear}
          yearB={props.yearB}
          onYearB={props.onYearB}
          aniosB={props.aniosB}
          escaneando={props.escaneando}
          onAgregar={props.onAgregar}
          onArchivo={props.onArchivo}
          fileRef={props.fileRef}
        />
        <div className="border-t border-border pt-3">
          <CanastaControles
            vista={props.vista}
            onVista={props.onVista}
            meses={props.meses}
            mesesSel={props.mesesSel}
            onToggleMes={props.onToggleMes}
          />
        </div>
      </Card>
    </div>
  );
}
