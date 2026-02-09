import * as pg from 'drizzle-orm/pg-core';

const user = pg.pgTable('users', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  pubkey: pg.text('pubkey').notNull().unique(),
  name: pg.text('name'),
  picture: pg.text('picture'),
  timezone: pg.text('timezone').default('UTC'),
  createdAt: pg.timestamp('created_at').defaultNow(),
});

export const streaks = pg.pgTable('streaks', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  type: pg.text('type', { enum: ['solo', 'duo'] }).notNull(),
  user1Pubkey: pg.text('user1_pubkey').notNull(),
  user2Pubkey: pg.text('user2_pubkey'),
  status: pg.text('status', { enum: ['pending', 'active', 'broken'] }).default('pending'),
  currentCount: pg.integer('current_count').default(0),
  highestCount: pg.integer('highest_count').default(0),
  lastActivityAt: pg.timestamp('last_activity_at'),
  createdAt: pg.timestamp('created_at').defaultNow(),
});

export const streakHistory = pg.pgTable('streak_history', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  streakId: pg.uuid('streak_id').references(() => streaks.id),
  countBeforeBreak: pg.integer('count_before_break').notNull(),
  brokenAt: pg.timestamp('broken_at').defaultNow(),
  restoredAt: pg.timestamp('restored_at'),
  restored: pg.boolean('restored').default(false),
});

export const dailyLogs = pg.pgTable('daily_logs', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  streakId: pg.uuid('streak_id').references(() => streaks.id),
  date: pg.date('date').notNull(),
  user1Completed: pg.boolean('user1_completed').default(false),
  user2Completed: pg.boolean('user2_completed').default(false),
  user1EventId: pg.text('user1_event_id'),
  user2EventId: pg.text('user2_event_id'),
  completedAt: pg.timestamp('completed_at'),
});

export const streakSettings = pg.pgTable('streak_settings', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  streakId: pg
    .uuid('streak_id')
    .references(() => streaks.id)
    .unique(),
  dmReminder: pg.boolean('dm_reminder').default(true),
  postReminder: pg.boolean('post_reminder').default(false),
  remainderTime: pg.time('reminder_time'),
  timezone: pg.text('timezone').default('UTC'),
  enabled: pg.boolean('enabled').default(true),
});
