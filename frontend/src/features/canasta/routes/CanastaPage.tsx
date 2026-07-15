import { Camera, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chip, Page, PageHeader, QueryBoundary, SelectField, Spinner } from '@shared/ui';
import { useCanasta } from '../api/useCanasta';
import { useEscanearFactura } from '../api/scanInvoice';
import { AgregarProductoModal } from '../components/AgregarProductoModal';
import { CanastaContenido } from '../components/CanastaContenido';
import { EscaneoModal } from '../components/EscaneoModal';
import {
  aniosDisponibles,
  mesesVisibles,
  mesLabel,
  type Mes,
  type ScanItem,
  type VistaCanasta,
} from '../model/canasta';

const VISTAS: { id: VistaCanasta; label: string }[] = [
  { id: 'precios', label: 'Precios' },
  { id: 'variacion', label: 'Variación %' },
  { id: 'trimestres', label: 'Trimestres' },
];

export function CanastaPage() {
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [yearB, setYearB] = useState<string>('');
  const [vista, setVista] = useState<VistaCanasta>('precios');
  const [mesesSel, setMesesSel] = useState<Set<Mes>>(new Set());
  const [modalAgregar, setModalAgregar] = useState(false);
  const [scan, setScan] = useState<{ open: boolean; items: ScanItem[] }>({ open: false, items: [] });
  const fileRef = useRef<HTMLInputElement>(null);

  const canasta = useCanasta(year);
  const canastaB = useCanasta(yearB, { enabled: yearB !== '' });
  const escanear = useEscanearFactura(year);
  const meses = useMemo(() => mesesVisibles(year), [year]);

  // Al cambiar de año (o cargar por primera vez) se seleccionan todos los
  // meses disponibles, igual que el módulo original.
  useEffect(() => {
    setMesesSel(new Set(meses));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const mesesTabla = meses.filter((m) => mesesSel.has(m));
  const aniosB = aniosDisponibles().filter((a) => a !== year);

  function toggleMes(m: Mes) {
    setMesesSel((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size > 1) next.delete(m); // siempre queda al menos un mes visible
      } else {
        next.add(m);
      }
      return next;
    });
  }

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
            <div className="w-32">
              <SelectField
                label=""
                aria-label="Comparar con año"
                value={yearB}
                onChange={(e) => setYearB(e.target.value)}
              >
                <option value="">— sin comparar —</option>
                {aniosB.map((a) => (
                  <option key={a} value={a}>
                    vs {a}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="group" aria-label="Modo de vista">
          {VISTAS.map((v) => (
            <Chip key={v.id} tone="primary" active={vista === v.id} onClick={() => setVista(v.id)}>
              {v.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Meses visibles">
          {meses.map((m) => (
            <Chip key={m} tone="primary" active={mesesSel.has(m)} onClick={() => toggleMes(m)}>
              {mesLabel(m)}
            </Chip>
          ))}
        </div>
      </div>

      <QueryBoundary query={canasta}>
        {(productos) => (
          <CanastaContenido
            productos={productos}
            year={year}
            meses={meses}
            mesesTabla={mesesTabla}
            vista={vista}
            yearB={yearB || null}
            productosB={yearB ? (canastaB.data ?? null) : null}
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
