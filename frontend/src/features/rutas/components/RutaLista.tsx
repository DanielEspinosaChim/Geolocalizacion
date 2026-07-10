import { Checkbox } from '@shared/ui';
import { giroLabel, type Candidato } from '@features/candidatos';

const MAX_VISIBLES = 300; // paridad con el legacy

interface RutaListaProps {
  candidatos: Candidato[];
  q: string;
  seleccion: ReadonlySet<string>;
  onToggle: (placeId: string) => void;
  className?: string;
}

/**
 * Lista seleccionable de puntos para la ruta.
 *
 * Cada fila es un `<label>` con un checkbox real dentro: pulsar en cualquier
 * parte de la fila lo marca, y un lector de pantalla lo anuncia como lo que es.
 * Antes era un `<button aria-pressed>` cuya casilla usaba `h-4.5 w-4.5`, clase
 * que Tailwind no genera (su escala salta de 3.5 a 4): la caja medía cero y no
 * se entendía que las filas fueran seleccionables.
 *
 * No scrollea por su cuenta: lo hace el panel que la contiene.
 */
export function RutaLista({ candidatos, q, seleccion, onToggle, className = '' }: RutaListaProps) {
  const texto = q.trim().toLowerCase();
  const filtrados = texto
    ? candidatos.filter((c) => c.nombre.toLowerCase().includes(texto))
    : candidatos;

  return (
    <div className={className}>
      {filtrados.slice(0, MAX_VISIBLES).map((c) => {
        const activo = seleccion.has(c.place_id);
        // Asociación implícita: el <label> envuelve al control. Sin `htmlFor` a
        // propósito — apuntar al input que ya se envuelve hace que el navegador
        // reenvíe el clic al control, la casilla se alterna dos veces y la
        // selección nunca cambia.
        return (
          <label
            key={c.place_id}
            className={`flex w-full cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 transition-colors hover:bg-surface-raised ${
              activo ? 'bg-primary/10' : ''
            }`}
          >
            <Checkbox className="shrink-0" checked={activo} onChange={() => onToggle(c.place_id)} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{c.nombre}</span>
              <span className="block truncate text-xs2 text-fg-muted">
                {giroLabel(c.tipos)}
                {c.colonia_denue ? ` · ${c.colonia_denue.toLowerCase()}` : ''}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
