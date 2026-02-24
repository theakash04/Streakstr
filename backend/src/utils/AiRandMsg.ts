import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const genAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// falback
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

export async function generateAbuseMessage(
  abuseLevel: number,
  userInfo: { currentCount: number; streakName: string },
  messageType: 'dm' | 'post'
): Promise<string> {
  const prompt = `
You are generating a comedic roast message for a streak-based app.

Context:
- The user has a ${userInfo.currentCount}-day streak.
- The streak is called "${userInfo.streakName}".
- Abuse level: ${abuseLevel} (1=light tease, 2=strong roast, 3=extreme chaotic roast).
- Message type: ${messageType === 'dm' ? 'Private reminder (DM)' : 'Public shame post'}.

Tone rules by abuse level:
1 → Playful teasing. Light sarcasm. No profanity.
2 → Aggressive roast energy. Dramatic exaggeration. Mild profanity allowed. No real cruelty.
3 → Unhinged, chaotic, over-the-top roast. Strong profanity allowed. Absurd exaggeration.

Message type rules:
- If DM: It can encourage them to keep going (especially levels 0–2).
- If Post: It should feel like public humiliation humor. No encouragement required. Just funny roast energy.


Write only the message text. Keep it under 100 words.
`;

  try {
    const response = await genAi.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
      },
    });

    if (!response.text) {
      // fallback to default messages if ai generation fails for any reason
      const messages = ABUSE_MESSAGES[abuseLevel] || ABUSE_MESSAGES[0];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    return response.text?.trim();
  } catch (error) {
    const messages = ABUSE_MESSAGES[abuseLevel] || ABUSE_MESSAGES[0];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}
