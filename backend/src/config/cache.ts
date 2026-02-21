import redis from './redis.ts';
import { db } from '../db/index.ts';
import { BotFollower, Streaks, StreakSettings } from '../db/schema.ts';
import { eq, and, or } from 'drizzle-orm';

// ── Cache key prefixes ──
const KEYS = {
  /** Active streaks for a pubkey → JSON array */
  activeStreaks: (pubkey: string) => `streaks:active:${pubkey}`,
  /** Window completion flag → "1" if the current 24hr window is fully completed */
  windowCompleted: (streakId: string, deadline: string) => `window:done:${streakId}:${deadline}`,
  /** BotFollower status → JSON { autoStreakCreated, doNotKeepStreak } */
  botFollower: (pubkey: string) => `follower:${pubkey}`,
  /** Solo streaks for /stats → JSON array */
  soloStreaks: (pubkey: string) => `streaks:solo:${pubkey}`,
  /** Top 10 interactions stats → JSON array */
  interactions: (pubkey: string) => `interactions:${pubkey}`,
  /** Reminder already sent for this streak+target+deadline window → "1" */
  reminderSent: (streakId: string, targetPubkey: string, deadline: string) =>
    `reminder:sent:${streakId}:${targetPubkey}:${deadline}`,
} as const;

// Default TTLs (seconds)
const TTL = {
  activeStreaks: 300, // 5 minutes — streaks don't change often
  windowCompleted: 86400, // 24 hours — valid for the current window
  botFollower: 3600, // 1 hour
  soloStreaks: 300, // 5 minutes
  interactions: 3600, // 1 hour - cached to avoid spamming relays
} as const;

// ── Active Streaks by pubkey ──

type StreakRow = typeof Streaks.$inferSelect;
type StreakWithSettings = {
  streak: StreakRow;
  settings: typeof StreakSettings.$inferSelect | null;
};

export async function getActiveStreaksForPubkey(pubkey: string): Promise<StreakRow[]> {
  const cached = await redis.get(KEYS.activeStreaks(pubkey));
  if (cached) {
    return JSON.parse(cached);
  }

  const streaks = await db
    .select()
    .from(Streaks)
    .where(
      and(
        eq(Streaks.status, 'active'),
        or(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.user2Pubkey, pubkey))
      )
    );

  await redis.set(KEYS.activeStreaks(pubkey), JSON.stringify(streaks), 'EX', TTL.activeStreaks);
  return streaks;
}

export async function invalidateActiveStreaks(pubkey: string): Promise<void> {
  await redis.del(KEYS.activeStreaks(pubkey));
}

export async function invalidateActiveStreaksForStreak(streak: StreakRow): Promise<void> {
  await redis.del(KEYS.activeStreaks(streak.user1Pubkey));
  if (streak.user2Pubkey) {
    await redis.del(KEYS.activeStreaks(streak.user2Pubkey));
  }
}

// ── Window completion flag (per deadline) ──

export async function isWindowCompleted(streakId: string, deadline: string): Promise<boolean> {
  const cached = await redis.get(KEYS.windowCompleted(streakId, deadline));
  return cached === '1';
}

export async function markWindowCompleted(streakId: string, deadline: string): Promise<void> {
  await redis.set(KEYS.windowCompleted(streakId, deadline), '1', 'EX', TTL.windowCompleted);
}

// ── BotFollower status ──

type FollowerStatus = {
  exists: boolean;
  autoStreakCreated: boolean;
  doNotKeepStreak: boolean;
};

export async function getBotFollowerStatus(pubkey: string): Promise<FollowerStatus> {
  const cached = await redis.get(KEYS.botFollower(pubkey));
  if (cached) {
    return JSON.parse(cached);
  }

  const [existing] = await db.select().from(BotFollower).where(eq(BotFollower.pubkey, pubkey));

  const status: FollowerStatus = {
    exists: !!existing,
    autoStreakCreated: existing?.autoStreakCreated ?? false,
    doNotKeepStreak: existing?.doNotKeepStreak ?? false,
  };

  await redis.set(KEYS.botFollower(pubkey), JSON.stringify(status), 'EX', TTL.botFollower);
  return status;
}

export async function invalidateBotFollower(pubkey: string): Promise<void> {
  await redis.del(KEYS.botFollower(pubkey));
}

// ── Solo streaks for /stats ──

export async function getSoloStreaksForPubkey(pubkey: string): Promise<StreakRow[]> {
  const cached = await redis.get(KEYS.soloStreaks(pubkey));
  if (cached) {
    return JSON.parse(cached);
  }

  const streaks = await db
    .select()
    .from(Streaks)
    .where(and(eq(Streaks.user1Pubkey, pubkey), eq(Streaks.type, 'solo')));

  await redis.set(KEYS.soloStreaks(pubkey), JSON.stringify(streaks), 'EX', TTL.soloStreaks);
  return streaks;
}

export async function invalidateSoloStreaks(pubkey: string): Promise<void> {
  await redis.del(KEYS.soloStreaks(pubkey));
}

// ── Reminder dedup (prevents sending multiple reminders per streak per window) ──

export async function hasReminderBeenSent(
  streakId: string,
  targetPubkey: string,
  deadline: string
): Promise<boolean> {
  const key = KEYS.reminderSent(streakId, targetPubkey, deadline);
  const exists = await redis.get(key);
  return exists === '1';
}

export async function markReminderSent(
  streakId: string,
  targetPubkey: string,
  deadline: string
): Promise<void> {
  const key = KEYS.reminderSent(streakId, targetPubkey, deadline);
  // Expires after 24 hours — auto-cleanup, no stale keys
  await redis.set(key, '1', 'EX', 86400);
}

// ── Bulk invalidation (call after streak create/update/delete) ──

export async function invalidateAllForPubkey(pubkey: string): Promise<void> {
  await Promise.all([
    redis.del(KEYS.activeStreaks(pubkey)),
    redis.del(KEYS.soloStreaks(pubkey)),
    redis.del(KEYS.botFollower(pubkey)),
    redis.del(KEYS.interactions(pubkey)),
  ]);
}
