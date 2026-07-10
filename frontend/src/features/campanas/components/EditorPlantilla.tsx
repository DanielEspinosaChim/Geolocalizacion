import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Modal, ModalFooter, TextField, toast } from '@shared/ui';
import { usePlantillaMutations } from '../api/usePlantillas';
import { nuevaKeyCampo, slugify, type Campo, type Plantilla } from '../model/plantilla';
import { CampoEditor } from './CampoEditor';

interface EditorPlantillaProps {
  plantilla: Plantilla | null; // null = nueva
  onClose: () => void;
}

function moverEnArray<T>(arr: T[], from: number, dir: -1 | 1): T[] {
  const to = from + dir;
  if (to < 0 || to >= arr.length) return arr;
  const copia = [...arr];
  [copia[from], copia[to]] = [copia[to], copia[from]];
  return copia;
}

/** Saca el elemento de `from` y lo inserta en `to` (arrastrar y soltar). */
function reubicar<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= arr.length) return arr;
  const copia = [...arr];
  const [movido] = copia.splice(from, 1);
  if (movido === undefined) return arr;
  copia.splice(to, 0, movido);
  return copia;
}

export function EditorPlantilla({ plantilla, onClose }: EditorPlantillaProps) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '');
  const [campos, setCampos] = useState<Campo[]>(plantilla?.campos ?? []);
  const [arrastrado, setArrastrado] = useState<number | null>(null);
  const origen = useRef<number | null>(null);
  const { guardar } = usePlantillaMutations();

  function actualizar(i: number, patch: Partial<Campo>) {
    setCampos((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  function agregar() {
    setCampos((prev) => [...prev, { key: nuevaKeyCampo(), label: '', tipo: 'texto' }]);
  }

  /** Al pasar por encima de otra tarjeta, se reordena en vivo. */
  function alEntrar(i: number) {
    if (origen.current === null || origen.current === i) return;
    const desde = origen.current;
    setCampos((prev) => reubicar(prev, desde, i));
    origen.current = i;
    setArrastrado(i);
  }

  function submit() {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    const limpios = campos
      .filter((c) => c.label.trim())
      .map((c) => ({ ...c, key: c.key || slugify(c.label) }));
    guardar.mutate(
      {
        id: plantilla?.id ?? null,
        body: {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          campos: limpios,
          // Sin esto, editar la plantilla estándar le quitaba su `es_default` y
          // el modal de visita dejaba de preseleccionarla.
          es_default: plantilla?.es_default ?? false,
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title={plantilla ? 'Editar plantilla' : 'Nueva plantilla'} width="lg">
      <div className="grid gap-3">
        <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <TextField label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />

        <div className="flex items-center justify-between">
          <span className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
            {campos.length} campo{campos.length === 1 ? '' : 's'}
          </span>
          <Button variant="secondary" size="sm" onClick={agregar}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Añadir campo
          </Button>
        </div>

        <ListaCampos
          campos={campos}
          arrastrado={arrastrado}
          onActualizar={actualizar}
          onMover={(i, dir) => setCampos((prev) => moverEnArray(prev, i, dir))}
          onQuitar={(i) => setCampos((prev) => prev.filter((_, j) => j !== i))}
          onDragStart={(i) => {
            origen.current = i;
            setArrastrado(i);
          }}
          onDragEnter={alEntrar}
          onDragEnd={() => {
            origen.current = null;
            setArrastrado(null);
          }}
        />

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardar.isPending} onClick={submit}>
            Guardar plantilla
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

/** Las tarjetas de campos, reordenables arrastrando o con las flechas. */
function ListaCampos({
  campos,
  arrastrado,
  onActualizar,
  onMover,
  onQuitar,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  campos: Campo[];
  arrastrado: number | null;
  onActualizar: (i: number, patch: Partial<Campo>) => void;
  onMover: (i: number, dir: -1 | 1) => void;
  onQuitar: (i: number) => void;
  onDragStart: (i: number) => void;
  onDragEnter: (i: number) => void;
  onDragEnd: () => void;
}) {
  if (campos.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border p-5 text-center text-sm text-fg-subtle">
        Sin campos aún
      </p>
    );
  }
  return (
    <div className="scrollbar-slim grid max-h-80 gap-2 overflow-y-auto">
      {campos.map((campo, i) => (
        <CampoEditor
          key={campo.key}
          campo={campo}
          esPrimero={i === 0}
          esUltimo={i === campos.length - 1}
          arrastrando={arrastrado === i}
          onChange={(patch) => onActualizar(i, patch)}
          onMover={(dir) => onMover(i, dir)}
          onQuitar={() => onQuitar(i)}
          onDragStart={() => onDragStart(i)}
          onDragEnter={() => onDragEnter(i)}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}
