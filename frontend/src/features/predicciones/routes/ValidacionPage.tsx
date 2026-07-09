import { Badge, Spinner, TBody, Table, Td, Th, THead, Tr } from '@shared/ui';
import { giroLabel } from '@features/candidatos';
import { useMuestraValidacion } from '../api/usePredicciones';

export function ValidacionPage() {
  const { data, isPending } = useMuestraValidacion();

  if (isPending || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Cargando muestra…" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 overflow-y-auto p-4 lg:grid-cols-2">
      <section className="grid gap-2">
        <h2 className="font-display font-bold">
          Coincidencias con DENUE{' '}
          <span className="text-xs font-normal text-fg-muted">
            {data.matches.length.toLocaleString('es-MX')} registros
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

      <section className="grid gap-2">
        <h2 className="font-display font-bold">
          Sin coincidencia (candidatos informales){' '}
          <span className="text-xs font-normal text-fg-muted">
            {data.no_matches.length.toLocaleString('es-MX')} registros
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
    </div>
  );
}
