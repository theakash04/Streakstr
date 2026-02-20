import { useCallback, useRef, useState } from "react";
import { authApi } from "@/lib/api";
import { getEventHash } from "nostr-tools";

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  );
}

const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://nos.lol"];

async function fetchRelays(): Promise<string[]> {
  try {
    const { data } = await authApi.getRelays();
    return data.relays?.length ? data.relays : DEFAULT_RELAYS;
  } catch {
    return DEFAULT_RELAYS;
  }
}

function buildAuthEvent(pubkey: string, challenge: string, relays: string[]) {
  return {
    kind: 22242,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [...relays.map((r: string) => ["relay", r]), ["challenge", challenge]],
    content: "Streakstr login",
  };
}

/**
 * Builds a nostrsigner: deep link for NIP-55.
 *
 * KEY INSIGHT: Amber appends its response DIRECTLY onto the callbackUrl string
 * with NO separator. So the callbackUrl must already end with "?event=" so the
 * appended value lands in a proper query param:
 *
 *   callbackUrl = "https://app.com/login?event="
 *   Amber result → "https://app.com/login?event=<pubkey_or_signed_event>"
 */
function buildNIP55Uri(
  type: "get_public_key" | "sign_event",
  appName: string,
  callbackUrl: string,  // must already end with "?event="
  payload?: string
): string {
  const params = new URLSearchParams({
    compressionType: "none",
    returnType: "signature",
    type,
    appName,
    callbackUrl,
  });

  return `nostrsigner:${payload ? encodeURIComponent(payload) : ""}?${params.toString()}`;
}

export interface PendingNIP55State {
  step: "get_public_key" | "sign_event";
  pubkey?: string;
  challenge?: string;
  unsignedEvent?: {
    kind: number;
    content: string;
    tags: string[][];
    created_at: number;
    pubkey: string;
  };
}

const STORAGE_KEY = "nip55_pending";

