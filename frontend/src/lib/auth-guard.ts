import { redirect } from "@tanstack/react-router";
import { authApi } from "@/lib/api";

export interface AuthUser {
  pubkey: string;
  user: object | null;
  authenticated: boolean;
}

/**
 * Fetch the current auth status from the backend.
 * Called once in the root route's beforeLoad.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const { data } = await authApi.me();
    if (data.authenticated) return data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Use in `beforeLoad` for routes that require authentication.
 * Reads auth from parent route context — no extra API call.
 */
export function requireAuth({ context }: { context: { auth: AuthUser | null } }) {
  if (!context.auth) {
    throw redirect({ to: "/login" });
  }
  return { user: context.auth };
}

/**
 * Use in `beforeLoad` for guest-only routes (e.g. /login).
 * Reads auth from parent route context — no extra API call.
 */
export function requireGuest({ context }: { context: { auth: AuthUser | null } }) {
  if (context.auth) {
    throw redirect({ to: "/dashboard" });
  }
}
