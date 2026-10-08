# Production webhook migration — staged review, NOT ACTIVATED

Date: 2026-10-08. Test bot validated by user; production bot remains on one-minute polling.

## Current production findings

- `FamilyRouter.gs` has `doPost` returning `ContentService` (302 risk). Must return `HtmlService` for both success and error.
- `TelegramClient.gs` already converts `chat_id` to string in `sendText`.
- `Setup.gs` `setupFamilyBot()` deliberately deletes webhook and ensures a polling trigger. Never run it after switching to webhook without revising it.
- `pollFamilyTelegram_()` calls `sendFamilyDailyReportIfDue_()`. Removing the poll trigger removes the **21:00 Vietnam daily report** unless a separate time trigger is created.
- `handleFamilyMessage_` supports commands, reply edits, reports and expense creation; `familyResetCallback_` handles inline button callback queries. Webhook must request both `message` and `callback_query`.
- `appendFamilyTransaction_` checks the `DedupeKey` column before appending, but the check+append is not atomic. Concurrent webhook executions require a script lock around transaction writes.
- Polling currently advances offset even after caught errors; webhook success also acknowledges delivery even if business logic failed. Financial reliability needs error recording and a reconciliation strategy.

## Preconditions for any production cutover

1. **Isolated test:** verify duplicate update handling by replaying an identical test update, including concurrent replay; confirm only one response or one ledger entry. Verify callback query and non-text updates. Inspect `getWebhookInfo` for zero pending and no new error.
2. **Staging data:** test the actual expense router against a separate test spreadsheet and test Telegram bot, never production Sheets.
3. **Daily report:** move daily reporting to a dedicated hourly/minute-based trigger or a dedicated near-21:00 time trigger; confirm it sends once/day using `DAILY_REPORT_SENT_DATE`. GAS time triggers may not run at exactly 21:00.
4. **Atomic dedupe:** use `LockService` for read+append in `appendFamilyTransaction_`. Avoid taking the same non-reentrant script lock in nested functions. For multi-step edits/callbacks, assess idempotency separately.
5. **Webhook entry:** preserve group restrictions, message and callback query routing, diagnostics, and HTML response. Ensure it does not echo sensitive errors to arbitrary chats.
6. **Operational controls:** separate `enableProductionWebhook` and `rollbackToPolling` functions, require an explicit confirmation property and preflight. Stop/delete poll triggers *before* calling `setWebhook`. Rollback: `deleteWebhook(drop_pending_updates:false)` then restore a single poll trigger. Do not drop pending updates during production rollback.
7. **Deployment:** update existing production web app deployment and verify URL, execution identity and anonymous access. No token in GitHub. Do not alter production triggers, webhook or deployment automatically on merge.

## Production go/no-go checklist

- Isolated test passes text, /start, /ping, callbacks, duplicate replay, concurrency, getWebhookInfo and 24-hour soak.
- Real business logic passes against staging sheet: create, dedupe, edit, delete, restore, reset callback, daily report.
- Explicitly verify 21:00 report still scheduled after polling removal.
- Confirm production `BOT_TOKEN`, `GOOGLE_SPREADSHEET_ID`, `FAMILY_GROUP_ID`, `WEB_APP_URL` remain unchanged.
- Save current production deployment version and trigger state for rollback.
- User explicitly authorizes production cutover at a separate step.

## Known caveat

Telegram considers a 200 webhook response successful even when internal processing fails. A last-100-ID Script Properties cache is **not** durable financial delivery. The production design must record failures and support reconciliation before replacing polling.
