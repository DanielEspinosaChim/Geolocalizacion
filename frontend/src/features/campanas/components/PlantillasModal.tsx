import { useState } from 'react';
import { Badge, Button, Modal, Spinner } from '@shared/ui';
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
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface-raised p-3">
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
                <Button variant="secondary" onClick={() => setEditor({ plantilla: p })} className="px-3 py-1 text-xs">
                  Editar
                </Button>
                {!p.es_default ? (
                  <Button variant="ghost" onClick={() => eliminar.mutate(p.id)} className="px-2 py-1 text-xs text-danger" aria-label="Eliminar plantilla">
                    🗑
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
        <Button onClick={() => setEditor({ plantilla: null })}>+ Nueva plantilla</Button>
      </div>
    </Modal>
  );
}
