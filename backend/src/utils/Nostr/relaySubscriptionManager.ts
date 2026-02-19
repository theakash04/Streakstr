import { SimplePool, type SubCloser, useWebSocketImplementation } from 'nostr-tools/pool';
import { type NostrEvent } from 'nostr-tools';
import { RELAY_URLS } from '../../config/relay.ts';
import { processFollowEvent, processInteractionEvent, processBotDMReply } from './EventHandler.ts';

useWebSocketImplementation(WebSocket);

const pool = new SimplePool({ enablePing: true, enableReconnect: true });

const activeSubscriptions: Map<string, SubCloser> = new Map();
const reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
/** Tracks subscriptions being intentionally closed — prevents onclose from reconnecting */
const closingIntentionally: Set<string> = new Set();

let trackedPubkeys: string[] = [];
let storedBotPubkey: string | null = null;

const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;
const reconnectAttempts: Map<string, number> = new Map();

/** Get delay with exponential backoff */
function getReconnectDelay(name: string): number {
  const attempts = reconnectAttempts.get(name) ?? 0;
  reconnectAttempts.set(name, attempts + 1);
  return Math.min(RECONNECT_DELAY_MS * 2 ** attempts, MAX_RECONNECT_DELAY_MS);
}

/** Reset backoff counter on successful connection (EOSE) */
function resetReconnectAttempts(name: string): void {
  reconnectAttempts.set(name, 0);
}

/** Cancel any pending reconnect for a subscription */
function cancelPendingReconnect(name: string): void {
  const timer = reconnectTimers.get(name);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(name);
  }
}

/** Close a subscription intentionally without triggering reconnect */
function closeSubscription(name: string): void {
  cancelPendingReconnect(name);
  const existing = activeSubscriptions.get(name);
  if (existing) {
    closingIntentionally.add(name);
    existing.close();
    activeSubscriptions.delete(name);
    // Clean up the flag after a tick (onclose fires synchronously or next tick)
    setTimeout(() => closingIntentionally.delete(name), 100);
  }
}

/** Check if onclose reasons indicate a real problem (not intentional) */
function isUnexpectedClose(reasons: string[]): boolean {
  // If ALL reasons are "closed by caller", it was intentional
  return !reasons.every((r) => r === 'closed by caller');
}

export function subscribeToInteractions(pubkeys: string[]): void {
  trackedPubkeys = pubkeys;

  closeSubscription('interactions');

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
        resetReconnectAttempts('interactions');
      },
      onclose(reasons) {
        console.log('Interaction subscription closed:', reasons);

        // Skip reconnect if we closed it intentionally
        if (closingIntentionally.has('interactions')) return;

        if (trackedPubkeys.length > 0 && isUnexpectedClose(reasons)) {
          const delay = getReconnectDelay('interactions');
          console.log(`Reconnecting interactions subscription in ${delay / 1000}s...`);
          const timer = setTimeout(() => {
            reconnectTimers.delete('interactions');
            subscribeToInteractions(trackedPubkeys);
          }, delay);
          reconnectTimers.set('interactions', timer);
        }
      },
    }
  );

  activeSubscriptions.set('interactions', sub);
}

export function subscribeToBotFollows(botPubkey: string): void {
  storedBotPubkey = botPubkey;

  closeSubscription('bot-follows');

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
        resetReconnectAttempts('bot-follows');
      },

      onclose(reasons) {
        console.log('Bot follows subscription closed:', reasons);

        if (closingIntentionally.has('bot-follows')) return;

        if (storedBotPubkey && isUnexpectedClose(reasons)) {
          const delay = getReconnectDelay('bot-follows');
          console.log(`Reconnecting bot follows subscription in ${delay / 1000}s...`);
          const timer = setTimeout(() => {
            reconnectTimers.delete('bot-follows');
            subscribeToBotFollows(storedBotPubkey!);
          }, delay);
          reconnectTimers.set('bot-follows', timer);
        }
      },
    }
  );

  activeSubscriptions.set('bot-follows', sub);
}

export function subscribeToBotDMs(botPubkey: string): void {
  storedBotPubkey = botPubkey;

  closeSubscription('bot-dms');

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
        resetReconnectAttempts('bot-dms');
      },

      onclose(reasons) {
        console.log('Bot DMs subscription closed:', reasons);

        if (closingIntentionally.has('bot-dms')) return;

        if (storedBotPubkey && isUnexpectedClose(reasons)) {
          const delay = getReconnectDelay('bot-dms');
          console.log(`Reconnecting bot DMs subscription in ${delay / 1000}s...`);
          const timer = setTimeout(() => {
            reconnectTimers.delete('bot-dms');
            subscribeToBotDMs(storedBotPubkey!);
          }, delay);
          reconnectTimers.set('bot-dms', timer);
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

  for (const name of activeSubscriptions.keys()) {
    console.log(`Closing subscription: ${name}`);
    closeSubscription(name);
  }
  activeSubscriptions.clear();
  reconnectAttempts.clear();
  pool.close(RELAY_URLS);
}
