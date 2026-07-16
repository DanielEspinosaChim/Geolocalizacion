import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import { Button, Modal, ModalFooter, TextField, toast } from '@shared/ui';
import { usePlantillaMutations } from '../api/usePlantillas';
import { useReordenCampos } from '../api/useReordenCampos';
import { slugify, type Campo, type Plantilla } from '../model/plantilla';
import { CampoEditor } from './CampoEditor';

interface EditorPlantillaProps {
  plantilla: Plantilla | null; // null = nueva
  onClose: () => void;
}

export function EditorPlantilla({ plantilla, onClose }: EditorPlantillaProps) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '');
  const { campos, movidoKey, actualizar, agregar, quitar, mover, reordenar } = useReordenCampos(
    plantilla?.campos ?? [],
  );
  const { guardar } = usePlantillaMutations();

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
          movidoKey={movidoKey}
          onActualizar={actualizar}
          onMover={mover}
          onQuitar={quitar}
          onReordenar={reordenar}
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

/** Las tarjetas de campos, reordenables arrastrando (SortableJS) o con flechas. */
function ListaCampos({
  campos,
  movidoKey,
  onActualizar,
  onMover,
  onQuitar,
  onReordenar,
}: {
  campos: Campo[];
  movidoKey: string | null;
  onActualizar: (i: number, patch: Partial<Campo>) => void;
  onMover: (i: number, dir: -1 | 1) => void;
  onQuitar: (i: number) => void;
  onReordenar: (from: number, to: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Ref al callback para crear Sortable UNA sola vez sin recrearlo en cada render.
  const onReordenarRef = useRef(onReordenar);
  onReordenarRef.current = onReordenar;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sortable = Sortable.create(el, {
      // Se arrastra desde cualquier parte de la card MENOS los controles.
      filter: 'input, textarea, button, a, select',
      preventOnFilter: false, // los clics en inputs/botones siguen funcionando
      animation: 160,
      forceFallback: true, // clon propio que sí podemos inclinar por CSS
      fallbackClass: 'campo-arrastre',
      ghostClass: 'campo-fantasma',
      onEnd: (e) => {
        const { oldIndex, newIndex, item } = e;
        if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
        // SortableJS ya movió el nodo en el DOM; lo revertimos para que React sea
        // la única fuente de orden (si no, choca con su reconciliación y truena).
        el.removeChild(item);
        el.insertBefore(item, el.children[oldIndex] ?? null);
        onReordenarRef.current(oldIndex, newIndex);
      },
    });
    return () => sortable.destroy();
  }, []);

  return (
    <div ref={ref} className="scrollbar-slim grid max-h-80 gap-2 overflow-y-auto">
      {campos.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-5 text-center text-sm text-fg-subtle">
          Sin campos aún
        </p>
      ) : (
        campos.map((campo, i) => (
          <CampoEditor
            key={campo.key}
            campo={campo}
            esPrimero={i === 0}
            esUltimo={i === campos.length - 1}
            recienMovido={movidoKey === campo.key}
            onChange={(patch) => onActualizar(i, patch)}
            onMover={(dir) => onMover(i, dir)}
            onQuitar={() => onQuitar(i)}
          />
        ))
      )}
    </div>
  );
}
