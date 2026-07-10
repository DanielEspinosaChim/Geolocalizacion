import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, Chip, IconButton } from '@shared/ui';
import { CAMPO_TIPO_LABELS, CAMPO_TIPOS, type Campo } from '../model/plantilla';

interface CampoEditorProps {
  campo: Campo;
  esPrimero: boolean;
  esUltimo: boolean;
  arrastrando: boolean;
  onChange: (patch: Partial<Campo>) => void;
  onMover: (dir: -1 | 1) => void;
  onQuitar: () => void;
  /** Arrastrar y soltar para reordenar con el ratón. */
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

export function CampoEditor({
  campo,
  esPrimero,
  esUltimo,
  arrastrando,
  onChange,
  onMover,
  onQuitar,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: CampoEditorProps) {
  return (
    <Card
      raised
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      // Sin preventDefault el navegador no permite soltar sobre este elemento.
      onDragOver={(e: React.DragEvent) => e.preventDefault()}
      className={`grid cursor-grab gap-2 p-3 active:cursor-grabbing ${
        arrastrando ? 'opacity-50 ring-1 ring-primary' : ''
      }`}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        {/* Las flechas se quedan: arrastrar no es accesible por teclado. */}
        <div className="flex flex-col">
          <IconButton
            size="sm"
            icon={ChevronUp}
            label="Subir campo"
            disabled={esPrimero}
            onClick={() => onMover(-1)}
            className="h-5"
          />
          <IconButton
            size="sm"
            icon={ChevronDown}
            label="Bajar campo"
            disabled={esUltimo}
            onClick={() => onMover(1)}
            className="h-5"
          />
        </div>
        <input
          value={campo.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Nombre del campo…"
          aria-label="Nombre del campo"
          className="flex-1 rounded-control border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <IconButton variant="danger" size="sm" icon={X} label="Quitar campo" onClick={onQuitar} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CAMPO_TIPOS.map((t) => (
          <Chip
            key={t}
            tone="primary"
            active={campo.tipo === t}
            onClick={() => onChange({ tipo: t, ...(t !== 'opciones' ? { opciones: null } : {}) })}
          >
            {CAMPO_TIPO_LABELS[t]}
          </Chip>
        ))}
      </div>

      {campo.tipo === 'opciones' ? <EditorOpciones campo={campo} onChange={onChange} /> : null}
    </Card>
  );
}

/**
 * Lista de opciones separadas por coma.
 *
 * Conserva el texto tal cual se escribe. Antes el `value` se recalculaba con
 * `opciones.join(', ')` en cada tecla, así que al teclear la coma el
 * `filter(Boolean)` descartaba el hueco vacío y la coma desaparecía sola: era
 * imposible escribir más de una opción.
 */
function EditorOpciones({
  campo,
  onChange,
}: {
  campo: Campo;
  onChange: (patch: Partial<Campo>) => void;
}) {
  const [texto, setTexto] = useState(() => (campo.opciones ?? []).join(', '));

  // Solo re-sincroniza si las opciones cambian desde fuera (no al teclear).
  useEffect(() => {
    setTexto((actual) => {
      const desdeCampo = (campo.opciones ?? []).join(', ');
      const parseado = actual
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .join(', ');
      return parseado === desdeCampo ? actual : desdeCampo;
    });
  }, [campo.opciones]);

  return (
    <div className="grid gap-1">
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange({
            opciones: e.target.value
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          });
        }}
        placeholder="Sí, Tal vez, No"
        aria-label="Opciones separadas por coma"
        className="rounded-control border border-border bg-bg px-3 py-2 text-xs outline-none focus:border-primary"
      />
      <p className="text-2xs text-fg-subtle">Separa cada opción con una coma.</p>
    </div>
  );
}
