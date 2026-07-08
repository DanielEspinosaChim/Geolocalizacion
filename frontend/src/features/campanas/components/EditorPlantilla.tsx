import { useState } from 'react';
import { Button, Modal, TextField, toast } from '@shared/ui';
import { usePlantillaMutations } from '../api/usePlantillas';
import { slugify, type Campo, type Plantilla } from '../model/plantilla';
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

export function EditorPlantilla({ plantilla, onClose }: EditorPlantillaProps) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '');
  const [campos, setCampos] = useState<Campo[]>(plantilla?.campos ?? []);
  const { guardar } = usePlantillaMutations();

  function actualizar(i: number, patch: Partial<Campo>) {
    setCampos((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  function agregar() {
    setCampos((prev) => [...prev, { key: `c_${Date.now()}`, label: '', tipo: 'texto' }]);
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
      { id: plantilla?.id ?? null, body: { nombre: nombre.trim(), descripcion: descripcion.trim(), campos: limpios } },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title={plantilla ? 'Editar plantilla' : 'Nueva plantilla'} width="lg">
      <div className="grid gap-3">
        <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <TextField label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
            {campos.length} campo{campos.length === 1 ? '' : 's'}
          </span>
          <Button variant="secondary" onClick={agregar} className="text-xs">
            + Añadir campo
          </Button>
        </div>

        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {campos.map((campo, i) => (
            <CampoEditor
              key={campo.key}
              campo={campo}
              esPrimero={i === 0}
              esUltimo={i === campos.length - 1}
              onChange={(patch) => actualizar(i, patch)}
              onMover={(dir) => setCampos((prev) => moverEnArray(prev, i, dir))}
              onQuitar={() => setCampos((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          {campos.length === 0 ? (
            <p className="rounded-card border border-dashed border-border p-5 text-center text-sm text-fg-subtle">
              Sin campos aún
            </p>
          ) : null}
        </div>

        <Button disabled={guardar.isPending} onClick={submit}>
          {guardar.isPending ? 'Guardando…' : 'Guardar plantilla'}
        </Button>
      </div>
    </Modal>
  );
}
