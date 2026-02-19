import { Queue } from 'bullmq';
import connection from './connect.ts';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, // 5s → 10s → 20s
  },
  removeOnComplete: { count: 100 }, // keep last 100 completed for debugging
  removeOnFail: { count: 500 }, // keep last 500 failed for debugging
};

export const reminderQueue = new Queue('reminders', { connection, defaultJobOptions });
export const streakCheckQueue = new Queue('streak-checks', { connection, defaultJobOptions });
export const inviteCheckQueue = new Queue('invite-checks', { connection, defaultJobOptions });
export const refreshQueue = new Queue('subscription-refresh', { connection, defaultJobOptions });
