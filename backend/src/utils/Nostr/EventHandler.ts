import type { NostrEvent } from 'nostr-tools';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { BotFollower, DailyLogs, Streaks } from '../../db/schema.ts';

/**
 * Process an interaction event (note, reaction, repost).
 * Determines which streaks this event applies to and logs activity.
 */
export async function processInteractionEvent(event: NostrEvent): Promise<void> {
  const pubkey = event.pubkey;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Find all active streaks involving this pubkey
  const streaks = await db
    .select()
    .from(Streaks)
    .where(
      and(
        eq(Streaks.status, 'active'),
        or(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, pubkey))
      )
    );

  for (const streak of streaks) {
    const isUser1 = streak.user1Pubkey === pubkey;

    // For duo streaks, check if the event tags the other user
    if (streak.type === 'duo') {
      const otherPubkey = isUser1 ? streak.user2Pubkey : streak.user1Pubkey;
      const taggedPubkeys = event.tags.filter((t) => t[0] === 'p').map((t) => t[1]);

      // Duo streak requires interaction WITH the other person
      if (!otherPubkey || !taggedPubkeys.includes(otherPubkey)) {
        continue;
      }
    }

    // Upsert daily log
    await db
      .insert(DailyLogs)
      .values({
        streakId: streak.id,
        date: today,
        user1Completed: isUser1 ? true : false,
        user2Completed: !isUser1 ? true : false,
        user1EventId: isUser1 ? event.id : undefined,
        user2EventId: !isUser1 ? event.id : undefined,
      })
      .onConflictDoUpdate({
        target: [DailyLogs.streakId, DailyLogs.date],
        set: {
          ...(isUser1
            ? { user1Completed: true, user1EventId: event.id }
            : { user2Completed: true, user2EventId: event.id }),
        },
      });

    // Check if the day is now fully completed
    const [log] = await db
      .select()
      .from(DailyLogs)
      .where(and(eq(DailyLogs.streakId, streak.id), eq(DailyLogs.date, today)));

    const dayComplete =
      streak.type === 'solo' ? log?.user1Completed : log?.user1Completed && log?.user2Completed;

    if (dayComplete && !log?.completedAt) {
      // Mark day as completed
      await db.update(DailyLogs).set({ completedAt: new Date() }).where(eq(DailyLogs.id, log!.id));

      // Increment streak count
      await db
        .update(Streaks)
        .set({
          currentCount: sql`${Streaks.currentCount} + 1`,
          highestCount: sql`GREATEST(${Streaks.highestCount}, ${Streaks.currentCount} + 1)`,
          lastActivityAt: new Date(),
        })
        .where(eq(Streaks.id, streak.id));

      console.log(`Streak ${streak.id} incremented! Day complete for ${today}`);
    }
  }
}

/**
 * Process a follow event on the bot account.
 * Auto-creates a solo streak with default settings.
 */
export async function processFollowEvent(event: NostrEvent): Promise<void> {
  const pubkey = event.pubkey;

  // Check if we've already processed this follower
  const [existing] = await db.select().from(BotFollower).where(eq(BotFollower.pubkey, pubkey));

  if (existing?.autoStreakCreated) {
    return;
  }

  // Record the follower
  await db
    .insert(BotFollower)
    .values({ pubkey, autoStreakCreated: true })
    .onConflictDoUpdate({
      target: BotFollower.pubkey,
      set: { autoStreakCreated: true },
    });

  // Create a default solo streak
  await db.insert(Streaks).values({
    type: 'solo',
    name: 'Daily Nostr Activity',
    user1Pubkey: pubkey,
    status: 'active',
    startedAt: new Date(),
  });

  console.log(`Auto-created solo streak for new bot follower: ${pubkey}`);

  // send dm to the new follower that the streak is created
}
