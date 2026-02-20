import { SimplePool } from "nostr-tools";

export const RELAY_URLS = [
  "wss://relay.damus.io",
  "wss://relay.snort.social",
  "wss://nos.lol",
  "wss://ribo.eu.nostria.app",
  "wss://relay.primal.net",
  "wss://nostr-01.yakihonne.com",
];

const pool = new SimplePool();

export async function getUserDetails(pubkey: string) {
  const nostrData = await pool.get(RELAY_URLS, {
    kinds: [0],
    authors: [pubkey],
    limit: 1,
  });

  if (!nostrData) {
    return null;
  }

  return JSON.parse(nostrData.content);
}
