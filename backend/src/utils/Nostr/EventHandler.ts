import type { NostrEvent } from 'nostr-tools';
import { nip04, nip19, nip44 } from 'nostr-tools';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  BotFollower,
  DailyLogs,
  Logs,
  Streaks,
  StreakSettings,
  UserActivity,
} from '../../db/schema.ts';
import { sendDMReminder, sendNip17DM, sendNip04DM } from './nostrPublisher.ts';
import { notifyWorkerToRefresh } from '../notifyWorker.ts';
import {
  getActiveStreaksForPubkey,
  invalidateActiveStreaksForStreak,
  invalidateAllForPubkey,
  isWindowCompleted,
  markWindowCompleted,
  getBotFollowerStatus,
  invalidateBotFollower,
  getSoloStreaksForPubkey,
} from '../../config/cache.ts';
import { RELAY_URLS } from '../../config/relay.ts';
import { fetchEventById } from './nostrQueries.ts';

// Get bot secret key for decrypting DMs
const { type: keyType, data: botSk } = nip19.decode(process.env.NOSTR_BOT_SECRET_KEY!);
if (keyType !== 'nsec') {
  throw new Error('NOSTR_BOT_SECRET_KEY must be an nsec key');
}

// Grace period: allow activity within 1 hour after deadline
const GRACE_PERIOD_MS = 60 * 60 * 1000;

/**
 * Get the end of tomorrow in UTC (23:59:59.999).
 * This gives users until the end of the next full calendar day.
 */
function getEndOfNextDay(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(23, 59, 59, 999);
  return tomorrow;
}

function getTodayUTC(date: Date) {
  return date.toISOString().split('T')[0];
}

