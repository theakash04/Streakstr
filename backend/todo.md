# Streakstr — Progress Tracker

---

## ✅ Done

### Infrastructure

- [x] PostgreSQL + Drizzle ORM — schema, migrations, drizzle-kit push
- [x] Redis (ioredis) — cache layer + BullMQ job queues
- [x] Fastify HTTP server — running, routes registered
- [x] Worker process — separate process, communicates via BullMQ

### Auth

- [x] NIP-98 challenge/verify login flow
- [x] JWT token generation + auth middleware

### Relay Subscriptions (Worker)

- [x] Live subscription to Kind 1 (notes) for tracked pubkeys
- [x] Live subscription to Kind 3 (follows) on bot account
- [x] Live subscription to Kind 1059 (NIP-17 DMs) on bot account
- [x] Live subscription to Kind 4 (NIP-04 DMs) on bot account
- [x] Auto-reconnect on relay disconnect (5s delay)
- [x] Catch-up on missed follows during worker downtime

### Streak Logic

- [x] Rolling 24hr window — deadline-based, no timezone needed
- [x] Solo streaks — any post counts, window completes on activity
- [x] Duo streaks — must interact WITH partner (checks p-tags), both sides must complete
- [x] Deadline resets to now + 24hrs on window completion
- [x] Auto-create solo streak on bot follow
- [x] doNotKeepStreak opt-out flag (prevents auto-creation)

### Notifications

- [x] NIP-17 encrypted DMs from bot (Gift Wrap: Kind 14 → 13 → 1059)
- [x] Reminder worker — sends DM 2-4hrs before deadline expires
- [x] Reminder dedup — Redis key per streak+user+deadline (1 reminder per window)
- [x] Public shame post — Kind 1 tagging user on streak break (abuse level 2+)
- [x] Abuse levels 0-3 with different message tones
- [x] Welcome DM on bot follow with streak info

### Caching

- [x] Active streaks by pubkey (5min TTL)
- [x] Window completion flag (24hr TTL)
- [x] Bot follower status (1hr TTL)
- [x] Solo streaks for /stats (5min TTL)
- [x] Bulk cache invalidation on streak changes

### Workers (BullMQ Cron)

- [x] Reminder worker — hourly, finds streaks 2-4hrs before deadline
- [x] Streak check worker — hourly, breaks expired streaks, logs history
- [x] Subscription refresh worker — triggered by API via queue

### Bot DM Commands

- [x] /stop — delete solo streaks, set doNotKeepStreak
- [x] /stats — reply with current streak info + hours remaining
- [x] /start — create new solo streak
- [x] Generic help reply for unknown messages
- [x] NIP-04 (Kind 4) + NIP-17 (Kind 1059) both supported

### API Routes (Solo)

- [x] `GET /api/streaks/all` — list user's streaks
- [x] `POST /api/streaks/solo` — create solo streak
- [x] `DELETE /api/streaks/:streakId` — delete a streak
- [x] `GET /api/streaks/logs` — get unread logs
- [x] Zod validation schemas for route inputs
- [x] `notifyWorkerToRefresh()` called in EventHandler after streak create/delete

---

## TODO — MVP

### API Routes (Missing)

- [x] `PUT /api/streaks/:id/settings` — update abuse level, reminder toggle, reminder offset
- [x] `GET /api/streaks/:id` — get single streak with settings + daily logs + history

### Fixes

- [x] Fix npub in public shame posts — convert hex to `nostr:npub1...` format

---

## 🔧 TODO — Polish

- [ ] Retry logic — relay publish failures should retry via BullMQ
- [ ] Rate limiting on API endpoints
- [ ] Error handling — consistent error responses across all routes
- [ ] Logging — structured logs (pino) instead of console.log

---

## 🚀 TODO — Future

- [ ] Duo streak invite flow (invite link, accept/decline via website)
- [ ] Public opt-in leaderboard
- [ ] Streak freeze / pause / restore
- [x] AI-generated roast messages (abuse level 2-3)
- [ ] Top 10 most interacted npubs
- [ ] Frontend (landing page + dashboard + settings)
