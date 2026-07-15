import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRef, useState, type PointerEvent, type PropsWithChildren, type ReactNode } from 'react';

export type SheetSnap = 'peek' | 'half' | 'full';

/** Alturas de reposo del cajón, como desplazamiento desde ARRIBA del contenedor. */
const SNAP_OFFSET: Record<SheetSnap, string> = {
  full: '2.5rem', // deja asomar una franja de mapa
  half: '50%',
  peek: 'calc(100% - 4.5rem)', // solo el asa + título
};

const ALTO_PEEK_PX = 72;
const OFFSET_FULL_PX = 40;
/** Bajo este desplazamiento el gesto cuenta como tap, no como arrastre. */
const UMBRAL_TAP_PX = 6;
/** Arrastrar el asa más de esto por debajo de "peek" oculta el cajón del todo. */
const UMBRAL_OCULTAR_PX = 64;

/** Estado y manejadores del arrastre del cajón (extraído para acotar el componente). */
function useSheetDrag(initialSnap: SheetSnap) {
  const [snap, setSnap] = useState<SheetSnap>(initialSnap);
  // Arranca oculto: solo se ve la pastilla flotante; se despliega al pulsarla.
  const [oculto, setOculto] = useState(true);
  /** px desde arriba mientras se arrastra; null = en reposo sobre un snap. */
  const [offsetPx, setOffsetPx] = useState<number | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const gesto = useRef<{ yInicial: number; offsetInicial: number } | null>(null);

  /** Los snaps en px dependen del alto real del contenedor (cambia al rotar). */
  function snapsPx(): Record<SheetSnap, number> {
    const alto = sheetRef.current?.parentElement?.clientHeight ?? window.innerHeight;
    return { full: OFFSET_FULL_PX, half: alto * 0.5, peek: alto - ALTO_PEEK_PX };
  }

  function onPointerDown(e: PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { yInicial: e.clientY, offsetInicial: snapsPx()[snap] };
  }

  function onPointerMove(e: PointerEvent) {
    if (!gesto.current) return;
    const { yInicial, offsetInicial } = gesto.current;
    const limites = snapsPx();
    // Se permite arrastrar un poco por debajo de "peek" para poder ocultarlo.
    const y = Math.min(
      Math.max(offsetInicial + e.clientY - yInicial, limites.full),
      limites.peek + UMBRAL_OCULTAR_PX,
    );
    setOffsetPx(y);
  }

  function onPointerUp(e: PointerEvent) {
    if (!gesto.current) return;
    const { yInicial, offsetInicial } = gesto.current;
    const recorrido = e.clientY - yInicial;
    gesto.current = null;
    setOffsetPx(null);

    if (Math.abs(recorrido) < UMBRAL_TAP_PX) {
      // Tap en el asa: cicla hacia arriba y desde full vuelve a plegarse.
      setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek');
      return;
    }
    const limites = snapsPx();
    const destino = offsetInicial + recorrido;
    if (destino > limites.peek + UMBRAL_OCULTAR_PX / 2) {
      setOculto(true);
      return;
    }
    const cercano = (Object.keys(limites) as SheetSnap[]).reduce((a, b) =>
      Math.abs(limites[a] - destino) <= Math.abs(limites[b] - destino) ? a : b,
    );
    setSnap(cercano);
  }

  const restaurar = () => {
    setOculto(false);
    setSnap(initialSnap);
  };

  return {
    sheetRef,
    snap,
    oculto,
    offsetPx,
    ocultar: () => setOculto(true),
    restaurar,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}

interface BottomSheetProps extends PropsWithChildren {
  /** Siempre visible, incluso plegado: di QUÉ hay dentro ("Filtros", "Herramientas"…). */
  title: ReactNode;
  initialSnap?: SheetSnap;
  /** El consumidor decide cuándo existe (típicamente `md:hidden`). */
  className?: string;
}

/**
 * Cajón inferior estilo Google Maps para móvil: el mapa queda siempre visible
 * y las herramientas viven en una hoja con tres alturas (peek/half/full) que
 * se arrastra desde el asa o cicla con un tap. Se puede ocultar del todo (botón
 * de la cabecera o arrastrando hacia abajo) y reaparece con una pastilla flotante.
 *
 * Se posiciona `absolute` dentro del contenedor relativo de la vista de mapa
 * (no `fixed`): así nunca tapa el header ni las tabs. El wrapper es
 * `pointer-events-none` para que el mapa siga recibiendo gestos alrededor.
 */
export function BottomSheet({ title, initialSnap = 'half', className = '', children }: BottomSheetProps) {
  const { sheetRef, snap, oculto, offsetPx, ocultar, restaurar, handlers } = useSheetDrag(initialSnap);

  if (oculto) {
    return <PastillaReabrir title={title} className={className} onReabrir={restaurar} />;
  }

  const arrastrando = offsetPx !== null;

  return (
    <div className={`pointer-events-none absolute inset-0 z-panel overflow-hidden ${className}`}>
      <section
        ref={sheetRef}
        aria-label={typeof title === 'string' ? title : 'Panel de herramientas'}
        className={`anim-slide-up pointer-events-auto absolute inset-x-0 top-0 flex h-full flex-col rounded-t-2xl border border-b-0 glass-panel ${
          arrastrando ? '' : 'transition-transform duration-300 ease-out'
        }`}
        style={{ transform: `translateY(${arrastrando ? `${offsetPx}px` : SNAP_OFFSET[snap]})` }}
      >
        {/* Asa de arrastre. `touch-none`: el gesto vertical es del cajón, no del
            scroll de la página. El botón de la derecha lo oculta del todo. */}
        <header
          className="shrink-0 cursor-grab touch-none select-none px-4 pb-2 pt-2 active:cursor-grabbing"
          {...handlers}
        >
          <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-fg-subtle/40" />
          <div className="mt-2 flex items-center justify-between gap-2 text-sm font-bold text-fg">
            <span className="flex items-center gap-2">{title}</span>
            <button
              type="button"
              aria-label="Ocultar panel"
              // El pointerdown del asa no debe capturar el clic de este botón.
              onPointerDown={(e) => e.stopPropagation()}
              onClick={ocultar}
              className="rounded-full p-1 text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
            >
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>
        {/* `overscroll-contain`: al llegar al tope del scroll interno el gesto no
            se escapa al documento. flex-col para que los `mt-auto` de los pies de
            panel funcionen igual que en el sidebar de escritorio. */}
        <div className="scrollbar-slim flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </section>
    </div>
  );
}

/** Pastilla flotante que reabre el cajón cuando está oculto. */
function PastillaReabrir({
  title,
  className,
  onReabrir,
}: {
  title: ReactNode;
  className: string;
  onReabrir: () => void;
}) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-panel flex justify-center p-3 ${className}`}>
      <button
        type="button"
        onClick={onReabrir}
        className="pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold text-fg glass-panel"
      >
        <ChevronUp className="h-4 w-4" aria-hidden="true" /> {title}
      </button>
    </div>
  );
}
