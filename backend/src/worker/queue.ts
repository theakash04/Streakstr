import { Queue } from 'bullmq';
import connection from './connect.ts';

export const reminderQueue = new Queue('reminders', { connection });
export const streakCheckQueue = new Queue('streak-checks', { connection });
export const inviteCheckQueue = new Queue('invite-checks', { connection });
export const refreshQueue = new Queue('subscription-refresh', { connection });
