import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createContext, useCallback, ReactNode, useContext } from "react";
import {
  loginWithNip07,
  logout as logoutApi,
  getCurrentUser,
  hasNip07Extension,
  type AuthMeResponse,
} from "@/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  pubkey: string | null;
  user: AuthMeResponse | null;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasExtension: boolean;
  clearError: () => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
    },
  },
});

// Auth query key
export const AUTH_QUERY_KEY = ["auth", "me"] as const;

function AuthProviderInner({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Use TanStack Query for /auth/me
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: false, // Don't retry auth errors
  });

  const login = useCallback(async () => {
    if (user) return; // Already authenticated

    try {
      await loginWithNip07();
      // Invalidate and refetch after login
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    } catch (err) {
      throw err;
    }
  }, [user, queryClient]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore logout errors
    }
    // Clear cached auth data
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  }, [queryClient]);

  const clearError = useCallback(() => {
    // React Query handles errors internally
  }, []);

  const refetchUser = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        pubkey: user?.pubkey ?? null,
        user: user ?? null,
        isLoading,
        error: error instanceof Error ? error.message : null,
        login,
        logout,
        hasExtension: hasNip07Extension(),
        clearError,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </QueryClientProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export async function getAuthFromCache(): Promise<AuthMeResponse | null> {
  try {
    const user = await queryClient.fetchQuery({
      queryKey: AUTH_QUERY_KEY,
      queryFn: getCurrentUser,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
    return user;
  } catch (error) {
    console.error("Auth check failed:", error);
    return null;
  }
}

export function formatPubkey(pubkey: string): string {
  if (pubkey.length <= 20) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
}
