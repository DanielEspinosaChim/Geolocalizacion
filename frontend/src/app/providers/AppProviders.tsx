import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { queryClient } from '@core/query';
import { ConfirmProvider, Toaster } from '@shared/ui';

// Composition root de providers.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>{children}</ConfirmProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
