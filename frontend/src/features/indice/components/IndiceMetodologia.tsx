import { Landmark, Map } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatNumero } from '@shared/lib/format';
import { Card } from '@shared/ui';
import type { Indice } from '../model/indice';

const fmt = formatNumero;

/** De dónde salen los dos registros y cómo se reparten los negocios reales. */
export function ConjuntosDeDatos({ indice }: { indice: Indice }) {
  const d = indice.datos_entrada;
  const excluidos = d.n_gmaps_csv - d.n_gmaps_negocios;

  return (
    <Card raised className="grid gap-5 p-6">
      <h2 className="text-2xs font-bold uppercase tracking-widest text-primary">
        Los dos conjuntos de datos
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Fuente
          icon={<Map className="h-4 w-4" aria-hidden="true" />}
          titulo="Tu descarga de Google Maps"
          tono="text-warning"
          borde="border-warning/30"
          valor={fmt(d.n_gmaps_csv)}
          nota="registros descargados del CSV"
        >
          <p className="text-danger">− {fmt(excluidos)} excluidos (parques, escuelas, iglesias…)</p>
          <p className="font-bold text-warning">
            = {fmt(d.n_gmaps_negocios)} negocios reales analizados
          </p>
        </Fuente>

        <Fuente
          icon={<Landmark className="h-4 w-4" aria-hidden="true" />}
          titulo="DENUE — registro oficial"
          tono="text-primary"
          borde="border-primary/30"
          valor={fmt(d.N1_denue)}
          nota="negocios formales registrados"
        >
          <p>Este es el universo conocido de formales.</p>
          <p>Es completo: el gobierno los tiene todos.</p>
        </Fuente>
      </div>

      <div className="grid gap-3 rounded-card border border-border bg-bg p-4">
        <p className="text-2xs font-bold uppercase tracking-wide text-fg-subtle">
          De los {fmt(d.n_gmaps_negocios)} negocios reales analizados:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Reparto
            valor={fmt(d.n_formales_total)}
            leyenda="son negocios formales"
            flecha="→ FORMALES confirmados"
            tono="text-success"
            borde="border-success/30"
            detalle={`${fmt(d.m_overlap)} DENUE · ${fmt(d.n_formales_otros)} cadena/tipo · ${fmt(d.n_formales_base)} padrón municipal`}
          />
          <Reparto
            valor={fmt(d.n_inf_observados)}
            leyenda="sin registro formal"
            flecha="→ INFORMALES detectados"
            tono="text-danger"
            borde="border-danger/30"
          />
        </div>
        <p className="text-center text-2xs text-fg-subtle">
          {fmt(d.n_formales_total)} + {fmt(d.n_inf_observados)} = {fmt(d.n_gmaps_negocios)} ✓
        </p>
      </div>
    </Card>
  );
}

function Fuente({
  icon,
  titulo,
  tono,
  borde,
  valor,
  nota,
  children,
}: {
  icon: ReactNode;
  titulo: string;
  tono: string;
  borde: string;
  valor: string;
  nota: string;
  children: ReactNode;
}) {
  return (
    <div className={`grid content-start gap-1 rounded-card border bg-bg p-5 ${borde}`}>
      <h3
        className={`flex items-center gap-2 text-2xs font-bold uppercase tracking-wide ${tono}`}
      >
        {icon} {titulo}
      </h3>
      <p className="font-display text-3xl font-extrabold tabular-nums text-fg">{valor}</p>
      <p className="text-2xs text-fg-subtle">{nota}</p>
      <div className="mt-2 grid gap-0.5 border-t border-border pt-3 text-2xs text-fg-muted">
        {children}
      </div>
    </div>
  );
}

function Reparto({
  valor,
  leyenda,
  flecha,
  tono,
  borde,
  detalle,
}: {
  valor: string;
  leyenda: string;
  flecha: string;
  tono: string;
  borde: string;
  detalle?: string;
}) {
  return (
    <div className={`grid gap-1 rounded-card border bg-surface p-4 text-center ${borde}`}>
      <p className={`font-display text-2xl font-extrabold tabular-nums ${tono}`}>{valor}</p>
      <p className="text-2xs text-fg-subtle">{leyenda}</p>
      <p className={`text-2xs font-bold ${tono}`}>{flecha}</p>
      {detalle ? <p className="mt-1 text-2xs text-fg-subtle">{detalle}</p> : null}
    </div>
  );
}

/** Los tres pasos del estimador de razón, con los números ya sustituidos. */
export function ComoSeEstima({ indice }: { indice: Indice }) {
  const d = indice.datos_entrada;
  const escenarioBase = indice.escenarios[0];
  const nInf = escenarioBase?.N_inf_estimado ?? 0;

  return (
    <Card raised className="grid gap-3 p-6">
      <h2 className="text-2xs font-bold uppercase tracking-widest text-primary">
        ¿Cómo estimamos el total real?
      </h2>

      <Paso numero={1} titulo='Medir el "lente" de Google Maps'>
        <p>
          Google Maps capturó <b className="text-success">{fmt(d.m_overlap)}</b> de los{' '}
          <b className="text-primary">{fmt(d.N1_denue)}</b> formales del DENUE. Es decir, solo
          &laquo;ve&raquo; el <b className="text-primary">{indice.cobertura_gmaps_pct}%</b> de la
          realidad formal.
        </p>
        <Formula>
          p̂ = {fmt(d.m_overlap)} / {fmt(d.N1_denue)} = {indice.cobertura_gmaps_pct}%
        </Formula>
      </Paso>

      <Paso numero={2} titulo="Escalar los informales al universo real">
        <p>
          Si Google Maps solo ve el {indice.cobertura_gmaps_pct}%, los{' '}
          <b className="text-danger">{fmt(d.n_inf_observados)}</b> informales detectados también son
          esa fracción del total. Escalarlos da{' '}
          <b className="text-danger">{fmt(nInf)}</b> informales.
        </p>
        <Formula>
          N̂_inf = {fmt(d.n_inf_observados)} × ({fmt(d.N1_denue)} / {fmt(d.m_overlap)}) ={' '}
          {fmt(d.n_inf_observados)} × {indice.multiplicador}
        </Formula>
      </Paso>

      <Paso numero={3} titulo="Índice de informalidad">
        <p>Informales estimados ÷ (formales DENUE + informales estimados).</p>
        <Formula>
          {fmt(nInf)} / ({fmt(d.N1_denue)} + {fmt(nInf)}) ={' '}
          <b className="text-danger">{escenarioBase?.indice_pct ?? 0}%</b> (límite inferior)
        </Formula>
      </Paso>
    </Card>
  );
}

function Paso({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-card border border-border bg-bg p-4">
      <h3 className="text-2xs font-bold uppercase tracking-wide text-warning">
        Paso {numero} · {titulo}
      </h3>
      <div className="grid gap-2 text-xs leading-relaxed text-fg-muted">{children}</div>
    </div>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return <p className="text-2xs tabular-nums text-fg-subtle">Fórmula: {children}</p>;
}
