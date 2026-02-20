import { SimplePool } from 'nostr-tools';
import { RELAY_URLS } from '../../config/relay.ts';

const pool = new SimplePool({ enablePing: true, enableReconnect: true });

// function to get user from relays with timeout
export async function getUserFromRelays(pubkey: string): Promise<string | null> {
  try {
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

    const fetchPromise = pool.get(RELAY_URLS, {
      kinds: [0],
      authors: [pubkey],
      limit: 1,
    });

    const user = await Promise.race([fetchPromise, timeoutPromise]);
    return user?.content ?? null;
  } catch (error) {
    console.error('Error fetching user from relays:', error);
    return null;
  }
}

export async function fetchEventById(eventId: string) {
  const events = await pool.get(RELAY_URLS, { ids: [eventId] });

  return events ?? null;
}
