import { and, desc, eq, gte } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import redis from '../../config/redis.ts';
import { db } from '../../db/index.ts';
import { StreakSettings, Streaks } from '../../db/schema.ts';
import { getUserFromRelays } from '../../utils/Nostr/nostrQueries.ts';

export async function GetLeaderboard(req: FastifyRequest, reply: FastifyReply) {
  try {
    // const cacheKey = 'leaderboard:top10';
    // const cachedData = await redis.get(cacheKey);
    // console.log(JSON.parse(cachedData!));

    // if (cachedData) {
    //   return reply.status(200).send({ leaderboard: JSON.parse(cachedData) });
    // }

    const leaderboard = await db
      .select()
      .from(StreakSettings)
      .innerJoin(
        Streaks,
        and(
          eq(StreakSettings.streakId, Streaks.id),
          gte(Streaks.currentCount, 1),
          eq(Streaks.type, 'solo'),
          eq(Streaks.status, 'active')
        )
      )
      .where(eq(StreakSettings.showInLeaderboard, true))
      .orderBy(desc(Streaks.currentCount))
      .limit(10);

    // fetch the user info from nostr
    const userInfos = await Promise.all(
      leaderboard.map(async (row) => {
        if (!row.streaks?.user1Pubkey) return null;

        const userInfo = await getUserFromRelays(row.streaks.user1Pubkey);

        return {
          ...row,
          userInfo,
        };
      })
    );

    const filtered = userInfos.filter(Boolean);

    // in frontend only send userInfo and their streaks current count nothing else
    const formattedLeaderboard = filtered.map((info) => {
      let parsedUserInfo = null;
      try {
        if (info?.userInfo!) {
          parsedUserInfo = JSON.parse(info?.userInfo!);
        }
      } catch (e) {
        req.log.error({ error: e }, 'Failed to parse userInfo profile');
      }

      return {
        userInfo: parsedUserInfo,
        currentCount: info?.streaks?.currentCount || 0,
      };
    });

    // Cache the result for 5 minutes (300 seconds)
    await redis.setex('leaderboard:top10', 300, JSON.stringify(formattedLeaderboard));

    return reply.status(200).send({ leaderboard: formattedLeaderboard });
  } catch (error) {
    console.log(error);
    return reply.status(500).send({ error: 'Failed to get leaderboard' });
  }
}
