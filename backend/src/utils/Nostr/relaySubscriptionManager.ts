import { SimplePool, type SubCloser, useWebSocketImplementation } from 'nostr-tools/pool';
import { type NostrEvent } from 'nostr-tools';
import { RELAY_URLS } from '../../config/relay.ts';
import { processFollowEvent, processInteractionEvent, processBotDMReply } from './EventHandler.ts';

useWebSocketImplementation(WebSocket);

const pool = new SimplePool({ enablePing: true, enableReconnect: true });

const activeSubscriptions: Map<string, SubCloser> = new Map();

let trackedPubkeys: string[] = [];
let storedBotPubkey: string | null = null;

const RECONNECT_DELAY_MS = 5000;

export function subscribeToInteractions(pubkeys: string[]): void {
  trackedPubkeys = pubkeys;

  const existing = activeSubscriptions.get('interactions');
  if (existing) {
    existing.close();
  }

  if (pubkeys.length === 0) {
    console.log('No pubkeys provided for interactions subscription, skipping.');
    return;
  }

  console.log('Subscribing to interactions for pubkeys:', pubkeys);

  const sub = pool.subscribeMany(
    RELAY_URLS,
    {
      kinds: [1], // only track posts
      authors: pubkeys,
      since: Math.floor(Date.now() / 1000),
    },
    {
      onevent(event: NostrEvent) {
        console.log('Received interaction event:', event);
        processInteractionEvent(event).catch((err) => {
          console.error('Error processing interaction event:', err);
        });
      },

      oneose() {
        console.log('Interaction subscription EOSE received (caught up with stored events)');
      },
      onclose(reasons) {
        console.log('Interaction subscription closed:', reasons);
        if (trackedPubkeys.length > 0) {
          setTimeout(() => {
            console.log('Reconnecting interactions subscription...');
            subscribeToInteractions(trackedPubkeys);
          }, RECONNECT_DELAY_MS);
        }
      },
    }
  );

  activeSubscriptions.set('interactions', sub);
}

export function subscribeToBotFollows(botPubkey: string): void {
  storedBotPubkey = botPubkey;

  const existing = activeSubscriptions.get('bot-follows');
  if (existing) {
    existing.close();
  }

  console.log('Subscribing to bot follows for pubkey:', botPubkey);

  const sub = pool.subscribeMany(
    RELAY_URLS,
    {
      kinds: [3],
      '#p': [botPubkey],
      since: Math.floor(Date.now() / 1000),
    },
    {
      onevent(event: NostrEvent) {
        console.log('Received bot follow event:', event);
        processFollowEvent(event).catch((err) => {
          console.error('Error processing bot follow event:', err);
        });
      },

      oneose() {
        console.log('Bot follows subscription EOSE received (caught up with stored events)');
      },

      onclose(reasons) {
        console.log('Bot follows subscription closed:', reasons);
        if (storedBotPubkey) {
          setTimeout(() => {
            console.log('Reconnecting bot follows subscription...');
            subscribeToBotFollows(storedBotPubkey!);
          }, RECONNECT_DELAY_MS);
        }
      },
    }
  );

  activeSubscriptions.set('bot-follows', sub);
}

export function subscribeToBotDMs(botPubkey: string): void {
  storedBotPubkey = botPubkey;

  const existing = activeSubscriptions.get('bot-dms');
  if (existing) {
    existing.close();
  }

  const sub = pool.subscribeMany(
    RELAY_URLS,
    {
      kinds: [1059, 4],
      '#p': [botPubkey],
      since: Math.floor(Date.now() / 1000),
    },
    {
      onevent(event: NostrEvent) {
        console.log('Received bot DM event:', event);
        processBotDMReply(event).catch((err) => {
          console.error('Error processing bot DM:', err);
        });
      },

      oneose() {
        console.log('Bot DMs subscription EOSE received');
      },

      onclose(reasons) {
        console.log('Bot DMs subscription closed:', reasons);
        if (storedBotPubkey) {
          setTimeout(() => {
            console.log('Reconnecting bot DMs subscription...');
            subscribeToBotDMs(storedBotPubkey!);
          }, RECONNECT_DELAY_MS);
        }
      },
    }
  );

  activeSubscriptions.set('bot-dms', sub);
}

/**
 * One-time catch-up: query ALL Kind 3 events that tag the bot (no `since` filter).
 * Processes any follows that were missed while the worker was down.
 * Skips users already in BotFollower with autoStreakCreated=true or doNotKeepStreak=true.
 */
export async function catchUpBotFollows(botPubkey: string): Promise<void> {
  console.log('Catching up on missed bot follows...');

  try {
    const events = await pool.querySync(RELAY_URLS, {
      kinds: [3],
      '#p': [botPubkey],
    });

    for (const event of events) {
      await processFollowEvent(event).catch((err) => {
        console.error(`Error processing catch-up follow from ${event.pubkey}:`, err);
      });
    }
  } catch (error) {
    console.error('Error during bot follow catch-up:', error);
  }
}

export async function refreshInteractionSubscriptions(pubkeys: string[]): Promise<void> {
  subscribeToInteractions(pubkeys);
}

export function closeAllSubscriptions(): void {
  storedBotPubkey = null;
  trackedPubkeys = [];

  for (const [name, sub] of activeSubscriptions) {
    console.log(`Closing subscription: ${name}`);
    sub.close();
  }
  activeSubscriptions.clear();
  pool.close(RELAY_URLS);
}
