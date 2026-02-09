import type { NostrEvent, UnsignedEvent } from "../types/nostr.d.ts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ChallengeResponse {
  challenge: string;
  expiresAt: number;
}

interface VerifyResponse {
  success: boolean;
  pubkey: string;
  expiresAt: number;
}

export interface AuthMeResponse {
  pubkey: string;
  user: {
    name?: string;
    display_name?: string;
    picture?: string;
    nip05?: string;
    lud16?: string;
    website?: string;
  } | null;
  authenticated: boolean;
}

/**
 * Request a challenge from the backend
 */
export async function requestChallenge(
  pubkey: string,
): Promise<ChallengeResponse> {
  const response = await fetch(`${API_BASE}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ pubkey }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Failed to get challenge");
  }

  return response.json();
}

/**
 * Verify a signed event with the backend
 */
export async function verifySignedEvent(
  signedEvent: NostrEvent,
): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ signedEvent }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Verification failed" }));
    throw new Error(error.error || "Failed to verify signature");
  }

  return response.json();
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthMeResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

/**
 * Check if NIP-07 extension is available
 */
export function hasNip07Extension(): boolean {
  return typeof window !== "undefined" && typeof window.nostr !== "undefined";
}

/**
 * Get public key from NIP-07 extension
 */
export async function getPublicKeyFromExtension(): Promise<string> {
  if (!hasNip07Extension()) {
    throw new Error(
      "No Nostr extension found. Please install Alby, nos2x, or another NIP-07 compatible extension.",
    );
  }

  return window.nostr!.getPublicKey();
}

/**
 * Sign a challenge event using NIP-07 extension
 */
export async function signChallengeWithNip07(
  challenge: string,
  pubkey: string,
): Promise<NostrEvent> {
  if (!hasNip07Extension()) {
    throw new Error("No Nostr extension found");
  }

  const unsignedEvent: UnsignedEvent = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["challenge", challenge],
      ["relay", window.location.origin],
    ],
    content: "Streakstr authentication",
  };

  return window.nostr!.signEvent(unsignedEvent);
}

/**
 * Complete login flow using NIP-07
 */
export async function loginWithNip07(): Promise<{
  pubkey: string;
  expiresAt: number;
}> {
  // Step 1: Get pubkey from extension
  const pubkey = await getPublicKeyFromExtension();

  // Step 2: Request challenge from backend
  const { challenge } = await requestChallenge(pubkey);

  // Step 3: Sign challenge with extension
  const signedEvent = await signChallengeWithNip07(challenge, pubkey);

  // Step 4: Verify with backend (sets cookie)
  const result = await verifySignedEvent(signedEvent);

  return { pubkey: result.pubkey, expiresAt: result.expiresAt };
}