export function savePendingNIP55State(state: PendingNIP55State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadPendingNIP55State(): PendingNIP55State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingNIP55State() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useLocalSigner(
  appName: string = "Streakstr",
  callbackUrl?: string
) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef(false);
  const debug = typeof window !== "undefined" && localStorage.getItem("nip55_debug") === "1";

  const baseCallback = callbackUrl ?? `${window.location.origin}/login`;
  // MUST end with "?event=" — Amber appends the value directly with no separator
  const resolvedCallbackUrl = `${baseCallback}?ngrok-skip-browser-warning=true&event=`;
  const isOpeningRef = useRef(false);

  const resetCancel = () => {
    cancelRef.current = false;
  };

  const cancelClipboardFlow = () => {
    cancelRef.current = true;
    setIsLoading(false);
    setError("Cancelled.");
  };

  const waitForClipboard = async (
    isValid: (value: string) => boolean,
    timeoutMs: number,
    intervalMs: number
  ): Promise<string> => {
    const start = Date.now();

    const readClipboard = async (): Promise<string | null> => {
      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (debug) console.log("[NIP-55] clipboard read:", text);
        return text || null;
      } catch {
        if (debug) console.log("[NIP-55] clipboard read failed");
        return null;
      }
    };

    const onFocus = async () => {
      if (cancelRef.current) return;
      const text = await readClipboard();
      if (text && isValid(text)) {
        found = text;
      }
    };

    let found: string | null = null;
    window.addEventListener("focus", onFocus);

    try {
      while (Date.now() - start < timeoutMs) {
        if (cancelRef.current) {
          throw new Error("Cancelled");
        }
        const text = await readClipboard();
        if (text && isValid(text)) {
          return text;
        }
        if (found) {
          return found;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      throw new Error("Timed out waiting for signer response.");
    } finally {
      window.removeEventListener("focus", onFocus);
    }
  };

  const parsePubkeyFromClipboard = async (raw: string): Promise<string> => {
    const value = raw.trim();
    if (/^[0-9a-f]{64}$/i.test(value)) {
      return value.toLowerCase();
    }
    if (value.startsWith("npub")) {
      const { decode } = await import("nostr-tools/nip19");
      const decoded = decode(value);
      if (decoded.type === "npub" && typeof decoded.data === "string") {
        return decoded.data.toLowerCase();
      }
    }
    throw new Error("Clipboard did not contain a valid pubkey.");
  };

  const parseSignedResult = async (
    raw: string,
    unsignedEvent: { kind: number; content: string; tags: string[][]; created_at: number; pubkey: string }
  ): Promise<object> => {
    const trimmed = raw.trim();
    const tryJson = (text: string) => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };

    const decoded = (() => {
      try {
        return decodeURIComponent(trimmed);
      } catch {
        return trimmed;
      }
    })();

    const parsed = tryJson(decoded);
    if (parsed && typeof parsed === "object") {
      const sig = (parsed as { sig?: string }).sig;
      if (sig && /^[0-9a-f]{128}$/i.test(sig)) {
        const id = (parsed as { id?: string }).id ?? getEventHash(parsed);
        return { ...parsed, id, sig };
      }
    }

    if (/^[0-9a-f]{128}$/i.test(trimmed)) {
      const id = getEventHash(unsignedEvent);
      return { ...unsignedEvent, id, sig: trimmed };
    }

    throw new Error("Clipboard did not contain a valid signature or signed event.");
  };

  const parseSignedResultFromCallback = async (rawEventValue: string): Promise<object> => {
    const trimmed = rawEventValue.trim();
    let decoded = trimmed;
    try {
      decoded = decodeURIComponent(trimmed);
    } catch {
      // Keep raw value if it was not URI encoded
    }

    // Some signers return only a signature hex when returnType=signature.
    if (/^[0-9a-f]{128}$/i.test(decoded) || /^[0-9a-f]{128}$/i.test(trimmed)) {
      const pending = loadPendingNIP55State();
      if (!pending?.unsignedEvent) {
        throw new Error(
          "Received signature-only response but missing pending unsigned event state."
        );
      }
      return parseSignedResult(decoded, pending.unsignedEvent);
    }

    // Full signed event JSON (encoded or plain)
    try {
      const signedEvent = JSON.parse(decoded) as object;
      const signedSig = (signedEvent as { sig?: string }).sig;
      if (!signedSig || !/^[0-9a-f]{128}$/i.test(signedSig)) {
        throw new Error("Signed event did not contain a valid signature.");
      }
      const id = (signedEvent as { id?: string }).id ?? getEventHash(signedEvent as { kind: number; content: string; tags: string[][]; created_at: number; pubkey: string });
      return { ...signedEvent, id, sig: signedSig };
    } catch {
      throw new Error("Signer callback did not contain a valid signed event or signature.");
    }
  };

  /** Step 1: Open external signer to get public key */
  const openExternalSignerApp = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      if (isOpeningRef.current) return;
      isOpeningRef.current = true;
      setError(null);

      if (!isMobileDevice()) {
        setError(
          "External signer app (NIP-55) is only supported on mobile. Use bunker URL or QR on desktop."
        );
        isOpeningRef.current = false;
        return;
      }

      savePendingNIP55State({ step: "get_public_key" });

      const uri = buildNIP55Uri("get_public_key", appName, resolvedCallbackUrl);
      console.log("[NIP-55] get_public_key URI:", uri);
      window.location.href = uri;
      console.log("[NIP-55] External signer app should now be opening..."); 

        const onFocus = () => {
    window.removeEventListener("focus", onFocus);
    isOpeningRef.current = false;
    
    // Check if Amber wrote the result to the callback URL
    // Some signers append to callbackUrl directly — check current URL params
    const params = new URLSearchParams(window.location.search);
    const event = params.get("event");
    if (event) {
      console.log("[NIP-55] Got result on focus:", event);
      // handle it here
    }
  };
  
  window.addEventListener("focus", onFocus);


      setTimeout(() => { isOpeningRef.current = false; }, 3000);
    },
    [appName, resolvedCallbackUrl]
  );

  const loginWithClipboardSigner = useCallback(async () => {
    resetCancel();
    setIsLoading(true);
    setError(null);

    try {
      if (!isMobileDevice()) {
        throw new Error("Clipboard signer flow is only supported on mobile.");
      }
      if (debug) console.log("[NIP-55] starting clipboard flow");

      const getPubkeyUrl = buildNIP55Uri("get_public_key", appName, resolvedCallbackUrl);
      if (debug) console.log("[NIP-55] open get_public_key url:", getPubkeyUrl);
      window.location.href = getPubkeyUrl;

      const pubkeyRaw = await waitForClipboard(
        (value) => value.startsWith("npub") || /^[0-9a-f]{64}$/i.test(value),
        60000,
        600
      );
      if (debug) console.log("[NIP-55] pubkey raw:", pubkeyRaw);
      const pubkey = await parsePubkeyFromClipboard(pubkeyRaw);
      if (debug) console.log("[NIP-55] pubkey parsed:", pubkey);

      const relays = await fetchRelays();
      if (debug) console.log("[NIP-55] relays:", relays);
      const { data: challengeData } = await authApi.getChallenge(pubkey);
      if (debug) console.log("[NIP-55] challenge:", challengeData);
      const unsignedEvent = buildAuthEvent(pubkey, challengeData.challenge, relays);
      if (debug) console.log("[NIP-55] unsigned event:", unsignedEvent);

      const eventJson = JSON.stringify(unsignedEvent);
      const signUrl = buildNIP55Uri("sign_event", appName, resolvedCallbackUrl, eventJson);
      if (debug) console.log("[NIP-55] open sign_event url:", signUrl);
      window.location.href = signUrl;

      const signedRaw = await waitForClipboard(
        (value) => {
          const v = value.trim();
          if (/^[0-9a-f]{128}$/i.test(v)) return true;
          try {
            JSON.parse(decodeURIComponent(v));
            return true;
          } catch {
            try {
              JSON.parse(v);
              return true;
            } catch {
              return false;
            }
          }
        },
        120000,
        600
      );

      const signedEvent = await parseSignedResult(signedRaw, unsignedEvent);
      if (debug) console.log("[NIP-55] signed event:", signedEvent);
      const { data: verifyData } = await authApi.verify(signedEvent);
      if (debug) console.log("[NIP-55] verify result:", verifyData);

      if (!verifyData.success) {
        throw new Error("Verification failed — backend rejected the signed event.");
      }

      clearPendingNIP55State();
      return verifyData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Signer login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [appName, resolvedCallbackUrl]);

  /** Step 2: After receiving pubkey from callback, fetch challenge and open signer to sign */
  const signChallengeWithExternalSigner = useCallback(
    async (pubkey: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const relays = await fetchRelays();
        const { data: challengeData } = await authApi.getChallenge(pubkey);
        const unsignedEvent = buildAuthEvent(pubkey, challengeData.challenge, relays);

        savePendingNIP55State({
          step: "sign_event",
          pubkey,
          challenge: challengeData.challenge,
          unsignedEvent,
        });

        const eventJson = JSON.stringify(unsignedEvent);
        const uri = buildNIP55Uri("sign_event", appName, resolvedCallbackUrl, eventJson);
        console.log("[NIP-55] sign_event URI built, opening signer...");
        window.location.href = uri;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to prepare signing";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [appName, resolvedCallbackUrl]
  );

  /** Step 3: Verify the signed event returned in the callback */
  const verifySignedEvent = useCallback(async (rawEventValue: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const signedEvent = await parseSignedResultFromCallback(rawEventValue);
      const { data: verifyData } = await authApi.verify(signedEvent);

      if (verifyData.success) {
        clearPendingNIP55State();
        return verifyData;
      }

      throw new Error("Verification failed — backend rejected the signed event.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    openExternalSignerApp,
    loginWithClipboardSigner,
    cancelClipboardFlow,
    signChallengeWithExternalSigner,
    verifySignedEvent,
    isMobile: isMobileDevice(),
    error,
    isLoading,
  };
};
