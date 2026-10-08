# POORMAN TELEBOT — CONTEXT / HANDOFF (2026-10-08)

> **Current decision (user approved):** Promote the **isolated webhook GAS + test Telegram bot** to the new family expense bot. Reuse the **existing Google Sheets** (no data migration). **Only after new bot is fully tested and confirmed working**, disable the old polling bot. Do not replace the old GAS deployment. Preserve it for rollback.

## Architecture and identifiers

- Repo: `hunghvt-cyber/poorman-telebot` (private).
- Old production source: GitHub `main` root GAS files. Old GAS script ID: `1sYaIFrLfzoj18ZbcXDwAEjuXBi-Y7iNPLZX2MqeFP2PV8I2SfFfLLFxt`. Old bot uses `getUpdates` every minute and is **still active** unless independently verified otherwise.
- New candidate source: `experiment/gas-webhook-isolated`, folder `experiments/gas-webhook/`.
- New GAS script ID: `1giuG5A8SrOsSwhcDC9Q_UTFxQGAr_TA73ukR8Tvq4cvOvYMuAv4wJUAO`.
- New Telegram bot: `@PoormanTest0219_bot` (test bot, candidate for permanent use). Its token lives **only** in the new GAS Script Properties `TEST_BOT_TOKEN`; never commit tokens.
- New webhook deployment ID: `AKfycby9V-wbbucC9zTBRfMdCM5Tf8qsJRlMVeQtOfyKmrtuOVmLs1USBcTTMbe4J2ExhpQn`.
- New webhook URL: `https://script.google.com/macros/s/AKfycby9V-wbbucC9zTBRfMdCM5Tf8qsJRlMVeQtOfyKmrtuOVmLs1USBcTTMbe4J2ExhpQn/exec`.
- Manual deploy workflow on `main`: `.github/workflows/deploy-gas-webhook-test.yml` checks out `experiment/gas-webhook-isolated` and updates the fixed test GAS deployment.
- Old production workflow `.github/workflows/deploy-apps-script.yml` **automatically deploys on any push to main** and calls `?bootstrap=1`, which runs `setupFamilyBot()`, deletes production webhook and ensures polling. **DO NOT merge to main or edit main casually.** Keep production workflow untouched until explicit migration design is approved.
- Existing Google Sheets spreadsheet ID is held in old GAS Script Property `GOOGLE_SPREADSHEET_ID`. Do not copy the ID into repo. New GAS must receive the **same** ID via its own Script Properties and be authorized to open it. Gemini key likewise set only via Script Properties.
- Existing Telegram family group ID is held in `FAMILY_GROUP_ID`; new GAS should be explicitly bound to the same group. Add new bot to group, disable its privacy mode if required, and avoid dual processing.
- Timezone: `Asia/Ho_Chi_Minh`.

## Verified experiments

- Earlier direct GAS webhook experiment in `docs/telegram-webhook-experiment-2026-10.md` failed (HTTP 404/302). That document is **historical**, not the current conclusion.
- New isolated deployment successfully handled Telegram direct webhook with `HtmlService.createHtmlOutput('OK')`, unlike `ContentService` which produced 302. The numeric `chat_id` needed `String(msg.chat.id)` in form payload to fix `400 chat not found`.
- User confirmed fast successful responses for `hello999`, `/start`, `/ping`, `/pong`; after hardening with LockService and last-100-update dedupe, user reported **smooth, no errors**.
- User has **not yet verified** full family expense workflow, shared Sheets writes, concurrent duplicates, callback buttons, or daily report in new GAS. Do not claim these are completed.

## Functional parity required from old bot

Source files on `main`: `Config.gs`, `FamilyConfig.gs`, `FamilyLedger.gs`, `FamilyCommands.gs`, `FamilyRouter.gs`, `TelegramClient.gs`, `Setup.gs`.

- Telegram family group: natural language expense/income parser, local first then Gemini fallback.
- Shared Sheets `Transactions` and `AuditLog`; columns include `TelegramChatId`, `TelegramMessageId`, `TransactionId`, `DedupeKey`, `Status`, `BotMessageId`.
- Reports: `/today`, `/month`, `/mine`, `/baocaongay`, `/baocaotuan`, `/baocaothang`, `/baocaonam`.
- Transactions: `/giaodich`, reply-to-edit, `/xoa`, `/khoiphuc`, `/suatien`, `/suadanhmuc`, `/suanoidung`.
- Group controls: `/whoami`, `/clear`, `/resettests` and its `callback_query` confirmation.
- Daily automatic report around 21:00 VN: **daily total, average/day in month, month-to-date total; no per-member detail**. In old code this is invoked from `pollFamilyTelegram_`. New webhook must schedule it independently, retaining once/day marker `DAILY_REPORT_SENT_DATE`.

## Critical reliability and safety requirements

