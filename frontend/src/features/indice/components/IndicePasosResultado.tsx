import { formatNumero } from '@shared/lib/format';
import { Card } from '@shared/ui';
import type { Indice } from '../model/indice';
import { MiniStat, PasoHeader } from './IndicePasos';

const fmt = formatNumero;

/** Paso 3: cruce de cada fuente digital contra las dos oficiales. */
export function Paso3Cruce({ indice }: { indice: Indice }) {
  const f = indice.fuentes;
  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={3} titulo="Cruce entre fuentes: ¿quién es formal?">
        Para cada negocio, buscamos si aparece en el DENUE o en la CANACO. Si coincide con alguno:{' '}
        <b className="text-success">formal confirmado</b>. Si no coincide con ninguno:{' '}
        <b className="text-danger">candidato a informal</b>. El cruce exige similitud de nombre y
        distancia máxima para evitar falsos positivos.
      </PasoHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <CruceTile
          titulo="Cruce con DENUE (INEGI)"
          tono="text-primary"
          filas={[
            ['Google Maps × DENUE', f.gm_denue],
            ['OpenStreetMap × DENUE', f.osm_denue],
          ]}
          total={f.gm_denue + f.osm_denue}
          totalLabel="Total encontrados en DENUE"
        />
        <CruceTile
          titulo="Cruce con CANACO"
          tono="text-primary"
          filas={[
            ['Google Maps × CANACO', f.gm_canaco],
            ['OpenStreetMap × CANACO', f.osm_canaco],
          ]}
          total={f.gm_canaco + f.osm_canaco}
          totalLabel="Total encontrados en CANACO"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-secondary/30 bg-bg p-5">
        <div>
          <h3 className="text-2xs font-bold uppercase tracking-wide text-secondary">
            Cruce Google Maps × OpenStreetMap
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-fg-muted">
            Negocios que aparecen en ambas fuentes digitales (mismo nombre, misma ubicación
            cercana). Este solapamiento es la clave del método Captura-Recaptura → Paso 5.
          </p>
        </div>
        <div className="text-center">
          <div className="font-display text-3xl font-extrabold tabular-nums text-secondary">
            {fmt(f.gm_osm_overlap)}
          </div>
          <div className="text-xs text-fg-muted">coincidencias</div>
        </div>
      </div>
    </Card>
  );
}

