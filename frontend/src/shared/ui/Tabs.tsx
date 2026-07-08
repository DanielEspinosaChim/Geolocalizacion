import * as RadixTabs from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';

/** Tabs accesibles (Radix) para navegación dentro de una vista. */
export const Tabs = RadixTabs.Root;

export function TabsList({ className = '', ...rest }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      {...rest}
      className={`flex gap-1 overflow-x-auto border-b border-border ${className}`}
    />
  );
}

export function TabsTrigger({ className = '', ...rest }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      {...rest}
      className={`whitespace-nowrap border-b-2 border-transparent px-3.5 py-2 text-sm font-semibold text-fg-muted transition-colors hover:text-fg data-[state=active]:border-primary data-[state=active]:text-fg ${className}`}
    />
  );
}

export function TabsContent({ className = '', ...rest }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content {...rest} className={`pt-4 ${className}`} />;
}
