import { QueryClient } from '@tanstack/react-query';

// TanStack Query owns *server* state (REST reads, caching, retries). Client/UI
// state (viewport, layer toggles, playback) lives in Zustand — see src/stores.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 2,
      },
    },
  });
}
