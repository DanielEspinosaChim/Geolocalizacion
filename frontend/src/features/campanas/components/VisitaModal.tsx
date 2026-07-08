import { useMemo, useState } from 'react';
import { Button, FotoField, Modal, Spinner } from '@shared/ui';
import { useGuardarVisita } from '../api/useGuardarVisita';
import { usePlantillas } from '../api/usePlantillas';
import type { NegocioCampana } from '../model/campana';
import { elegirPlantilla, type DatosVisita, type ValorCampo } from '../model/plantilla';
import { CampoVisita } from './CampoVisita';

interface VisitaModalProps {
  campanaId: string;
  negocio: NegocioCampana;
  onClose: () => void;
}

/** Campos fijos que el modal maneja aparte de la plantilla. */
const CAMPOS_FIJOS = new Set(['notas', 'foto']);

export function VisitaModal({ campanaId, negocio, onClose }: VisitaModalProps) {
  const { data: plantillas = [], isPending } = usePlantillas();
  const guardar = useGuardarVisita(campanaId);

  const [plantillaId, setPlantillaId] = useState<string | null>(negocio.plantilla_id ?? null);
  const plantilla = useMemo(
    () => elegirPlantilla(plantillas, plantillaId),
    [plantillas, plantillaId],
  );

  const [datos, setDatos] = useState<DatosVisita>(
    () => (negocio.visita_datos as DatosVisita | undefined) ?? {},
  );
  const [visitado, setVisitado] = useState(negocio.completado);
  const [notas, setNotas] = useState(negocio.notas ?? '');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoBorrada, setFotoBorrada] = useState(false);

  const camposDinamicos = (plantilla?.campos ?? []).filter((c) => !CAMPOS_FIJOS.has(c.key));

  function setCampo(key: string, valor: ValorCampo) {
    setDatos((prev) => ({ ...prev, [key]: valor }));
  }

  function submit() {
    guardar.mutate(
      { negocio, datos, plantillaId: plantilla?.id ?? '', visitado, notas, foto, fotoBorrada },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Registrar visita" description={negocio.nombre}>
      {isPending ? (
        <Spinner label="Cargando plantilla…" />
      ) : (
        <div className="grid gap-4">
          {plantillas.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {plantillas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlantillaId(p.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    p.id === plantilla?.id ? 'bg-primary-strong text-primary-fg' : 'border border-border text-fg-muted'
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          ) : null}

          <VisitadoToggle visitado={visitado} onChange={setVisitado} />

          {camposDinamicos.map((campo) => (
            <CampoVisita key={campo.key} campo={campo} valor={datos[campo.key]} onChange={(v) => setCampo(campo.key, v)} />
          ))}

          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Notas</span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="h-20 resize-y rounded-control border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <div className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Foto</span>
            <FotoField
              valorInicial={negocio.foto_visita_url}
              onChange={(f, borrada) => {
                setFoto(f);
                setFotoBorrada(borrada);
              }}
            />
          </div>

          <Button disabled={guardar.isPending} onClick={submit}>
            {guardar.isPending ? 'Guardando…' : 'Guardar visita'}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function VisitadoToggle({ visitado, onChange }: { visitado: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1.5">
      {[
        { v: true, txt: '✓ Visitado', on: 'border-success bg-success/10 text-success' },
        { v: false, txt: 'Pendiente', on: 'border-fg-muted bg-fg-muted/10 text-fg' },
      ].map(({ v, txt, on }) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={visitado === v}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-control border py-2 text-sm font-bold transition-colors ${
            visitado === v ? on : 'border-border text-fg-muted'
          }`}
        >
          {txt}
        </button>
      ))}
    </div>
  );
}
