import { BarChart3 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { formatNumero } from '@shared/lib/format';
import { Card, PageHeader, QueryBoundary, Spinner } from '@shared/ui';
import { useIndice } from '../api/useIndice';
import type { Indice } from '../model/indice';
import { IndiceCalculadora } from './IndiceCalculadora';
import { CurvaSensibilidad, IndiceDashboard } from './IndiceDashboard';
import { Paso1Fuentes, Paso2Limpieza, PasoHeader } from './IndicePasos';
import { Paso3Cruce, Paso4Resultado, Paso5Chapman } from './IndicePasosResultado';
import { Reveal } from './Reveal';

/** Vista del índice de informalidad (estimador de razón / multiplier method). */
export function IndicePanel() {
  const query = useIndice();
  return (
    <QueryBoundary
      query={query}
      loading={
        <div className="flex justify-center p-6">
          <Spinner label="Cargando índice…" />
        </div>
      }
    >
      {(data) => (
        <div className="grid gap-6">
          <Encabezado indice={data} />
          {/* Lo que se viene a ver va primero: el rango final y qué tan fresca
              está la estimación con las validaciones de campo de hoy. La
              metodología completa queda debajo para quien quiera profundizar.
              Cada sección entra en escena al llegar al viewport (Reveal). */}
          <Reveal>
            <Conclusion indice={data} />
          </Reveal>
          <Reveal>
            <IndiceDashboard indice={data} />
          </Reveal>
          <Reveal>
            <IndiceCalculadora indice={data} />
          </Reveal>
          <Reveal>
            <Paso1Fuentes indice={data} />
          </Reveal>
          <Reveal>
            <Paso2Limpieza indice={data} />
          </Reveal>
          <Reveal>
            <Paso3Cruce indice={data} />
          </Reveal>
          <Reveal>
            <Paso4Resultado indice={data} />
          </Reveal>
          <Reveal>
            <Paso5Chapman indice={data} />
          </Reveal>
          <Reveal>
            <Sensibilidad indice={data} />
          </Reveal>
          <Reveal>
            <Referencias indice={data} />
          </Reveal>
        </div>
      )}
    </QueryBoundary>
  );
}

function Encabezado({ indice }: { indice: Indice }) {
  return (
    <PageHeader
      eyebrow={`Metodología · ${indice.metodo}`}
      title="Índice de Informalidad"
      description="Mérida, Yucatán · Estimación estadística basada en dos registros con solapamiento conocido"
    />
  );
}

/**
 * Hero de conclusión: marino de marca fijo en ambos temas (tokens --appbar,
 * como la barra superior) con el rango estimado como cifra protagonista y los
 * dos métodos como paneles translúcidos. La retícula de puntos es el mismo
 * guiño a "plano de mapa" del login.
 */
function Conclusion({ indice }: { indice: Indice }) {
  const limiteSuperior = indice.escenarios.find((e) => e.alpha === 0.4);
  const bajo = indice.chapman.indice_pct;
  const alto = limiteSuperior?.indice_pct;

  return (
    <Card className="relative overflow-hidden border-transparent bg-appbar bg-gradient-to-br from-appbar-strong to-appbar text-appbar-fg shadow-overlay">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(hsl(0_0%_100%/0.07)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div className="relative grid gap-6 p-6 md:p-8">
        <div className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-widest text-appbar-fg/60">
            Conclusión
          </span>
          <h2 className="font-display text-xl font-extrabold">
            Rango de informalidad estimado para Mérida
          </h2>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="font-display text-6xl font-extrabold leading-none tracking-tight tabular-nums">
            {bajo}%{alto != null ? ` – ${alto}%` : ''}
          </span>
          <span className="max-w-xs text-sm leading-snug text-appbar-fg/70">
            de los establecimientos operarían fuera del registro formal
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ConclusionTile
            etiqueta="Método captura-recaptura"
            valor={`${bajo}%`}
            nota="Sin supuestos · Chapman"
          />
          <ConclusionTile
            etiqueta={
              <>
                LÍMITE SUPERIOR · <span className="normal-case">α</span> = 0.40
              </>
            }
            valor={alto != null ? `${alto}%` : '—'}
            nota="Multiplicador · escenario realista"
          />
        </div>

        {indice.referencia_inegi ? (
          <div className="grid gap-1.5 rounded-card border border-appbar-fg/15 bg-appbar-fg/10 p-5">
            <div className="flex items-center gap-2 text-xs2 font-bold uppercase tracking-widest">
              <BarChart3 className="h-4 w-4" aria-hidden="true" /> Validación externa · INEGI 2023
            </div>
            <p className="text-sm leading-relaxed text-appbar-fg/90">
              {indice.referencia_inegi}
              {alto != null
                ? ` Nuestro rango estimado de ${bajo}%–${alto}% es coherente con esa referencia nacional, confirmando que la metodología produce resultados realistas.`
                : null}
            </p>
            <p className="text-xs leading-relaxed text-appbar-fg/60">
              Nota: el INEGI mide informalidad laboral (trabajadores). Esta medición es de
              establecimientos. La coherencia entre ambas valida el método, no implica que sean
              equivalentes.
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ConclusionTile({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: ReactNode;
  valor: string;
  nota: string;
}) {
  return (
    <div className="grid gap-2 rounded-card border border-appbar-fg/15 bg-appbar-fg/10 p-6 text-center">
      <span className="text-xs2 font-bold uppercase tracking-wide text-appbar-fg/70">
        {etiqueta}
      </span>
      <span className="font-display text-4xl font-extrabold tabular-nums">{valor}</span>
      <span className="text-xs text-appbar-fg/60">{nota}</span>
    </div>
  );
}

function Sensibilidad({ indice }: { indice: Indice }) {
  const central = indice.escenarios.find((e) => e.alpha === 0.65);
  const pInfCentral = Math.round(indice.cobertura_gmaps_pct * 0.65 * 100) / 100;

  return (
    <Card raised className="grid gap-4 p-6">
      <PasoHeader numero={6} titulo="Método multiplicador: ajuste por visibilidad digital" metodo="Método 2">
        Un negocio informal no tiene dirección registrada, no solicita reseñas, no tiene ficha en
        Google. Por tanto, Google Maps lo captura con menor probabilidad que a uno formal. El
        parámetro <span className="normal-case">α</span> cuantifica esa brecha: con α=0.65, Google
        Maps detecta a un informal con el 65% de la probabilidad con que detecta a uno formal.
      </PasoHeader>

      <div className="grid gap-1.5 rounded-card border border-border bg-bg p-4 text-xs leading-relaxed text-fg-muted">
        <p>
          Google Maps + OSM capturan el <b className="text-fg">{indice.cobertura_gmaps_pct}%</b> de
          los negocios formales del DENUE.
        </p>
        {central ? (
          <p>
            Con α = 0.65 → capturan informales al <b className="text-fg">{pInfCentral}%</b> (65% de
            esa tasa). Los {formatNumero(indice.datos_entrada.n_inf_observados)} informales
            observados son solo esa fracción del total real:{' '}
            <b className="text-fg">informales observados ÷ tasa efectiva de captura</b>.
          </p>
        ) : null}
      </div>

      {/* La misma sensibilidad, en curva: índice % contra α, con el Chapman
          como referencia punteada — se dibuja al llegar al viewport. */}
      <div className="rounded-card border border-border bg-bg p-4">
        <h3 className="mb-1 text-sm font-bold text-fg">Índice según α</h3>
        <p className="mb-2 text-2xs text-fg-subtle">
          a menor visibilidad asumida del informal, mayor índice estimado
        </p>
        <CurvaSensibilidad indice={indice} />
      </div>

      <div className="grid gap-2">
        {indice.escenarios.map((e) => (
          <Escenario key={e.etiqueta} escenario={e} />
        ))}
      </div>
    </Card>
  );
}

function Escenario({ escenario }: { escenario: Indice['escenarios'][number] }) {
  const sinMovimiento = useReducedMotion();
  const ancho = `${Math.min(100, escenario.indice_pct * 1.2)}%`;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-fg">
          {escenario.etiqueta}{' '}
          <span className="font-normal text-fg-muted">α = {escenario.alpha.toFixed(2)}</span>
        </span>
        <span className="text-sm font-extrabold tabular-nums text-fg">
          {escenario.indice_pct}%{' '}
          <span className="text-xs font-normal text-fg-muted">
            {formatNumero(escenario.N_inf_estimado)} inf. est.
          </span>
        </span>
      </div>
      {/* Riel + barra animada (motion): crece de 0 al valor al entrar en
          vista, igual que el resto de las barras de progreso del sistema
          (ProgresoHero, AnilloProgreso). */}
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: sinMovimiento ? ancho : '0%' }}
          whileInView={{ width: ancho }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function Referencias({ indice }: { indice: Indice }) {
  if (!indice.referencias.length) return null;
  return (
    <Card raised className="grid gap-2 p-6">
      <h2 className="text-xs2 font-bold uppercase tracking-widest text-fg-muted">
        Referencias metodológicas
      </h2>
      <ul className="grid gap-1 text-xs leading-relaxed text-fg-muted">
        {indice.referencias.map((ref) => (
          <li key={ref}>· {ref}</li>
        ))}
      </ul>
    </Card>
  );
}
