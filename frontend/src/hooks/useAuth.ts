import { useState, useCallback } from "react";
import { authApi } from "@/lib/api";

// Extend window for NIP-07
declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: object) => Promise<object>;
    };
  }
}

type AuthStatus = "idle" | "loading" | "success" | "error";

interface AuthState {
  status: AuthStatus;
  error: string | null;
  pubkey: string | null;
}

/**
 * Build a NIP-22242 auth event to sign
 */
function buildAuthEvent(pubkey: string, challenge: string) {
  return {
    kind: 22242,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["relay", "wss://relay.damus.io"],
      ["challenge", challenge],
    ],
    content: "Streakstr login",
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    status: "idle",
    error: null,
    pubkey: null,
  });

  const reset = useCallback(() => {
    setState({ status: "idle", error: null, pubkey: null });
  }, []);

  /**
   * Login with NIP-07 browser extension (e.g., Alby, nos2x)
   */
  const loginWithExtension = useCallback(async () => {
    setState({ status: "loading", error: null, pubkey: null });

    try {
      // 1. Check if extension is available
      if (!window.nostr) {
        throw new Error(
          "No Nostr extension found. Install Alby, nos2x, or another NIP-07 extension.",
        );
      }

      // 2. Get public key from extension
      const pubkey = await window.nostr.getPublicKey();

      // 3. Request challenge from backend
      const { data: challengeData } = await authApi.getChallenge(pubkey);

      // 4. Build auth event and sign it with extension
      const unsignedEvent = buildAuthEvent(pubkey, challengeData.challenge);
      const signedEvent = await window.nostr.signEvent(unsignedEvent);

      // 5. Send signed event to backend for verification
      const { data: verifyData } = await authApi.verify(signedEvent);

      if (verifyData.success) {
        setState({ status: "success", error: null, pubkey: verifyData.pubkey });
        return verifyData;
      }

      throw new Error("Verification failed");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Extension login failed";
      setState({ status: "error", error: message, pubkey: null });
      throw err;
    }
  }, []);

  /**
   * Login with NIP-46 remote signer (Nostr Connect)
   *
   * Flow:
   * 1. User provides bunker:// URL or we generate a nostrconnect:// URI
   * 2. We connect to the remote signer via Nostr relays
   * 3. Request pubkey and sign the challenge event remotely
   */
  const loginWithRemoteSigner = useCallback(async (bunkerUrl: string) => {
    setState({ status: "loading", error: null, pubkey: null });

    try {
      // Dynamic import to keep bundle smaller when not used
      const { BunkerSigner, parseBunkerInput } =
        await import("nostr-tools/nip46");
      const { generateSecretKey, getPublicKey } =
        await import("nostr-tools/pure");
      const { Relay } = await import("nostr-tools/relay");
      const { SimplePool } = await import("nostr-tools");

      // Parse the bunker URL
      const bunkerInput = await parseBunkerInput(bunkerUrl);

      if (!bunkerInput) {
        throw new Error("Invalid bunker URL");
      }

      // Generate a local keypair for the session
      const clientSecretKey = generateSecretKey();

      // Create the bunker signer and connect
      const pool = new SimplePool();
      const bunker = BunkerSigner.fromBunker(clientSecretKey, bunkerInput, {
        pool,
      });
      await bunker.connect();

      // Get the remote user's pubkey
      const pubkey = await bunker.getPublicKey();

      // Request challenge from backend
      const { data: challengeData } = await authApi.getChallenge(pubkey);

      // Build auth event
      const unsignedEvent = buildAuthEvent(pubkey, challengeData.challenge);

      // Sign with remote signer
      const signedEvent = await bunker.signEvent(unsignedEvent);

      // Send to backend for verification
      const { data: verifyData } = await authApi.verify(signedEvent);

      // Close bunker connection
      await bunker.close();

      if (verifyData.success) {
        setState({ status: "success", error: null, pubkey: verifyData.pubkey });
        return verifyData;
      }

      throw new Error("Verification failed");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Remote signer login failed";
      setState({ status: "error", error: message, pubkey: null });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setState({ status: "idle", error: null, pubkey: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setState({ status: "error", error: message, pubkey: null });
    }
  }, []);

  return {
    ...state,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    loginWithExtension,
    loginWithRemoteSigner,
    logout,
    reset,
  };
}
