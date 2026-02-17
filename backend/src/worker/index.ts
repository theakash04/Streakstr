import dotenv from 'dotenv';
import { useWebSocketImplementation } from 'nostr-tools/pool';
import { Streaks } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  closeAllSubscriptions,
  catchUpBotFollows,
  subscribeToBotFollows,
  subscribeToBotDMs,
  subscribeToInteractions,
} from '../utils/Nostr/relaySubscriptionManager.ts';
import { getPublicKey, nip19 } from 'nostr-tools';
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

  subscribeToInteractions(pubkeys);

  const { type, data: botSk } = nip19.decode(process.env.NOSTR_BOT_SECRET_KEY!);
  if (type !== 'nsec') {
    throw new Error('NOSTR_BOT_SECRET_KEY must be an nsec key');
  }
  const botPubkey = getPublicKey(botSk);

  // Catch up on any follows missed while the worker was down
  // This skips users already processed or who opted out (doNotKeepStreak)
  await catchUpBotFollows(botPubkey);

  // Refresh pubkeys since catch-up may have created new streaks
  const updatedPubkeys = await getTrackedPubkeys();
  if (updatedPubkeys.length !== pubkeys.length) {
    console.log(`Catch-up added ${updatedPubkeys.length - pubkeys.length} new tracked pubkeys`);
    subscribeToInteractions(updatedPubkeys);
  }

  // Now start live subscriptions
  subscribeToBotFollows(botPubkey);
  subscribeToBotDMs(botPubkey);

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
