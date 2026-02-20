import { useState, useEffect } from "react";
import { SimplePool } from "nostr-tools/pool";

export interface NostrProfile {
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  [key: string]: any;
}

const pool = new SimplePool();
// Default relays to try if none are specified
const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://purplepag.es",
];

export function useNostrProfile(pubkey?: string | null) {
  const [profile, setProfile] = useState<NostrProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pubkey) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchProfile = async () => {
      try {
        const event = await pool.get(DEFAULT_RELAYS, {
          kinds: [0],
          authors: [pubkey],
          limit: 1,
        });

        if (isMounted && event) {
          try {
            const parsed = JSON.parse(event.content);
            setProfile(parsed);
          } catch (e) {
            console.error("Failed to parse kind 0 content", e);
          }
        }
      } catch (error) {
        console.error("Error fetching nostr profile", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [pubkey]);

  return { profile, isLoading };
}
