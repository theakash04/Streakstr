import { QueryClient } from "@tanstack/react-query";

const FIVE_MINUTES = 5 * 60_000;

export const STREAKS_STALE_TIME = 60_000;
export const STREAKS_REFETCH_INTERVAL = 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STREAKS_STALE_TIME,
      gcTime: FIVE_MINUTES,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
