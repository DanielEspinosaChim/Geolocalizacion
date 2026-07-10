import { formatNumero } from '@shared/lib/format';
import {
  Badge,
  Page,
  PageHeader,
  QueryBoundary,
  Spinner,
  TBody,
  Table,
  Td,
  Th,
  THead,
  Tr,
} from '@shared/ui';
import { giroLabel } from '@features/candidatos';
import { useMuestraValidacion } from '../api/usePredicciones';

export function ValidacionPage() {
  const query = useMuestraValidacion();
  return (
    <QueryBoundary
      query={query}
      loading={
        <div className="flex h-full items-center justify-center">
          <Spinner label="Cargando muestra…" />
        </div>
      }
    >
      {(data) => (
        <Page width="wide" className="grid gap-8">
          <PageHeader
            eyebrow="Control de calidad"
            title="Validación del cruce"
            description="Muestra de negocios de Google Maps contrastados contra el padrón DENUE, para comprobar a mano que el emparejamiento funciona"
          />

          <section className="grid min-w-0 gap-2">
            <h2 className="font-display font-bold">
              Coincidencias con DENUE{' '}
              <span className="text-xs font-normal text-fg-muted">
                {formatNumero(data.matches.length)} registros
              </span>
            </h2>
            <Table>
              <THead>
                <Tr>
                  <Th>Google</Th>
                  <Th>DENUE</Th>
                  <Th>Score</Th>
                  <Th>Dist.</Th>
                </Tr>
              </THead>
              <TBody>
                {data.matches.map((m, i) => (
                  <Tr key={`${m.nombre}-${i}`}>
                    <Td>{m.nombre}</Td>
                    <Td>{m.nombre_denue ?? '—'}</Td>
                    <Td>
                      <Badge tone={m.fuzzy_score >= 85 ? 'success' : 'warning'}>{m.fuzzy_score}</Badge>
                    </Td>
                    <Td>{m.distancia_m < 9999 ? `${m.distancia_m} m` : '—'}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </section>

          <section className="grid min-w-0 gap-2">
            <h2 className="font-display font-bold">
              Sin coincidencia (candidatos informales){' '}
              <span className="text-xs font-normal text-fg-muted">
                {formatNumero(data.no_matches.length)} registros
              </span>
            </h2>
            <Table>
              <THead>
                <Tr>
                  <Th>Negocio</Th>
                  <Th>Giro</Th>
                  <Th>Lat</Th>
                  <Th>Lng</Th>
                </Tr>
              </THead>
              <TBody>
                {data.no_matches.map((c, i) => (
                  <Tr key={`${c.nombre}-${i}`}>
                    <Td>{c.nombre}</Td>
                    <Td>{giroLabel(c.tipos)}</Td>
                    <Td>{(c.lat ?? 0).toFixed(5)}</Td>
                    <Td>{(c.lng ?? 0).toFixed(5)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </section>
        </Page>
      )}
    </QueryBoundary>
  );
}
