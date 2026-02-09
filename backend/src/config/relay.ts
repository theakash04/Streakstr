import { SimplePool } from 'nostr-tools';

const RELAY_URLS = ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://nos.lol'];

const pool = new SimplePool();

// function to get user from relays with timeout
export async function getUserFromRelays(pubkey: string): Promise<string | null> {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

    const fetchPromise = pool.get(RELAY_URLS, {
      kinds: [0],
      authors: [pubkey],
    });

    const user = await Promise.race([fetchPromise, timeoutPromise]);
    return user?.content ?? null;
  } catch (error) {
    console.error('Error fetching user from relays:', error);
    return null;
  }
}
