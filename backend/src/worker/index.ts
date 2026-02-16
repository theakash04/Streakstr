import dotenv from 'dotenv';
import { useWebSocketImplementation } from 'nostr-tools/pool';
import { Streaks } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  closeAllSubscriptions,
  subscribeToBotFollows,
  subscribeToInteractions,
} from '../utils/Nostr/relaySubscriptionManager.ts';
import { getPublicKey, nip19 } from 'nostr-tools';
import { hexToBytes } from 'nostr-tools/utils';
import { reminderWorker, scheduleRecurringJobs, streakCheckWorker } from './worker.ts';

dotenv.config();

useWebSocketImplementation(WebSocket);

export async function getTrackedPubkeys(): Promise<string[]> {
  const streaks = await db
    .select({ user1: Streaks.user1Pubkey, user2: Streaks.user2Pubkey })
    .from(Streaks)
    .where(eq(Streaks.status, 'active'));

  const pubkeys = new Set<string>();
  for (const s of streaks) {
    pubkeys.add(s.user1);
    if (s.user2) pubkeys.add(s.user2);
  }
  return [...pubkeys];
}

async function start(): Promise<void> {
  console.log('Starting Streakstr worker...');

  const pubkeys = await getTrackedPubkeys();
  console.log('Tracking pubkeys:', pubkeys);

  subscribeToInteractions(pubkeys);

  const { type, data: botSk } = nip19.decode(process.env.NOSTR_BOT_SECRET_KEY!);
  if (type !== 'nsec') {
    throw new Error('NOSTR_BOT_SECRET_KEY must be an nsec key');
  }
  const botPubkey = getPublicKey(botSk);
  subscribeToBotFollows(botPubkey);

  await scheduleRecurringJobs();

  const shutdown = () => {
    console.log('Shutting down gracefully...');
    closeAllSubscriptions();
    reminderWorker.close();
    streakCheckWorker.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Error starting worker:', err);
  process.exit(1);
});
