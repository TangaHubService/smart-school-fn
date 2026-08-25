import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '../types/api';

const SUBSCRIPTION_PATH = '/admin/subscription';

/**
 * Server-side hard gate: unpaid schools get HTTP 402 on every school-scoped
 * API. When that happens, send the admin to the subscription invoice page.
 */
function handleGlobalQueryError(error: unknown): void {
  if (!(error instanceof ApiClientError) || error.status !== 402) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }
  const { pathname } = window.location;
  if (pathname === SUBSCRIPTION_PATH || pathname.startsWith('/login')) {
    return;
  }
  window.location.assign(SUBSCRIPTION_PATH);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleGlobalQueryError }),
  mutationCache: new MutationCache({ onError: handleGlobalQueryError }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
