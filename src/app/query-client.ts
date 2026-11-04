import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '../types/api';

/**
 * Server-side hard gate: locked schools get HTTP 402 on school-scoped APIs.
 * Re-check access so the invoice payment gate in the app shell opens.
 */
function handleGlobalQueryError(error: unknown): void {
  if (!(error instanceof ApiClientError) || error.status !== 402) {
    return;
  }
  const access = queryClient.getQueryData<{ blocked: boolean }>(['billing', 'access']);
  if (!access?.blocked) {
    // A page can fail several requests at once, so join any check already running.
    void queryClient.refetchQueries({ queryKey: ['billing', 'access'] }, { cancelRefetch: false });
  }
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
