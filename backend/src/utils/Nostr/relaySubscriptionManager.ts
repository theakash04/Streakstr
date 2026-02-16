import { SimplePool, type SubCloser, useWebSocketImplementation } from 'nostr-tools/pool';
import { type NostrEvent } from 'nostr-tools';
import { RELAY_URLS } from '../../config/relay.ts';
import { processFollowEvent, processInteractionEvent } from './EventHandler.ts';

useWebSocketImplementation(WebSocket);

const pool = new SimplePool({ enablePing: true, enableReconnect: true });

const activeSubscriptions: Map<string, SubCloser> = new Map();

export function subscribeToInteractions(pubkeys: string[]): void {
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
      kinds: [1, 7, 6],
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
      },
    }
  );

  activeSubscriptions.set('interactions', sub);
}

export function subscribeToBotFollows(botPubkey: string): void {
  const existing = activeSubscriptions.get('botFollows');
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
      },
    }
  );

  activeSubscriptions.set('bot-follows', sub);
}

export async function refreshInteractionSubscriptions(pubkeys: string[]): Promise<void> {
  subscribeToInteractions(pubkeys);
}

export function closeAllSubscriptions(): void {
  for (const [name, sub] of activeSubscriptions) {
    console.log(`Closing subscription: ${name}`);
    sub.close();
  }
  activeSubscriptions.clear();
  pool.close(RELAY_URLS);
}
