import { useState, useCallback, useRef } from "react";
import { authApi } from "@/lib/api";
import type { SimplePool } from "nostr-tools";

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

// Fallback relays in case backend is unreachable
const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://nos.lol"];

/**
 * Fetch relay URLs from backend, fallback to defaults
 */
async function fetchRelays(): Promise<string[]> {
  try {
    const { data } = await authApi.getRelays();
    return data.relays?.length ? data.relays : DEFAULT_RELAYS;
  } catch {
    return DEFAULT_RELAYS;
  }
}

/**
 * Build a NIP-22242 auth event to sign (with multiple relay tags)
 */
function buildAuthEvent(pubkey: string, challenge: string, relays: string[]) {
  return {
    kind: 22242,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [...relays.map((r) => ["relay", r]), ["challenge", challenge]],
    content: "Streakstr login",
  };
}

export interface QRLoginSession {
  uri: string;
  promise: Promise<object>;
  abort: () => void;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    status: "idle",
    error: null,
    pubkey: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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

      // 2. Get relays from backend
      const relays = await fetchRelays();

      // 3. Get public key from extension
      const pubkey = await window.nostr.getPublicKey();

      // 4. Request challenge from backend
      const { data: challengeData } = await authApi.getChallenge(pubkey);

      // 5. Build auth event and sign it with extension
      const unsignedEvent = buildAuthEvent(
        pubkey,
        challengeData.challenge,
        relays,
      );
      const signedEvent = await window.nostr.signEvent(unsignedEvent);