1. **Never turn off old polling before new webhook handles real commands and Sheets correctly.** During validation, avoid allowing both bots to process the same group expenses: test new bot in a private test group or tightly controlled window; do not accidentally double count.
2. Port old family functions into new GAS while keeping **one** `doPost` and one `doGet`. Route `message` and `callback_query`; keep HtmlService response.
3. Use the **same existing spreadsheet**, with new GAS `GOOGLE_SPREADSHEET_ID` and permission. No data copying or resetting. Existing transaction dedupe key `telegram:<chat_id>:<message_id>` is based on message IDs and should survive a bot switch; make the check+append atomic under LockService.
4. GAS webhook returning HTTP 200 after a caught failure means Telegram will not retry. Add failure diagnostics/recovery strategy; do not claim exactly-once semantics from last-100 cache. Never echo secret details.
5. Separate time-based trigger for daily report; validate it sends once and does not rely on polling.
6. Migration cutover: verify new bot permissions and group binding; remove old polling trigger **only after** new bot acceptance, verify `getUpdates` stops on old bot, preserve old source/GAS/token for rollback. Old and new bot tokens are different, so Telegram allows old polling and new webhook simultaneously, but they must not both record group messages.
7. For rollback: stop new bot processing/permissions before re-enabling old polling; never delete Sheets rows or drop Telegram pending updates without user approval.
8. Main branch auto-deploy caveat: pushing any change to `main` can redeploy and re-bootstrap old bot. Keep changes in experiment branch until cutover is planned and CI modified safely.

## Current work state / next steps

- User approved shared Sheets and disabling old polling **after** successful cutover.
- Current test GAS still runs the **echo benchmark**, not full expense ledger. Do not present migration as completed.
- Next: port family source into `experiments/gas-webhook/`, adjust config for test bot, add atomic dedupe and standalone daily-report trigger, test against shared Sheets with controlled transactions and no duplicate recording, then schedule cutover.
- Deployment is manual via the test workflow. Assistant can edit repo via GitHub connector; user triggers GitHub Actions and GAS functions when needed. Production old GAS must not be changed until acceptance.
- See `README.md` and `PRODUCTION_MIGRATION_CHECKLIST.md` in this directory.

## Implementation footguns observed in main

- `FamilyRouter.gs` old `doPost` returns ContentService, not suitable for the new webhook.
- `Setup.gs` `setupFamilyBot` deletes webhook and creates poll trigger: must NOT be called in new GAS.
- `sendFamilyDailyReportIfDue_` currently only invoked from `pollFamilyTelegram_`.
- `appendFamilyTransaction_` uses `isDuplicate_` then `appendRow` without atomic lock.
- `familyResetCallback_` itself acquires ScriptLock; do not wrap the entire new webhook in another ScriptLock or deadlock nested lock acquisition.
- The old production workflow calls `?bootstrap=1` on every main deployment; avoid main modifications while old polling is running.

## Implementation progress — 2026-10-08 (latest)

- Ported family sources to isolated GAS directory: `Config.gs`, `FamilyConfig.gs`, `FamilyLedger.gs`, `FamilyCommands.gs`, `FamilyRouter.gs`, `TelegramClient.gs`, `DailyReport.gs`.
- Replaced echo-only `Code.gs` with family router, **disabled by default** via `ENABLE_FAMILY_WEBHOOK`. Before activation only `/ping`, `/start`, `/status` reply in test chat; all expense messages ignored. The old bot remains live.
- `FamilyLedger.gs` makes duplicate-check+append atomic with `LockService`; `familyResetCallback_` retains its own lock. Do not lock the outer `doPost`.
- `Cutover.gs` adds `inspectNewBotReadiness()`, `installWebhookDailyReportTrigger()`, `runWebhookDailyReport_()`, `activateNewFamilyWebhook()`, `pauseNewFamilyWebhook()`. Daily trigger checks every 10 minutes during 21:00 VN and only runs while active; **not exact 21:00**.
- **Not deployed or runtime-tested yet.** GitHub workflow must be manually run, and new GAS Script Properties must be configured: `TEST_BOT_TOKEN`, `GOOGLE_SPREADSHEET_ID` (same existing sheet), `GEMINI_API_KEY`, `FAMILY_GROUP_ID`. Only values already in test GAS may be assumed configured; verify via `inspectNewBotReadiness()`.
- After deployment, run `inspectNewBotReadiness()` and `installWebhookDailyReportTrigger()` in NEW GAS. Do not activate until old polling has been stopped and new bot is present in family group. Controlled end-to-end testing of expense features is still required.
- **Important**: Old `main` auto-deploys old GAS and re-creates polling on every push; keep new code on experiment branch. To disable old polling permanently, a separate main workflow change is needed or disable the production deployment workflow before removing old polling trigger. User has authorized disabling old polling after the new bot is ready, but do not do it prematurely.
- No changes have been made to old production GAS or its Telegram token; shared spreadsheet content has not been changed.
