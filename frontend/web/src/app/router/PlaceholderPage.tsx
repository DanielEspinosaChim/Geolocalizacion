interface PlaceholderPageProps {
  title: string;
  fase: string;
  descripcion: string;
}

/** Página provisional para features aún no migradas (se sirven en el legacy). */
export function PlaceholderPage({ title, fase, descripcion }: PlaceholderPageProps) {
  return (
    <main className="flex h-full items-center justify-center p-6">
      <section className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{fase}</p>
        <h2 className="mt-2 font-display text-xl font-extrabold">{title}</h2>
        <p className="mt-3 text-sm text-fg-muted">
          {descripcion} Mientras tanto, esta sección sigue disponible en el frontend legacy.
        </p>
      </section>
    </main>
  );
}
