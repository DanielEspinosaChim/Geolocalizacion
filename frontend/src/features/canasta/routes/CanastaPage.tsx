import { useEffect, useMemo, useRef, useState } from 'react';
import { Page, QueryBoundary } from '@shared/ui';
import { useCanasta } from '../api/useCanasta';
import { useEscanearFactura } from '../api/scanInvoice';
import { AgregarProductoModal } from '../components/AgregarProductoModal';
import { CanastaContenido } from '../components/CanastaContenido';
import { CanastaHeader } from '../components/CanastaHeader';
import { EscaneoModal, EscaneoOverlay } from '../components/EscaneoModal';
import {
  aniosDisponibles,
  mesesVisibles,
  type Mes,
  type ScanItem,
  type VistaCanasta,
} from '../model/canasta';

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
      <CanastaHeader
        year={year}
        onYear={setYear}
        yearB={yearB}
        onYearB={setYearB}
        aniosB={aniosB}
        escaneando={escanear.isPending}
        onAgregar={() => setModalAgregar(true)}
        onArchivo={onArchivo}
        fileRef={fileRef}
        vista={vista}
        onVista={setVista}
        meses={meses}
        mesesSel={mesesSel}
        onToggleMes={toggleMes}
      />

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

      <EscaneoOverlay activo={escanear.isPending} />
    </Page>
  );
}
