import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Badge, Button, Card, IconButton, Modal, Spinner } from '@shared/ui';
import { usePlantillaMutations, usePlantillas } from '../api/usePlantillas';
import type { Plantilla } from '../model/plantilla';
import { EditorPlantilla } from './EditorPlantilla';

/** null = editor cerrado; { plantilla } = editando (plantilla null → nueva). */
type EstadoEditor = { plantilla: Plantilla | null } | null;

export function PlantillasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: plantillas = [], isPending } = usePlantillas();
  const { eliminar } = usePlantillaMutations();
  const [editor, setEditor] = useState<EstadoEditor>(null);

  if (editor) {
    return <EditorPlantilla plantilla={editor.plantilla} onClose={() => setEditor(null)} />;
  }

  return (
    <Modal open={open} onClose={onClose} title="Plantillas de visita">
      <div className="grid gap-2">
        {isPending ? (
          <Spinner label="Cargando plantillas…" />
        ) : (
          plantillas.map((p) => (
            <Card raised key={p.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="truncate">{p.nombre}</span>
                  {p.es_default ? <Badge tone="info">default</Badge> : null}
                </div>
                <div className="text-[10px] text-fg-subtle">
                  {p.campos.length} campos{p.descripcion ? ` · ${p.descripcion}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setEditor({ plantilla: p })}>
                  Editar
                </Button>
                {!p.es_default ? (
                  <IconButton variant="danger" size="sm" icon={Trash2} label="Eliminar plantilla" onClick={() => eliminar.mutate(p.id)} />
                ) : null}
              </div>
            </Card>
          ))
        )}
        <Button onClick={() => setEditor({ plantilla: null })}>+ Nueva plantilla</Button>
      </div>
    </Modal>
  );
}
