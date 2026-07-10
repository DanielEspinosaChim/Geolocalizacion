import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, FotoField, Modal, Spinner, TextareaField } from '@shared/ui';
import { useGuardarVisita } from '../api/useGuardarVisita';
import { usePlantillas } from '../api/usePlantillas';
import type { NegocioCampana } from '../model/campana';
import { elegirPlantilla, type Campo, type DatosVisita, type ValorCampo } from '../model/plantilla';
import { CampoVisita } from './CampoVisita';

interface VisitaModalProps {
  campanaId: string;
  negocio: NegocioCampana;
  onClose: () => void;
}

/**
 * El modal maneja con su propio estado los campos que el backend guarda en
 * columnas propias y no dentro de `datos_json`: las notas y las dos fotos. Se
 * renderizan en la posición que ocupen en la plantilla, no al final, para
 * respetar el orden que eligió el usuario.
 *
 * Cuál es cuál se decide por `tipo`, nunca por `label`, y solo se mira la `key`
 * para desempatar dentro de la plantilla estándar: renombrar un campo en el
 * editor no cambia su key (si lo hiciera, se perderían las respuestas ya
 * guardadas), así que la key deja de describir lo que el campo significa.
 */
const KEY_FOTO_LOCAL = 'foto_local';
/** `foto` es la key de las plantillas viejas, que solo tenían una foto. */
const KEYS_FOTO_NEGOCIO = new Set(['foto_negocio', 'foto']);

type RanuraFoto = 'local' | 'negocio';

/**
 * Decide qué campo de tipo foto va a cada ranura del backend, que solo guarda
 * dos: la del local y la del negocio.
 *
 * No basta con mirar la `key`: un campo de foto creado desde el editor recibe
 * una key aleatoria (`c_<uuid>`), así que se reparten por orden de aparición y
 * las keys conocidas solo sirven para respetar la plantilla estándar. Si la
 * plantilla trae más de dos fotos, las de sobra no tienen dónde guardarse.
 */
function ranurasDeFoto(campos: Campo[]): Map<string, RanuraFoto> {
  const fotos = campos.filter((c) => c.tipo === 'foto');
  const ranuras = new Map<string, RanuraFoto>();
  const libres = new Set<RanuraFoto>(['local', 'negocio']);

  for (const c of fotos) {
    const conocida: RanuraFoto | null =
      c.key === KEY_FOTO_LOCAL ? 'local' : KEYS_FOTO_NEGOCIO.has(c.key) ? 'negocio' : null;
    if (conocida && libres.has(conocida)) {
      ranuras.set(c.key, conocida);
      libres.delete(conocida);
    }
  }
  for (const c of fotos) {
    if (ranuras.has(c.key)) continue;
    const [libre] = libres;
    if (!libre) break;
    ranuras.set(c.key, libre);
    libres.delete(libre);
  }
  return ranuras;
}

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
  const [fotoLocal, setFotoLocal] = useState<File | null>(null);
  const [fotoNegocio, setFotoNegocio] = useState<File | null>(null);
  const [fotoLocalBorrada, setFotoLocalBorrada] = useState(false);
  const [fotoNegocioBorrada, setFotoNegocioBorrada] = useState(false);

  const campos = plantilla?.campos ?? [];

  function setCampo(key: string, valor: ValorCampo) {
    setDatos((prev) => ({ ...prev, [key]: valor }));
  }

  function submit() {
    guardar.mutate(
      {
        negocio,
        datos,
        plantillaId: plantilla?.id ?? '',
        visitado,
        notas,
        fotoLocal,
        fotoNegocio,
        fotoLocalBorrada,
        fotoNegocioBorrada,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Registrar visita" description={negocio.nombre}>
      {isPending ? (
        <Spinner label="Cargando plantilla…" />
      ) : (
        <div className="grid gap-4">
          <SelectorPlantilla
            plantillas={plantillas}
            activa={plantilla?.id}
            onElegir={setPlantillaId}
          />

          <VisitadoToggle visitado={visitado} onChange={setVisitado} />

          <CamposVisita
            campos={campos}
            negocio={negocio}
            datos={datos}
            notas={notas}
            onCampo={setCampo}
            onNotas={setNotas}
            onFotoLocal={(f, borrada) => {
              setFotoLocal(f);
              setFotoLocalBorrada(borrada);
            }}
            onFotoNegocio={(f, borrada) => {
              setFotoNegocio(f);
              setFotoNegocioBorrada(borrada);
            }}
          />

          <Button loading={guardar.isPending} onClick={submit}>
            Guardar visita
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
        { v: true, txt: 'Visitado', mostrarCheck: true, on: 'border-success bg-success/10 text-success' },
        { v: false, txt: 'Pendiente', mostrarCheck: false, on: 'border-fg-muted bg-fg-muted/10 text-fg' },
      ].map(({ v, txt, mostrarCheck, on }) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={visitado === v}
          onClick={() => onChange(v)}
          className={`flex flex-1 items-center justify-center gap-1 rounded-control border py-2 text-sm font-bold transition-colors ${
            visitado === v ? on : 'border-border text-fg-muted'
          }`}
        >
          {mostrarCheck ? <Check className="h-4 w-4" aria-hidden="true" /> : null} {txt}
        </button>
      ))}
    </div>
  );
}