      // 6. Send signed event to backend for verification
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
 * DROP-IN REPLACEMENT for loginWithRemoteSigner in useAuth.ts
 *
 * Fixes:
 *  - Added timeouts (connect: 30s, getPublicKey: 15s, signEvent: 60s)
 *  - Pool is always closed in finally block
 *  - Better error messages at each stage
 *  - Handles trailing slashes in relay URLs (nostr-tools handles these fine)
 *  - Console logs at each step so you can see exactly where it stalls
 *
 * Tested bunker URL format:
 *   bunker://7c5e22315050689f460252bc42b1dec133503490bc2d7b658e464b7eb355de05
 *     ?relay=wss://relay.nsec.app/
 *     &relay=wss://nostr.oxtr.dev/
 *     &relay=wss://theforest.nostr1.com/
 *     &relay=wss://relay.primal.net/
 */
const loginWithRemoteSigner = useCallback(async (bunkerUrl: string) => {
  setState({ status: "loading", error: null, pubkey: null });

  let pool: InstanceType<typeof SimplePool> | null = null;

  try {
    const { BunkerSigner, parseBunkerInput } = await import("nostr-tools/nip46");
    const { SimplePool } = await import("nostr-tools");
    const { generateSecretKey } = await import("nostr-tools/pure");

    const cleanUrl = bunkerUrl.trim().replace(/\s+/g, "");
    console.log("[bunker] Parsing:", cleanUrl);

    const bunkerInput = await parseBunkerInput(cleanUrl);
    if (!bunkerInput) {
      throw new Error(
        "Invalid bunker URL — make sure it starts with bunker:// and includes relay URLs."
      );
    }

    // These are the relays the SIGNER is listening on — must use these to connect
    console.log("[bunker] Signer relays (from bunker URL):", bunkerInput.relays);

    // These are YOUR app's relays — only used as tags in the auth event
    const appRelays = await fetchRelays();
    console.log("[bunker] App relays (for event tags):", appRelays);

    const clientSecretKey = generateSecretKey();
    pool = new SimplePool();

    // BunkerSigner uses bunkerInput.relays internally — no need to pass them again
    const bunker = BunkerSigner.fromBunker(clientSecretKey, bunkerInput, { pool });

    console.log("[bunker] Connecting to signer via its relays...");
    await Promise.race([
      bunker.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timed out (30s). Is your signer app open and online?")),
          30_000
        )
      ),
    ]);

    console.log("[bunker] Connected. Requesting public key...");
    const pubkey = await Promise.race([
      bunker.getPublicKey(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getPublicKey timed out (15s)")), 15_000)
      ),
    ]);

    console.log("[bunker] Got pubkey:", pubkey);

    const { data: challengeData } = await authApi.getChallenge(pubkey);

    // Use appRelays (your backend relays) only for the event relay tags
    const unsignedEvent = buildAuthEvent(pubkey, challengeData.challenge, appRelays);
    console.log("[bunker] Built unsigned event:", unsignedEvent);

    console.log("[bunker] Requesting signature — approve in your signer app...");
    const signedEvent = await Promise.race([
      bunker.signEvent(unsignedEvent),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Sign request timed out (60s). Did you approve it in your signer?")),
          60_000
        )
      ),
    ]);

    console.log("[bunker] Signed. Verifying with backend...");
    const { data: verifyData } = await authApi.verify(signedEvent);

    if (verifyData.success) {
      setState({ status: "success", error: null, pubkey: verifyData.pubkey });
      return verifyData;
    }

    throw new Error("Backend rejected the signed event.");
  } catch (err: unknown) {
    console.log(err)
    const message = err instanceof Error ? err.message : "Remote signer login failed";
    console.error("[bunker] Failed:", message);
    setState({ status: "error", error: message, pubkey: null });
    throw err;
  } finally {
    try { pool?.close([]); } catch { /* ignore */ }
  }
}, []);


  /**
   * Login with NIP-46 via QR code (nostrconnect:// URI).
   * Returns a session with the URI (for display as QR) and a promise
   * that resolves once the remote signer connects and auth completes.
   */
  const loginWithQR = useCallback(async (): Promise<QRLoginSession> => {
    const { createNostrConnectURI, BunkerSigner } =
      await import("nostr-tools/nip46");
    const { generateSecretKey, getPublicKey } =
      await import("nostr-tools/pure");
    const { bytesToHex } = await import("@noble/hashes/utils.js");
    const { SimplePool } = await import("nostr-tools");

    // Get relays from backend
    const relays = await fetchRelays();

    // Generate an ephemeral keypair for this session
    const clientSecretKey = generateSecretKey();
    const clientPubkey = getPublicKey(clientSecretKey);

    // Generate a random secret for this connection
    const secret = bytesToHex(generateSecretKey()).slice(0, 16);

    // Build the nostrconnect:// URI
    const uri = createNostrConnectURI({
      clientPubkey,
      relays,
      secret,
      name: "Streakstr",
      url: window.location.origin,
    });

    // Create abort controller
    const abortController = new AbortController();
    abortRef.current = abortController;

    // The promise that resolves when signer connects
    const promise = (async () => {
      setState({ status: "loading", error: null, pubkey: null });

      try {
        const pool = new SimplePool();

        // Wait for the remote signer to connect back via the URI
        const bunker = await BunkerSigner.fromURI(
          clientSecretKey,
          uri,
          { pool },
          abortController.signal,
        );

        // Get the remote user's pubkey
        const pubkey = await bunker.getPublicKey();

        // Request challenge from backend
        const { data: challengeData } = await authApi.getChallenge(pubkey);

        // Build auth event with all relays
        const unsignedEvent = buildAuthEvent(
          pubkey,
          challengeData.challenge,
          relays,
        );

        // Sign with remote signer
        const signedEvent = await bunker.signEvent(unsignedEvent);

        // Send to backend for verification
        const { data: verifyData } = await authApi.verify(signedEvent);

        // Clean up
        try {
          await bunker.close();
        } catch {
          /* connection may already be closed */
        }

        if (verifyData.success) {
          setState({
            status: "success",
            error: null,
            pubkey: verifyData.pubkey,
          });
          return verifyData;
        }

        throw new Error("Verification failed");
      } catch (err: unknown) {
        if (abortController.signal.aborted) {
          setState({ status: "idle", error: null, pubkey: null });
          throw new Error("Connection cancelled");
        }
        const message = err instanceof Error ? err.message : "QR login failed";
        setState({ status: "error", error: message, pubkey: null });
        throw err;
      }
    })();

    return {
      uri,
      promise,
      abort: () => abortController.abort(),
    };
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
    loginWithQR,
    logout,
    reset,
  };
}
