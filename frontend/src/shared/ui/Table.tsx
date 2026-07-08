import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

/** Tabla semántica; el contenedor hace el scroll horizontal, nunca la página. */
export function Table({ className = '', children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table {...rest} className={`w-full border-collapse text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={`bg-surface-raised ${props.className ?? ''}`} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function Tr({ className = '', ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      {...rest}
      className={`border-b border-border transition-colors last:border-b-0 hover:bg-surface-raised/50 ${className}`}
    />
  );
}

export function Th({ className = '', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...rest}
      className={`px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-fg-subtle ${className}`}
    />
  );
}

export function Td({ className = '', ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...rest} className={`px-3.5 py-2.5 align-top ${className}`} />;
}
