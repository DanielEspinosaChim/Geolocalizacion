import { Camera, Plus } from 'lucide-react';
import type { RefObject } from 'react';
import { Button, Combobox } from '@shared/ui';
import { aniosDisponibles } from '../model/canasta';

/**
 * Controles de datos de la canasta: selector de año, selector de año B de
 * comparación (formato Combobox del sistema) y botones de alta de producto y
 * escaneo de factura. Los dos grupos se separan con `justify-between` para que
 * no se amontonen con el título.
 */
export function CanastaAcciones({
  year,
  onYear,
  yearB,
  onYearB,
  aniosB,
  escaneando,
  onAgregar,
  onArchivo,
  fileRef,
}: {
  year: string;
  onYear: (year: string) => void;
  yearB: string;
  onYearB: (yearB: string) => void;
  aniosB: string[];
  escaneando: boolean;
  onAgregar: () => void;
  onArchivo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex items-center gap-2">
        <div className="w-28">
          <Combobox
            aria-label="Año"
            clearable={false}
            options={aniosDisponibles().map((a) => ({ value: a, label: a }))}
            value={year}
            onChange={(v) => v && onYear(v)}
          />
        </div>
        <div className="w-40">
          <Combobox
            aria-label="Comparar con año"
            placeholder="Sin comparar"
            options={aniosB.map((a) => ({ value: a, label: `vs ${a}` }))}
            value={yearB || null}
            onChange={(v) => onYearB(v ?? '')}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onAgregar}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Producto
        </Button>
        <Button loading={escaneando} onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" aria-hidden="true" /> Escanear factura
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onArchivo}
        />
      </div>
    </div>
  );
}
