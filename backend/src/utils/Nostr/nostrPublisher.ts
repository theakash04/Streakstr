import { nip04, nip19, nip44, SimplePool } from 'nostr-tools';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { useWebSocketImplementation } from 'nostr-tools/pool';
import { hexToBytes } from 'nostr-tools/utils';
import { Streaks } from '../../db/schema.ts';
import { RELAY_URLS } from '../../config/relay.ts';

useWebSocketImplementation(WebSocket);

const pool = new SimplePool({ enablePing: true, enableReconnect: true });
const decoded = nip19.decode(process.env.NOSTR_BOT_SECRET_KEY!);
if (decoded.type !== 'nsec') {
  throw new Error('Invalid Nostr bot secret key');
}
const botSk: Uint8Array = decoded.data;

type Streak = typeof Streaks.$inferSelect;

// Change this with prompt and use ai to generate different message based on abuse level
const ABUSE_MESSAGES: Record<number, string[]> = {
  0: [
    'Hey! Just a friendly reminder to keep your streak going today 🔥',
    "Don't forget your streak! You've got this 💪",
  ],
  1: [
    "Your streak is about to break... don't be that person 😤",
    'Streak alert! Are you seriously going to let this die? 🫠',
  ],
  2: [
    "YOUR STREAK IS DYING AND IT'S YOUR FAULT 💀",
    'Imagine losing a streak because you were too lazy to post. Could not be me. Oh wait, it IS you 🤡',
  ],
  3: [
    "You absolute walnut. Your streak is about to die and you're doing NOTHING about it 🥜💀",
    'Breaking your streak? In THIS economy? Pathetic. 📉🤮',
  ],
};

async function getRandomMessage(abuseLevel: number): Promise<string> {
  // later change it to use ai to generate message based on abuse level and user info, for now just return random message from the list
  const messages = ABUSE_MESSAGES[abuseLevel] || ABUSE_MESSAGES[0];
  return messages[Math.floor(Math.random() * messages.length)];
}

export async function sendDMReminder(
  targetPubkey: string,
  streak: Streak,
  abuseLevel: number,
  hoursLeft: number = 0
): Promise<string | null> {
  try {
    const timeWarning =
      hoursLeft > 0
        ? `Your streak expires in ~${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}! Post something on Nostr to keep it alive! 📝`
        : `Your streak has expired! 💀`;

    const message =
      `${await getRandomMessage(abuseLevel)}\n\n` +
      `Streak: "${streak.name}" — Day ${streak.currentCount ?? 0}\n` +
      timeWarning;

    return sendNip17DM(targetPubkey, message);

    // const event = finalizeEvent(
    //   {
    //     kind: 4,
    //     created_at: Math.floor(Date.now() / 1000),
    //     tags: [
    //       ['p', targetPubkey],
    //       ['subject', `Streak Reminder: ${streak.name}`],
    //     ],
    //     content: await nip04.encrypt(botSk, targetPubkey, message),
    //   },
    //   botSk
    // );

    // await Promise.all(pool.publish(RELAY_URLS, event));
    // return event.id;
  } catch (error) {
    console.error(`Error sending DM reminder to ${targetPubkey}:`, error);
    return null;
  }
}

export const sendPublicTagPost = async (
  targetPubkey: string,
  streak: Streak,
  abuseLevel: number
): Promise<string | null> => {
  try {
    // TODO: we use shaming and mocking message here as it is post according to abuse level
    const message = `${await getRandomMessage(abuseLevel)}\n\nStreak: "${streak.name}" - Day ${streak.currentCount ?? 0}\n\n@${targetPubkey}`;
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', targetPubkey]],
        content: message,
      },
      botSk
    );

    await Promise.all(pool.publish(RELAY_URLS, event));
    return event.id;
  } catch (error) {
    console.error(`Error sending public tag post for ${targetPubkey}:`, error);
    return null;
  }
};

export async function sendNip17DM(targetPubkey: string, message: string): Promise<string | null> {
  try {
    const rumor = {
      kind: 14,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', targetPubkey]],
      content: message,
      pubkey: getPublicKey(botSk),
    };

    const conversationKey = nip44.v2.utils.getConversationKey(botSk, targetPubkey);
    const encryptedRumor = nip44.v2.encrypt(JSON.stringify(rumor), conversationKey);

    const seal = finalizeEvent(
      {
        kind: 13,
        created_at: randomTimeOffset(),
        tags: [],
        content: encryptedRumor,
      },
      botSk
    );

    const randomSk = generateSecretKey();
    const giftWrapConvoKey = nip44.v2.utils.getConversationKey(randomSk, targetPubkey);
    const encryptedSeal = nip44.v2.encrypt(JSON.stringify(seal), giftWrapConvoKey);

    const giftWrap = finalizeEvent(
      {
        kind: 1059,
        created_at: randomTimeOffset(),
        tags: [['p', targetPubkey]],
        content: encryptedSeal,
      },
      randomSk
    );

    await Promise.any(pool.publish(RELAY_URLS, giftWrap));
    console.log(`NIP-17 DM sent to ${targetPubkey}`);
    return giftWrap.id;
  } catch (error) {
    console.error(`Failed to send NIP-17 DM:`, error);
    return null;
  }
}

/**
 * Randomize timestamp by ±2 days to hide metadata
 */
function randomTimeOffset(): number {
  const twoDays = 2 * 24 * 60 * 60;
  const offset = Math.floor(Math.random() * twoDays) - twoDays;
  return Math.floor(Date.now() / 1000) + offset;
}
