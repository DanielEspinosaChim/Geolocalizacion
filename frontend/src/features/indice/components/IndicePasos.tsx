import type { ReactNode } from 'react';
import { formatNumero } from '@shared/lib/format';
import { Card } from '@shared/ui';
import type { Indice } from '../model/indice';

const fmt = formatNumero;

/** Encabezado numerado común a los 6 pasos de la metodología. */
export function PasoHeader({
  numero,
  metodo,
  titulo,
  children,
}: {
  numero: number;
  metodo?: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-2xs font-bold uppercase tracking-widest text-primary">
        Paso {numero} de 6{metodo ? ` · ${metodo}` : ''}
      </span>
      <h2 className="font-display text-xl font-extrabold text-fg">{titulo}</h2>
      <p className="text-sm leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}

/** Paso 1: las 4 fuentes de información, sin cruzar todavía. */
export function Paso1Fuentes({ indice }: { indice: Indice }) {
  const f = indice.fuentes;
  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={1} titulo="Las 4 fuentes de información">
        Combinamos dos fuentes digitales (Google Maps y OpenStreetMap) y dos oficiales (DENUE del
        INEGI y el directorio de la CANACO). Ninguna fuente sola es suficiente — la precisión viene
        de cruzarlas todas.
      </PasoHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <FuenteTile
          titulo="Google Maps"
          nota="Fuente digital"
          tono="text-secondary"
          borde="border-secondary/30"
          valor={fmt(f.gmaps_raw)}
          leyenda="lugares descargados en Mérida"
          detalle="Negocios con presencia digital activa: cualquier establecimiento que los usuarios de Google reportaron o visitaron."
        />
        <FuenteTile
          titulo="OpenStreetMap"
          nota="Fuente digital"
          tono="text-secondary"
          borde="border-secondary/30"
          valor={fmt(f.osm_total)}
          leyenda="establecimientos mapeados"
          detalle="Base cartográfica colaborativa: sus voluntarios capturan negocios que no aparecen en Google Maps, sobre todo en colonias populares y mercados."
        />
        <FuenteTile
          titulo="DENUE — INEGI"
          nota="Fuente oficial"
          tono="text-primary"
          borde="border-primary/30"
          valor={fmt(f.denue_total)}
          leyenda="negocios formales registrados en la zona"
          detalle="Directorio Nacional de Establecimientos: todos los negocios con RFC activo. Es el padrón oficial y nuestra ancla estadística principal."
        />
        <FuenteTile
          titulo="CANACO Mérida"
          nota="Fuente oficial"
          tono="text-primary"
          borde="border-primary/30"
          valor={fmt(f.canaco_total)}
          leyenda="empresas afiliadas, deduplicadas"
          detalle="Directorio de la Cámara de Comercio: complementa al DENUE con negocios que tienen licencia municipal, sobre todo comercio y servicios."
        />
      </div>
    </Card>
  );
}

function FuenteTile({
  titulo,
  nota,
  tono,
  borde,
  valor,
  leyenda,
  detalle,
}: {
  titulo: string;
  nota: string;
  tono: string;
  borde: string;
  valor: string;
  leyenda: string;
  detalle: string;
}) {
  return (
    <div className={`grid content-start gap-1 rounded-card border bg-bg p-5 ${borde}`}>
      <h3 className={`text-2xs font-bold uppercase tracking-wide ${tono}`}>
        {titulo} <span className="font-normal text-fg-subtle">· {nota}</span>
      </h3>
      <p className="font-display text-3xl font-extrabold tabular-nums text-fg">{valor}</p>
      <p className="text-xs text-fg-muted">{leyenda}</p>
      <p className="mt-2 border-t border-border pt-3 text-xs leading-relaxed text-fg-muted">
        {detalle}
      </p>
    </div>
  );
}

/** Paso 2: qué se descartó de Google Maps antes de analizar. */
export function Paso2Limpieza({ indice }: { indice: Indice }) {
  const f = indice.fuentes;
  const excluidos = f.gmaps_raw - f.gmaps_limpio;
  const categorias = [
    'Iglesias y templos',
    'Escuelas y universidades',
    'Parques y plazas',
    'Hospitales públicos',
    'Oficinas de gobierno',
    'Residencias',
  ];

  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={2} titulo="Limpieza: qué se descartó y por qué">
        No todo lo que aparece en las plataformas digitales es un negocio comercial. Antes de
        analizar, retiramos cualquier lugar que por definición no puede ser informal.
      </PasoHeader>

      <div className="grid gap-3 rounded-card border border-secondary/30 bg-bg p-5">
        <h3 className="text-2xs font-bold uppercase tracking-wide text-secondary">
          Google Maps — requirió limpieza
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <MiniStat valor={fmt(f.gmaps_raw)} etiqueta="descargados" />
          <MiniStat valor={fmt(excluidos)} etiqueta="excluidos" tono="text-danger" />
          <MiniStat valor={fmt(f.gmaps_limpio)} etiqueta="negocios reales" tono="text-success" />
        </div>
        <p className="text-xs leading-relaxed text-fg-muted">
          Google Maps mezcla negocios con lugares que <b className="text-fg">no pueden ser</b>{' '}
          informales. Se eliminaron los {fmt(excluidos)} que caen en alguna de estas categorías:
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categorias.map((c) => (
            <span
              key={c}
              className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-center text-xs2 text-fg-muted"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-2 rounded-card border border-primary/30 bg-bg p-5">
        <h3 className="text-2xs font-bold uppercase tracking-wide text-primary">
          OpenStreetMap — sin exclusiones
        </h3>
        <p className="text-xs leading-relaxed text-fg-muted">
          OSM lo construyen voluntarios que <b className="text-fg">mapean únicamente negocios</b> —
          no agregan parques, iglesias ni escuelas. Por eso sus {fmt(f.osm_total)} registros pasan
          directo al análisis, sin necesitar limpieza.
        </p>
      </div>

      <p className="rounded-card border border-border bg-bg p-4 text-center text-sm text-fg">
        <b className="tabular-nums">{fmt(f.gmaps_limpio + f.osm_total)}</b> negocios reales bajo
        análisis{' '}
        <span className="text-fg-subtle">
          · {fmt(f.gmaps_limpio)} de Google Maps + {fmt(f.osm_total)} de OpenStreetMap
        </span>
      </p>
    </Card>
  );
}

/**
 * El color va en la ETIQUETA, nunca en el número: una fila de stats con cada
 * valor de un color distinto se lee como "arcoíris" y el ojo no sabe a cuál
 * prestarle atención. El número siempre es tinta neutra (`text-fg`).
 */
export function MiniStat({
  valor,
  etiqueta,
  tono = 'text-fg-muted',
}: {
  valor: string;
  etiqueta: string;
  tono?: string;
}) {
  return (
    <div>
      <div className="font-display text-xl font-extrabold tabular-nums text-fg">{valor}</div>
      <div className={`text-xs font-semibold ${tono}`}>{etiqueta}</div>
    </div>
  );
}