export function getEndOfTodayUTC(date: Date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function getStartOfTodayUTC(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if an event is a direct interaction WITH a specific pubkey.
 * Returns true if the event tags the target pubkey (reply, react, repost, mention).
 */
function isInteractionWith(event: NostrEvent, otherPubkey: string): boolean {
  const taggedPubkeys = event.tags.filter((t) => t[0] === 'p').map((t) => t[1]);

  if (taggedPubkeys.includes(otherPubkey)) return true;

  const referencedEvents = event.tags.filter((t) => t[0] === 'e').map((t) => t[1]);

  if (referencedEvents.length > 0) {
    // You should ideally verify the referenced event belongs to otherPubkey
    return true;
  }

  return false;
}
/**
 * Process an interaction event (note, reaction, repost).
 * When activity completes a window → count increments, deadline resets to now + 24hrs.
 */
export async function processInteractionEvent(event: NostrEvent): Promise<void> {
  const eventTime = new Date(event.created_at * 1000);
  const pubkey = event.pubkey;
  const todayUTC = getTodayUTC(eventTime);

  // Heatmap (separate concern)
  await db
    .insert(UserActivity)
    .values({
      pubkey,
      date: todayUTC,
      postCount: 1,
      streakActive: true,
    })
    .onConflictDoUpdate({
      target: [UserActivity.pubkey, UserActivity.date],
      set: {
        postCount: sql`${UserActivity.postCount} + 1`,
        streakActive: true,
      },
    });

  const streaks = await getActiveStreaksForPubkey(pubkey);

  for (const streak of streaks) {
    if (streak.status !== 'active') continue;

    const startedAt = new Date(streak.startedAt!);
    if (eventTime < startedAt) continue;

    const todayStart = getStartOfTodayUTC(eventTime);

    // ================= SOLO =================
    if (streak.type === 'solo') {
      if (streak.user1Pubkey !== pubkey) continue;

      const inserted = await db
        .insert(DailyLogs)
        .values({
          streakId: streak.id,
          date: todayUTC,
          user1Completed: true,
          completedAt: eventTime,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) continue; // already completed today

      const nextDay = new Date(eventTime);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      await db
        .update(Streaks)
        .set({
          currentCount: (streak.currentCount ?? 0) + 1,
          highestCount: Math.max(streak.highestCount ?? 0, (streak.currentCount ?? 0) + 1),
          lastActivityAt: eventTime,
          deadline: getEndOfTodayUTC(nextDay),
        })
        .where(eq(Streaks.id, streak.id));

      await invalidateAllForPubkey(pubkey);
    }

    // ================= DUO =================
    else if (streak.type === 'duo') {
      const isUser1 = streak.user1Pubkey === pubkey;
      const isUser2 = streak.user2Pubkey === pubkey;
      if (!isUser1 && !isUser2) continue;

      const otherPubkey = isUser1 ? streak.user2Pubkey : streak.user1Pubkey;

      if (!otherPubkey) continue;

      if (!isInteractionWith(event, otherPubkey)) continue;

      // If reply, ensure referenced event belongs to other user
      const eTag = event.tags.find((t) => t[0] === 'e');
      if (eTag) {
        const referenced = await fetchEventById(eTag[1]);
        if (!referenced) continue;
        if (referenced.pubkey !== otherPubkey) continue;

        const referencedTime = new Date(referenced.created_at * 1000);
        if (referencedTime < startedAt) continue;
      }

      const inserted = await db
        .insert(DailyLogs)
        .values({
          streakId: streak.id,
          date: todayUTC,
          user1Completed: true,
          user2Completed: true,
          completedAt: eventTime,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) continue; // already completed today

      const nextDay = new Date(eventTime);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      await db
        .update(Streaks)
        .set({
          currentCount: (streak.currentCount ?? 0) + 1,
          highestCount: Math.max(streak.highestCount ?? 0, (streak.currentCount ?? 0) + 1),
          lastActivityAt: eventTime,
          deadline: getEndOfTodayUTC(nextDay),
        })
        .where(eq(Streaks.id, streak.id));

      await invalidateAllForPubkey(streak.user1Pubkey);
      await invalidateAllForPubkey(streak.user2Pubkey!);
    }
  }
}

/**
 * Process a follow event on the bot account.
 * Auto-creates a solo streak with default settings.
 */
export async function processFollowEvent(event: NostrEvent): Promise<void> {
  const pubkey = event.pubkey;

  // Check follower status from cache first
  const followerStatus = await getBotFollowerStatus(pubkey);

  if (followerStatus.autoStreakCreated) {
    return;
  }

  if (followerStatus.doNotKeepStreak) {
    console.log(`Skipping auto-streak for ${pubkey} — user opted out (doNotKeepStreak)`);
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

  // Create a default solo streak with 24hr rolling window
  const now = new Date();
  const deadline = getEndOfNextDay();

  const [streak] = await db
    .insert(Streaks)
    .values({
      type: 'solo',
      name: 'Daily Nostr Activity',
      user1Pubkey: pubkey,
      status: 'active',
      startedAt: now,
      deadline,
    })
    .returning();

  await db.insert(StreakSettings).values({
    streakId: streak.id,
    dmReminder: true,
  });

  // send dm to the new follower that the streak is created
  await sendNip04DM(
    pubkey,
    `Welcome to Streakstr! 🔥 A solo streak "Daily Nostr Activity" has been created for you.\n\n` +
      `You have 24 hours to post on Nostr to keep your streak alive! Your first deadline is ${deadline.toUTCString()}.\n\n` +
      `Customize your settings at ${process.env.FRONTEND_URL}\n\n` +
      `This was created because you followed our bot account.`
  );

  // Invalidate caches for this pubkey
  await invalidateAllForPubkey(pubkey);

  await notifyWorkerToRefresh();
}

/**
 * Unwrap a NIP-17 Gift Wrap (Kind 1059) → Seal (Kind 13) → Rumor (Kind 14)
 * Returns the real sender pubkey and plaintext content.
 */
function unwrapGiftWrap(event: NostrEvent): { senderPubkey: string; content: string } | null {
  try {
    // Step 1: Decrypt Gift Wrap → Seal
    const giftWrapConvoKey = nip44.v2.utils.getConversationKey(botSk as Uint8Array, event.pubkey);
    const sealJson = nip44.v2.decrypt(event.content, giftWrapConvoKey);
    const seal = JSON.parse(sealJson);

    // Step 2: Decrypt Seal → Rumor
    const sealConvoKey = nip44.v2.utils.getConversationKey(botSk as Uint8Array, seal.pubkey);
    const rumorJson = nip44.v2.decrypt(seal.content, sealConvoKey);
    const rumor = JSON.parse(rumorJson);

    return {
      senderPubkey: rumor.pubkey,
      content: rumor.content,
    };
  } catch (error) {
    console.error('Failed to unwrap gift wrap:', error);
    return null;
  }
}

/**
 * Decrypt a NIP-04 legacy DM (kind 4)
 */
async function decryptNip04DM(
  event: NostrEvent
): Promise<{ senderPubkey: string; content: string } | null> {
  try {
    const senderPubkey = event.pubkey;
    const plaintext = await nip04.decrypt(botSk as Uint8Array, senderPubkey, event.content);

    return {
      senderPubkey,
      content: plaintext,
    };
  } catch (error) {
    console.error('Failed to decrypt NIP-04 DM:', error);
    return null;
  }
}

/**
 * Process a DM sent to the bot.
 * Commands:
 *   stop  → Delete active streaks, set doNotKeepStreak = true
 *   stats → Reply with current solo streak info
 *   start → Start tracking solo streak if not already (might be used for user who stop then want to start it will create a new)
 *   anything else → Generic promo reply
 */
export async function processBotDMReply(event: NostrEvent): Promise<void> {
  let unwrapped: { senderPubkey: string; content: string } | null = null;
  if (event.kind === 1059) {
    unwrapped = unwrapGiftWrap(event);
  } else if (event.kind === 4) {
    unwrapped = await decryptNip04DM(event);
  } else {
    console.warn(`Received unsupported DM kind ${event.kind} from ${event.pubkey}`);
    return;
  }
  if (!unwrapped) return;

  const { senderPubkey, content } = unwrapped;
  const command = content.trim().toLowerCase();

  if (command === 'start') {
    const soloStreaks = await getSoloStreaksForPubkey(senderPubkey);

    if (soloStreaks.length > 0) {
      await sendNip04DM(
        senderPubkey,
        `You already have an active solo streak. Reply STOP to delete it and start fresh, or visit ${process.env.FRONTEND_URL} to manage your streaks.`
      );
      return;
    }

    // Create a default solo streak with 24hr rolling window
    const now = new Date();
    const deadline = getEndOfNextDay();

    const [streak] = await db
      .insert(Streaks)
      .values({
        type: 'solo',
        name: 'Daily Nostr Activity',
        user1Pubkey: senderPubkey,
        status: 'active',
        startedAt: now,
        deadline,
      })
      .returning();

    await db.insert(StreakSettings).values({
      streakId: streak.id,
      dmReminder: true,
    });

    await sendNip04DM(
      senderPubkey,
      `A new solo streak "Daily Nostr Activity" has been created for you! 🔥\n\n` +
        `You have 24 hours to post on Nostr. Your first deadline is ${deadline.toUTCString()}.\n\n` +
        `Customize your settings at ${process.env.FRONTEND_URL}`
    );

    await invalidateAllForPubkey(senderPubkey);
    await notifyWorkerToRefresh();
    return;
  }

  // ── STOP command ──
  if (command === 'stop') {
    // Get active streaks from cache
    const activeStreaks = await getActiveStreaksForPubkey(senderPubkey);
    // Filter to solo only (STOP only affects solo streaks in current logic)
    const soloStreaks = activeStreaks.filter((s) => s.type === 'solo');

    for (const streak of soloStreaks) {
      await db.delete(Streaks).where(eq(Streaks.id, streak.id));

      await db.insert(Logs).values({
        action: 'Manual Streak Stop',
        startedByPubkey: senderPubkey,
        relatedPubkey2: null,
        description: `User sent STOP command via DM. Streak "${streak.name}" (ID: ${streak.id}) is now Deleted.`,
      });
    }

    // Mark user as doNotKeepStreak so auto-follow doesn't recreate
    await db
      .update(BotFollower)
      .set({ doNotKeepStreak: true })
      .where(eq(BotFollower.pubkey, senderPubkey));

    // Invalidate all caches for this user
    await invalidateAllForPubkey(senderPubkey);

    await sendNip04DM(
      senderPubkey,
      `All your streaks have been stopped and removed. \n\n` +
        `We won't auto-create streaks for you anymore.\n` +
        `If you change your mind, visit ${process.env.FRONTEND_URL} to start again.`
    );

    await notifyWorkerToRefresh();
    return;
  }

  // ── /stats command ──
  if (command === 'stats') {
    // Use cached solo streaks
    const soloStreaks = await getSoloStreaksForPubkey(senderPubkey);

    if (soloStreaks.length === 0) {
      await sendNip04DM(
        senderPubkey,
        `You don't have any solo streaks yet!\n\n` +
          `Follow our bot account or visit ${process.env.FRONTEND_URL} to create one.`
      );
      return;
    }

    let statsMessage = `Your Solo Streak Stats\n\n`;

    for (const streak of soloStreaks) {
      const deadlineStr = streak.deadline
        ? `${Math.max(0, Math.round((new Date(streak.deadline).getTime() - Date.now()) / 3600000))}h remaining`
        : 'N/A';

      statsMessage +=
        `${streak.name}\n` +
        `   Status: ${streak.status}\n` +
        `   Current: ${streak.currentCount ?? 0} days\n` +
        `   Highest: ${streak.highestCount ?? 0} days\n` +
        `   Deadline: ${deadlineStr}\n` +
        `   Started: ${streak.startedAt ? new Date(streak.startedAt).toLocaleDateString() : 'N/A'}\n\n`;
    }

    statsMessage += `Visit ${process.env.FRONTEND_URL} for more details!`;

    await sendNip04DM(senderPubkey, statsMessage);
    return;
  }

  // ── Generic reply for anything else ──
  await sendNip04DM(
    senderPubkey,
    `Hey! 👋 I'm the Streakstr bot.\n\n` +
      `Here's what I can do:\n` +
      `  Reply STOP to stop all solo streak tracking\n` +
      `  Reply /stats to see your solo streak info\n\n` +
      `Want to start a streak? Follow this account or visit ${process.env.FRONTEND_URL} 🔥`
  );
}
