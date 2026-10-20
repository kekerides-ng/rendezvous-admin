'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * One QueryClient per browser session, created in state rather than at module
 * scope — a module-level client is shared across requests on the server, which
 * leaks one admin's cached data into another's render.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // An admin console is read-often; refetching on every window focus
            // is noise against a backend that is not changing that fast.
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
