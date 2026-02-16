import * as pg from 'drizzle-orm/pg-core';

export const User = pg.pgTable('users', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  pubkey: pg.text('pubkey').notNull().unique(),
  name: pg.text('name'),
  picture: pg.text('picture'),
  timezone: pg.text('timezone').default('UTC'),
  createdAt: pg.timestamp('created_at').defaultNow(),
});

export const Streaks = pg.pgTable('streaks', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  type: pg.varchar('type', { length: 100, enum: ['solo', 'duo'] }).notNull(),
  name: pg.varchar('name', { length: 255 }).notNull(),
  user1Pubkey: pg.text('user1_pubkey').notNull(),
  user2Pubkey: pg.text('user2_pubkey'),

  inviterPubKey: pg.text('inviter_pubkey'),
  inviteStatus: pg
    .varchar('invite_status', { length: 50, enum: ['none', 'pending', 'accepted', 'declined'] })
    .default('none'),
  inviteSentAt: pg.timestamp('invite_sent_at'),
  inviteAcceptedAt: pg.timestamp('invite_accepted_at'),
  inviteDeclinedAt: pg.timestamp('invite_declined_at'),
  status: pg
    .varchar('status', { length: 100, enum: ['pending', 'active', 'broken'] })
    .default('pending'),
  currentCount: pg.integer('current_count').default(0),
  highestCount: pg.integer('highest_count').default(0),
  lastActivityAt: pg.timestamp('last_activity_at'),
  startedAt: pg.timestamp('started_at'),
  endedAt: pg.timestamp('ended_at'),
  createdAt: pg.timestamp('created_at').defaultNow(),
  updatedAt: pg
    .timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const StreakHistory = pg.pgTable('streak_history', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  streakId: pg
    .uuid('streak_id')
    .references(() => Streaks.id)
    .notNull(),
  countBeforeBreak: pg.integer('count_before_break').notNull(),
  startedAt: pg.timestamp('started_at').notNull(),
  brokenAt: pg.timestamp('broken_at').defaultNow(),
  restoredAt: pg.timestamp('restored_at'),
  restored: pg.boolean('restored').default(false),
});

export const DailyLogs = pg.pgTable(
  'daily_logs',
  {
    id: pg.uuid('id').primaryKey().defaultRandom(),
    streakId: pg
      .uuid('streak_id')
      .references(() => Streaks.id)
      .notNull(),
    date: pg.date('date').notNull(),
    user1Completed: pg.boolean('user1_completed').default(false),
    user2Completed: pg.boolean('user2_completed').default(false),
    user1EventId: pg.text('user1_event_id'),
    user2EventId: pg.text('user2_event_id'),
    completedAt: pg.timestamp('completed_at'),
  },
  (table) => [pg.uniqueIndex('daily_logs_streak_date_idx').on(table.streakId, table.date)]
);

export const StreakSettings = pg.pgTable('streak_settings', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  streakId: pg
    .uuid('streak_id')
    .references(() => Streaks.id)
    .unique(),
  dmReminder: pg.boolean('dm_reminder').default(true),
  reminderTime: pg.time('reminder_time'),
  abuseLevel: pg.integer('abuse_level').default(2),
  timezone: pg.text('timezone').default('UTC'),
  // if user want to show in leaderboard or not, if not show, the streak will not be counted in the leaderboard, but still count in the streaks list
  showInLeaderboard: pg.boolean('show_in_leaderboard').default(false),
  updatedAt: pg
    .timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const ReminderLog = pg.pgTable('reminder_logs', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  streakId: pg
    .uuid('streak_id')
    .references(() => Streaks.id, { onDelete: 'cascade' })
    .notNull(),
  targetPubkey: pg.text('target_pubkey').notNull(),
  abuseLevel: pg.integer('abuse_level').notNull(),
  nostrEventId: pg.text('nostr_event_id'),
  sentAt: pg.timestamp('sent_at', { withTimezone: true }).defaultNow(),
});

export const BotFollower = pg.pgTable('bot_followers', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  pubkey: pg.text('pubkey').notNull().unique(),
  autoStreakCreated: pg.boolean('auto_streak_created').default(false),
  followedAt: pg.timestamp('followed_at').defaultNow(),
});

// we can use this table to keep track of the public tag posts we sent when someone breaks the streak, so we can avoid sending duplicate posts and also for analytics purpose
export const StreakBreakPost = pg.pgTable('streak_break_posts', {
  id: pg.uuid('id').primaryKey().defaultRandom(),
  streakId: pg
    .uuid('streak_id')
    .references(() => Streaks.id, { onDelete: 'cascade' })
    .notNull(),
  pubkey: pg.text('pubkey').notNull(),
  abuseLevel: pg.integer('abuse_level').notNull(),
  eventId: pg.text('event_id').notNull(),
  postedAt: pg.timestamp('posted_at').defaultNow(),
});

