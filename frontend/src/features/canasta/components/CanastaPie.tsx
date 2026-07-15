import {
  promediosTrimestralesCanasta,
  type Mes,
  type Producto,
  type Trimestre,
} from '../model/canasta';

export function PieTabla({
  meses,
  totales,
  year,
  yearB,
  totalesB,
}: {
  meses: Mes[];
  totales: (number | null)[];
  year: string;
  yearB: string | null;
  totalesB: (number | null)[] | null;
}) {
  return (
    <tfoot className="text-xs2">
      <tr className="border-t-2 border-border bg-surface-raised font-bold text-fg">
        <td colSpan={3} className="px-3 py-2">
          TOTAL
        </td>
        {totales.map((t, i) => (
          <td key={meses[i]} className="px-2 py-2 text-right tabular-nums">
            {t != null ? `$${t.toFixed(2)}` : ''}
          </td>
        ))}
        <td />
      </tr>
      {yearB != null && totalesB != null ? (
        <FilaAnioB year={year} yearB={yearB} meses={meses} totales={totales} totalesB={totalesB} />
      ) : null}
      <FilaComparativa
        etiqueta="Diferencia vs mes anterior"
        meses={meses}
        valores={totales.map((t, i) => {
          const prev = totales[i - 1];
          if (i === 0 || t == null || prev == null) return null;
          return { texto: `${t - prev > 0 ? '+' : ''}$${(t - prev).toFixed(2)}`, sube: t - prev > 0 };
        })}
      />
      <FilaComparativa
        etiqueta="% vs mes anterior"
        meses={meses}
        valores={totales.map((t, i) => {
          const prev = totales[i - 1];
          if (i === 0 || t == null || prev == null || prev === 0) return null;
          const pct = ((t - prev) / prev) * 100;
          return { texto: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, sube: pct > 0 };
        })}
      />
    </tfoot>
  );
}

/**
 * Fila comparativa anual del pie: total del año B y % de diferencia
 * `(totalA − totalB) / totalB` con la etiqueta "$totalB → +x%".
 */
function FilaAnioB({
  year,
  yearB,
  meses,
  totales,
  totalesB,
}: {
  year: string;
  yearB: string;
  meses: Mes[];
  totales: (number | null)[];
  totalesB: (number | null)[];
}) {
  return (
    <tr className="border-t border-border/60 bg-surface-raised/60">
      <td colSpan={3} className="px-3 py-1.5 text-fg-subtle">
        <span className="font-bold text-primary">{year}</span> vs{' '}
        <span className="font-bold">{yearB}</span>
        <span className="text-2xs"> — diferencia anual</span>
      </td>
      {totalesB.map((tB, i) => {
        if (tB == null) return <td key={meses[i]} />;
        const tA = totales[i];
        if (tA == null) {
          return (
            <td key={meses[i]} className="px-2 py-1.5 text-right tabular-nums text-fg-subtle">
              ${tB.toFixed(2)}
            </td>
          );
        }
        const pct = tB > 0 ? ((tA - tB) / tB) * 100 : null;
        const clase =
          pct == null || pct === 0 ? 'text-fg-subtle' : pct > 0 ? 'text-danger' : 'text-success';
        return (
          <td key={meses[i]} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
            <span className="text-2xs text-fg-subtle">${tB.toFixed(2)} → </span>
            <span className={`font-bold ${clase}`}>
              {pct != null ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
            </span>
          </td>
        );
      })}
      <td />
    </tr>
  );
}

/** Pie de la vista Trimestres: promedio trimestral de los totales mensuales. */
export function PieTrimestres({
  productos,
  trimestres,
  meses,
}: {
  productos: Producto[];
  trimestres: Trimestre[];
  meses: Mes[];
}) {
  const promedios = promediosTrimestralesCanasta(productos, trimestres, meses);
  return (
    <tfoot className="text-xs2">
      <tr className="border-t-2 border-border bg-surface-raised font-bold text-fg">
        <td colSpan={3} className="px-3 py-2">
          PROMEDIO CANASTA
        </td>
        {promedios.map((t, i) => (
          <td key={trimestres[i].key} className="px-2 py-2 text-right tabular-nums">
            {t != null ? `$${t.toFixed(2)}` : ''}
          </td>
        ))}
        <td />
      </tr>
    </tfoot>
  );
}

function FilaComparativa({
  etiqueta,
  meses,
  valores,
}: {
  etiqueta: string;
  meses: Mes[];
  valores: ({ texto: string; sube: boolean } | null)[];
}) {
  return (
    <tr className="border-t border-border/60 bg-surface-raised/60">
      <td colSpan={3} className="px-3 py-1.5 text-fg-subtle">
        {etiqueta}
      </td>
      {valores.map((v, i) => (
        <td
          key={meses[i]}
          className={`px-2 py-1.5 text-right font-bold tabular-nums ${
            v ? (v.sube ? 'text-danger' : 'text-success') : ''
          }`}
        >
          {v?.texto ?? ''}
        </td>
      ))}
      <td />
    </tr>
  );
}
