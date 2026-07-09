import { ChevronDown } from 'lucide-react';
import { useId, useState, type PropsWithChildren, type ReactNode } from 'react';

interface PanelSectionProps extends PropsWithChildren {
  /** Se muestra en versalitas; describe el bloque ("Clic en el mapa"). */
  title: string;
  /** Slot a la derecha del título (contador, botón de acción…). */
  action?: ReactNode;
  /** Deja que el bloque crezca y haga scroll propio dentro del panel. */
  grow?: boolean;
  /** Añade un chevron para plegar el contenido. */
  collapsible?: boolean;
  /** Estado inicial cuando es plegable. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Bloque de un panel lateral: título en versalitas con marca de acento y su
 * contenido, separado del siguiente por una regla. Es el ritmo visual de los
 * paneles de mapa, predicción, rutas y reportes.
 *
 * `action` queda fuera del botón que pliega: anidar un botón dentro de otro es
 * HTML inválido y rompe la navegación por teclado.
 */
export function PanelSection({
  title,
  action,
  grow,
  collapsible = false,
  defaultOpen = true,
  className = '',
  children,
}: PanelSectionProps) {
  const [abierta, setAbierta] = useState(defaultOpen);
  const contenidoId = useId();
  const visible = !collapsible || abierta;

  return (
    <section
      className={`grid content-start gap-2.5 border-b border-border p-3 last:border-b-0 ${
        // Plegada no debe reclamar el espacio flexible del panel.
        grow && visible ? 'min-h-0 flex-1 overflow-y-auto' : ''
      } ${className}`}
    >
      {/* Pegajoso: con todas las secciones abiertas el panel es largo, y el
          encabezado (con su chevron) debe seguir al alcance mientras se baja.
          Los márgenes negativos lo estiran de borde a borde para que el
          contenido no asome por los lados al pasar por debajo. */}
      <header className="sticky top-0 z-panel -mx-3 -mt-3 flex items-center justify-between gap-2 bg-surface px-3 pb-2 pt-3">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={abierta}
            aria-controls={contenidoId}
            onClick={() => setAbierta((v) => !v)}
            className="group -m-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-control p-1 text-left transition-colors hover:bg-surface-raised"
          >
            <Acento />
            <Titulo>{title}</Titulo>
            <ChevronDown
              aria-hidden="true"
              className={`ml-auto h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform duration-fast ease-out group-hover:text-fg ${
                abierta ? '' : '-rotate-90'
              }`}
            />
          </button>
        ) : (
          <h2 className="flex min-w-0 items-center gap-1.5">
            <Acento />
            <Titulo>{title}</Titulo>
          </h2>
        )}
        {action}
      </header>
      {/* `hidden` como atributo no basta: la utilidad `grid` de Tailwind gana en
          la cascada y el bloque seguiría visible. Se alterna la clase. */}
      <div id={contenidoId} className={visible ? 'grid content-start gap-2.5' : 'hidden'}>
        {children}
      </div>
    </section>
  );
}

/** Marca de acento a la izquierda del título; identifica el bloque de un vistazo. */
function Acento() {
  return <span aria-hidden="true" className="h-3 w-0.5 shrink-0 rounded-full bg-primary" />;
}

function Titulo({ children }: { children: ReactNode }) {
  return (
    <span className="truncate text-2xs font-bold uppercase tracking-wider text-fg-subtle">
      {children}
    </span>
  );
}