function CruceTile({
  titulo,
  tono,
  filas,
  total,
  totalLabel,
}: {
  titulo: string;
  tono: string;
  filas: [string, number][];
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="grid gap-3 rounded-card border border-border bg-bg p-5">
      <h3 className={`text-2xs font-bold uppercase tracking-wide ${tono}`}>{titulo}</h3>
      <div className="grid gap-1.5 text-sm">
        {filas.map(([label, valor]) => (
          <div key={label} className="flex items-center justify-between text-fg-muted">
            <span>{label}</span>
            <span className="font-bold tabular-nums text-fg">{fmt(valor)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-bold text-fg">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{fmt(total)}</span>
      </div>
    </div>
  );
}

/** Paso 4: resultado del inventario — formales vs. candidatos a informal. */
export function Paso4Resultado({ indice }: { indice: Indice }) {
  const d = indice.datos_entrada;
  const total = d.m_overlap + d.n_formales_base + d.n_formales_otros + d.n_inf_observados;

  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={4} titulo="Resultado del inventario: formales vs. informales detectados">
        Con los cruces completados, cada negocio queda clasificado.{' '}
        <b className="text-fg">Importante: solo vemos los informales con presencia digital.</b> Los
        siguientes pasos estiman cuántos hay en total.
      </PasoHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultadoTile
          etiqueta="Formales en DENUE"
          valor={fmt(d.m_overlap)}
          nota="confirmados en el padrón del INEGI"
          tono="text-success"
        />
        <ResultadoTile
          etiqueta="Formales CANACO + cadenas"
          valor={fmt(d.n_formales_base + d.n_formales_otros)}
          nota="identificados por directorio o nombre reconocido"
          tono="text-success"
        />
        <ResultadoTile
          etiqueta="Candidatos a informal"
          valor={fmt(d.n_inf_observados)}
          nota="sin registro en ninguna fuente oficial"
          tono="text-danger"
        />
      </div>

      <p className="rounded-card border border-success/30 bg-success/5 p-4 text-center text-sm text-fg">
        Verificación: {fmt(d.m_overlap)} (DENUE) + {fmt(d.n_formales_base + d.n_formales_otros)}{' '}
        (CANACO + cadenas) + {fmt(d.n_inf_observados)} (informales) ={' '}
        <b className="tabular-nums">{fmt(total)}</b> analizados ✓
      </p>
    </Card>
  );
}

function ResultadoTile({
  etiqueta,
  valor,
  nota,
  tono,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  tono: string;
}) {
  return (
    <Card className="grid gap-1 p-5 text-center">
      <span className="text-xs2 font-bold uppercase tracking-wide text-fg-muted">{etiqueta}</span>
      <span className={`font-display text-2xl font-extrabold tabular-nums ${tono}`}>{valor}</span>
      <span className="text-xs text-fg-muted">{nota}</span>
    </Card>
  );
}

/** Paso 5: derivación completa del estimador Chapman (captura-recaptura). */
export function Paso5Chapman({ indice }: { indice: Indice }) {
  const f = indice.fuentes;
  const c = indice.chapman;

  return (
    <Card raised className="grid gap-5 p-6">
      <PasoHeader numero={5} titulo="Captura-recaptura: ¿cuántos negocios existen en total?" metodo="Método 1">
        Método adoptado de la ecología y la epidemiología para estimar poblaciones a partir del
        solapamiento entre dos muestras independientes. <b className="text-fg">No requiere ningún
        supuesto</b> sobre la visibilidad de los negocios informales — solo los conteos y el cruce
        entre Google Maps y OpenStreetMap.
      </PasoHeader>

      <div className="grid gap-2 rounded-card border border-border bg-bg p-4 text-xs leading-relaxed text-fg-muted">
        <p>
          <b className="text-fg">¿Por qué {fmt(f.gmaps_limpio)} y no {fmt(f.gmaps_limpio + f.osm_total)}?</b> El
          Paso 2 limpió Google Maps a {fmt(f.gmaps_limpio)} negocios reales; OSM venía limpio con
          sus {fmt(f.osm_total)}. Juntos dan {fmt(f.gmaps_limpio + f.osm_total)}, pero el método{' '}
          <b className="text-fg">prohíbe sumarlos</b>: necesita las dos fuentes por separado para
          que el solapamiento entre ellas revele qué tan completa es cada una.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat valor={fmt(f.gmaps_limpio)} etiqueta="Google Maps · n₁" tono="text-secondary" />
        <MiniStat valor={fmt(f.osm_total)} etiqueta="OpenStreetMap · n₂" tono="text-secondary" />
        <MiniStat valor={fmt(f.gm_osm_overlap)} etiqueta="En ambas · m" tono="text-fg" />
      </div>

      <div className="grid gap-2 rounded-card border border-border bg-bg p-4">
        <span className="text-2xs font-bold uppercase tracking-wide text-primary">
          Fórmula de Chapman (estimador insesgado)
        </span>
        <p className="font-mono text-xs tabular-nums text-fg-muted">
          N̂ = (n₁+1)(n₂+1) / (m+1) − 1
        </p>
        <p className="font-mono text-xs tabular-nums text-fg-muted">
          N̂ = ({fmt(f.gmaps_limpio)}+1)({fmt(f.osm_total)}+1) / ({fmt(f.gm_osm_overlap)}+1) − 1
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-fg">
          N̂ = {fmt(c.N_estimado_total)} negocios totales estimados en Mérida
        </p>
      </div>

      <div className="grid gap-1.5 rounded-card border border-primary/30 bg-primary/5 p-4 text-sm">
        <Fila etiqueta="Total estimado de negocios en Mérida" valor={fmt(c.N_estimado_total)} />
        <Fila etiqueta="Menos formales registrados en DENUE Mérida" valor={`− ${fmt(c.n_denue_ancla)}`} />
        <Fila etiqueta="Informales estimados" valor={fmt(c.N_inf_estimado)} tono="text-danger" />
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-bold text-fg">
          <span>Índice Chapman</span>
          <span className="text-lg tabular-nums text-primary">{c.indice_pct}%</span>
        </div>
      </div>
    </Card>
  );
}

function Fila({ etiqueta, valor, tono = 'text-fg' }: { etiqueta: string; valor: string; tono?: string }) {
  return (
    <div className="flex items-center justify-between text-fg-muted">
      <span>{etiqueta}</span>
      <span className={`font-bold tabular-nums ${tono}`}>{valor}</span>
    </div>
  );
}