/** Etiqueta + selector de foto (cámara/galería), para el local y el negocio. */
function FotoCampo({
  label,
  valorInicial,
  onChange,
}: {
  label: string;
  valorInicial?: string | null;
  onChange: (foto: File | null, borrada: boolean) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">{label}</span>
      <FotoField valorInicial={valorInicial} onChange={onChange} />
    </div>
  );
}

/** Píldoras para elegir plantilla; se oculta si solo hay una. */
function SelectorPlantilla({
  plantillas,
  activa,
  onElegir,
}: {
  plantillas: { id: string; nombre: string }[];
  activa: string | undefined;
  onElegir: (id: string) => void;
}) {
  if (plantillas.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {plantillas.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onElegir(p.id)}
          className={`rounded-full px-3 py-1 text-xs2 font-semibold ${
            p.id === activa ? 'bg-primary-strong text-primary-fg' : 'border border-border text-fg-muted'
          }`}
        >
          {p.nombre}
        </button>
      ))}
    </div>
  );
}

/** Pinta cada campo de la plantilla en su orden, incluidas notas y fotos. */
function CamposVisita({
  campos,
  negocio,
  datos,
  notas,
  onCampo,
  onNotas,
  onFotoLocal,
  onFotoNegocio,
}: {
  campos: Campo[];
  negocio: NegocioCampana;
  datos: DatosVisita;
  notas: string;
  onCampo: (key: string, v: ValorCampo) => void;
  onNotas: (v: string) => void;
  onFotoLocal: (f: File | null, borrada: boolean) => void;
  onFotoNegocio: (f: File | null, borrada: boolean) => void;
}) {
  const ranuras = ranurasDeFoto(campos);
  // Las notas son la primera caja de párrafo; el resto va a `datos_json`.
  const keyNotas = campos.find((c) => c.tipo === 'textarea')?.key;

  return (
    <>
      {campos.map((campo) => {
        const ranura = ranuras.get(campo.key);
        if (campo.tipo === 'foto') {
          // Una tercera foto no tendría dónde guardarse: no se pinta.
          if (!ranura) return null;
          const esLocal = ranura === 'local';
          return (
            <FotoCampo
              key={campo.key}
              label={campo.label || (esLocal ? 'Foto del local' : 'Foto del negocio')}
              valorInicial={
                esLocal
                  ? negocio.foto_local_url
                  : // Las visitas antiguas guardaban una sola foto aquí.
                    (negocio.foto_negocio_url ?? negocio.foto_visita_url)
              }
              onChange={esLocal ? onFotoLocal : onFotoNegocio}
            />
          );
        }
        if (campo.key === keyNotas) {
          return (
            <TextareaField
              key={campo.key}
              label={campo.label || 'Notas'}
              value={notas}
              onChange={(e) => onNotas(e.target.value)}
            />
          );
        }
        return (
          <CampoVisita
            key={campo.key}
            campo={campo}
            valor={datos[campo.key]}
            onChange={(v) => onCampo(campo.key, v)}
          />
        );
      })}
    </>
  );
}
