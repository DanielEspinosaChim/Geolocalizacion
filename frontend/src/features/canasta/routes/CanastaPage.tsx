import { Camera, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Page, PageHeader, QueryBoundary, SelectField, Spinner } from '@shared/ui';
import { useCanasta } from '../api/useCanasta';
import { useEscanearFactura } from '../api/scanInvoice';
import { AgregarProductoModal } from '../components/AgregarProductoModal';
import { CanastaContenido } from '../components/CanastaContenido';
import { EscaneoModal } from '../components/EscaneoModal';
import { aniosDisponibles, mesesVisibles, type ScanItem } from '../model/canasta';

export function CanastaPage() {
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [modalAgregar, setModalAgregar] = useState(false);
  const [scan, setScan] = useState<{ open: boolean; items: ScanItem[] }>({ open: false, items: [] });
  const fileRef = useRef<HTMLInputElement>(null);

  const canasta = useCanasta(year);
  const escanear = useEscanearFactura(year);
  const meses = mesesVisibles(year);

  function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a subir la misma imagen
    if (!file) return;
    escanear.mutate(file, { onSuccess: (items) => setScan({ open: true, items }) });
  }

  return (
    <Page width="wide" className="grid gap-5">
      <PageHeader
        eyebrow="CANACO Servytur"
        title="Canasta básica"
        description="Comparativo mensual del costo de la canasta básica en Mérida."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-24">
              <SelectField label="" aria-label="Año" value={year} onChange={(e) => setYear(e.target.value)}>
                {aniosDisponibles().map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setModalAgregar(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Producto
            </Button>
            <Button size="sm" loading={escanear.isPending} onClick={() => fileRef.current?.click()}>
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
        }
      />

      <QueryBoundary query={canasta}>
        {(productos) => (
          <CanastaContenido
            productos={productos}
            year={year}
            meses={meses}
            onAgregar={() => setModalAgregar(true)}
          />
        )}
      </QueryBoundary>

      <AgregarProductoModal year={year} open={modalAgregar} onClose={() => setModalAgregar(false)} />
      <EscaneoModal
        year={year}
        items={scan.items}
        open={scan.open}
        onClose={() => setScan((s) => ({ ...s, open: false }))}
      />

      {escanear.isPending ? (
        <div className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-3 bg-black/50">
          <Spinner className="h-10 w-10 text-white" />
          <p className="text-sm font-semibold text-white">Analizando la factura con IA…</p>
        </div>
      ) : null}
    </Page>
  );
}
