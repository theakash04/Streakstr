## Must Have (MVP)

[ ] Streak CRUD API — create, list, get, update, delete streaks
[ ] Streak Settings API — update reminder type, timing, abuse level
[ ] Duo Streak Invite Flow — send invite DM, accept/decline via DM reply to bot

[ ] Call notifyWorkerToRefresh() after creating a streak so worker tracks new pubkeys
[ ] Notify user when streak breaks — send DM from bot when streakCheckWorker breaks a streak
[ ] Duplicate reminder check — query ReminderLog before sending, skip if already sent today
[ ] Welcome DM on bot follow — when auto-streak is created, send intro message
[ ] Fix npub in public tags — convert hex to nostr:npub1... format in post content

## Should Have

[ ] Upgrade DMs from Kind 4 to NIP-17 (see below)
[ ] Timezone-aware reminders — use reminderTime + timezone from settings in cron logic
[ ] Retry logic — relay publish failures should retry via BullMQ
[ ] Rate limiting on API endpoints
[ ] Zod schemas for streak creation/update validation

## Future

[ ] Top 10 most interacted npubs
[ ] Public opt-in leaderboard
[ ] LLM-generated abuse messages (levels 2-3)
[ ] Streak freeze/pause/restore
[ ] "STOP" DM command to deactivate streaks Frontend
