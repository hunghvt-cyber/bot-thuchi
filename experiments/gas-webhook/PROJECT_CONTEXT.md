# BIDV FLEXIBLE LABELS + TELEGRAM MINIMUM — 26/10/2026

Owner supplied BIDV +14 VND interest alert with a dot after the date and requested no bank notifications below 1,000 VND. The local BIDV account parser accepts line/space separators, optional date punctuation and bounded observed label spelling variants; it still anchors signed Số tiền GD and validates money/date, never ending balance. Gemini fallback prompt clarifies BIDV fields and exact small dong values; grounding checks remain unchanged. After detection, recognized exact amounts 1–999 VND from either local or Gemini parsers are marked ignored (below_notification_minimum), logged within the existing seven-day event window and ACKed ignored; no Telegram draft or family ledger write. Exactly 1,000 VND and unknown amounts retain their existing draft/review flow. Threshold applies only to family bank Telegram notifications; manual entries, edits and separate donation projection remain unchanged. No phone edits, setup, old draft deletion or replay. All 141 mock/static tests pass locally; verify Actions deployment separately.

# MB DONATE DRAFT — 25/10/2026

Owner supplied actual MB/VCB notification screenshot. Local deterministic parsers now handle both signs for com.VCB and com.mbmobile. Donation projection only accepts incoming MB 566766, with stable bank reference dedupe; family Telegram still receives Thu and Chi. Dedicated HomepageDonations Sheet stores sanitized JSON; Gemini thanks is once per new donation. No automatic family Transactions writes, phone edits or old event replay. 135 tests pass locally; deployment and real transfer verification are separate. See DONATIONS.md.

# MACRODROID SPOOL ACK V2 — 24/10/2026

Owner authorized upgrading capture/queue/ACK/bounded retry/serialization/logging together. Intake supports opt-in `&ack=2` returning exactly four LF-terminated lines: BANK-ACK-2, SHA256 of exact UTF8 request text, existing intake status, END_BANK_ACK_2. No secrets/raw content in ACK. Status remains subject to existing authentication, event claim and Telegram-send uncertainty handling; no additional Telegram/Sheets operation. Existing v1 clients without this parameter retain JSON responses. 122 mocked GAS tests pass. MacroDroid two-macro trial, native HTTP plus local file spool, lives in macrodroid-config experiment/bank-durable-queue-v2-20261024. No phone import or Android shell/FileChanged behavior is inferred from validation. Drafts remain approval-only, seven-day server log and 48h draft expiry unchanged; queued events older than 48h are held for manual review rather than retimestamped.

# BANK EDIT RECEIPT DETAILS — 24/10/2026

Owner requested every successful bank correction acknowledgement include the resulting transaction description, alongside amount, direction, source, category and transaction code. Both draft-correction commit receipts and already-recorded command update receipts now use bankApprovedText_ with a custom success heading. Original message refresh and receipt fallback share the same formatter; description display preserves the accepted 400-character limit. No ledger logic, extra API calls, MacroDroid configuration or historical rows changed. All 120 mocked tests pass, including assertions for description and current fields after each recorded correction. Verify Actions deployment before calling this live.

# BANK NATIVE COPY CONTROLS — 24/10/2026

Owner approved four visible native copy_text edit buttons instead of slow menu callbacks: Sửa tiền / Nội dung / Danh mục / Thu-Chi. Tap copies /suatien|/suanoidung|/suadanhmuc|/sualoai #b<12-hex event id> plus space; user Pastes, adds value and Sends. Selecting the action no longer calls GAS. Drafts retain Duyệt/Delete; recorded confirmations and success receipts retain the four copy buttons. /bankbuttons (owner/group only) refreshes newest applicable existing message once for testing; old Edit callbacks also transition their message. No MacroDroid/BotFather/private config change.

Reserved bank command refs are resolved uniquely to current owner/group event before normal ledger intake. Valid complete draft corrections auto-commit with existing 48h approval deadline; incomplete/invalid/expired drafts do not write. Already booked commands update the same active owner/group row atomically and audit changes, never append a transaction. Command IDs/monotonic IDs and initial draft edit IDs guard replay/reordering. Copy refs remain valid only in seven-day event retention; permanent transaction-ID legacy commands remain separate and unchanged. Current log fields update; original extraction/first approval snapshots remain. Backend apply still waits on GAS/Sheets; only edit-action selection is client-side. 120 mock/static tests pass; phone copy workflow has not been live verified. See BANK_COPY_COMMANDS.md.

# BANK EDIT REPLY RECEIPTS — 24/10/2026

Owner missed success because only an older original message was edited above the prompt/reply. After a valid bank text correction is committed/verified, a fresh concise “✅ Đã ghi Sheets” reply is now sent under the user input before refreshing the original confirmation. Its BotMessageId is bound in the existing ledger; original TelegramMessageId remains for reply editing. No additional transaction row/schema/macro/config change. Button-based confirmations remain in place only. Ambiguous ledger failure produces no success receipt; already verified writes remain committed even if Telegram/binding fails, with sanitized log errors and no false request to repeat the financial entry. 111 mock/static tests pass. User example original already displayed the submitted description with “Đã ghi sổ”; assistant did not independently inspect the live Sheet. See BANK_EDIT_RECEIPT.md.

# BANK EDIT COMMITS + READ-ONLY MENUS — 24/10/2026

Owner says batching is still slow and explicitly requests edits to write Sheets like Duyệt. A submitted valid amount/content/category/Thu-Chi correction now approves via the existing locked/deduped bankCommit_ when required fields are complete, including explicit unchanged-value submissions. Opening Edit/menu/prompt, Back, Delete or Restore does not approve. Incomplete edits stay drafts; invalid/unauthorized/expired edits cannot write. Prompts disclose edit-and-record behavior. After recording, existing ledger reply edits remain; stale draft actions cannot mutate it.

Read-only Edit/category/type/Back navigation now avoids ScriptLock, edit claims, extraction hashing and event/property rewrites. It still verifies current owner/group/message/event/expiry/state before batched Telegram UI dispatch. Category callbacks carry validated exact category values (catv), avoiding saved index snapshots and reorder mistakes; legacy numeric callbacks remain supported. Best-effort navigation timing cache (one hour, no financial state) is written after dispatch and surfaced by owner-only /banklog details; normal learning retention remains seven days and approval expiry 48h. 106 mock/static tests pass. Version 35 was reported insufficient; current live improvement remains unmeasured. See BANK_EDIT_COMMIT_FAST_NAV.md; no macro/config/setup change required.

# BANK BUTTON BATCHING — 24/10/2026

Owner approved speeding up existing Edit / Duyệt menus. After existing authorization and state claim, non-approval buttons send callback acknowledgement and UI edit/prompt together in one fetchAll through telegramCallbackUi_. Do not serially resend an ambiguous batch, especially sendMessage prompts. UI success/failure is independent of acknowledgement response; errors still release the claim and are recorded safely. Duyệt retains the existing early acknowledgement and atomic ledger path, outside batching. No UI layout, macro, private config, Sheets schema or receipt/manual routing changes. Weekly logs and 48h draft expiry remain. last_ui_timing captures in-handler preparation/Telegram timing for the most recent UI batch; /banklog <id> shows it only to owner. This does not measure full tap latency or establish BotFather-like performance. 97 mock/static tests pass; live speed improvement remains to be observed. See BANK_UI_BATCH.md.

# BANK LOG RETENTION — 24/10/2026 (supersedes 48h log retention below)

Owner explicitly requested **one week of learning logs**. BANK_EVT_ original excerpt, initial extraction, bounded corrections, approval snapshot and errors are retained for seven days from capture (legacy: server created time), independently of draft expiry. /banklog reads the seven-day window including expired-unreviewed drafts; it never treats abandonment as model error. Approval/edit expiry and BANK_MSG_ mappings remain 48h/5min, so retaining logs cannot reopen an expired draft or permit a late ledger write. Existing cleanup prunes events at the seven-day deadline, mappings at their own deadlines; reads exclude logs outside the week. No property change, migration/setup, new trigger, phone macro, Sheet or server required. Existing not-yet-purged events benefit too; removed records cannot be recovered. 88 mock/static tests pass; verify deployment separately. See BANK_LEARNING_LOG.md.

# BANK LEARNING LOG — 23/10/2026

Owner approved enabling temporary comparison logs: preserve the initial extraction, authorized draft corrections, final accepted snapshot and sanitized failures inside the existing 48h event. No new Sheet/service/config and no automatic report or Gemini training. `/banklog`, `/banklog 2`, `/banklog <id>` are owner-only in the bound group, after webhook authentication and before ledger routing. Ignored, deleted and unreviewed are distinct; abandoned drafts are never labeled model errors. Expired event state is excluded from reads and deleted by existing cleanup. Legacy baseline is explicitly unknown. Logs keep up to eight recent edits/four errors with a byte budget; no secret-bearing error body is stored. See BANK_LEARNING_LOG.md. 84 mock/static tests pass; actual runtime log reading remains separately unverified until user evidence.

# BANK OWNER APPROVAL — 23/10/2026 (supersedes preview-only restriction below)

Owner explicitly selected **Ghi vào Sheets** for the new Duyệt button. Intake still creates drafts only; no automatic bank ledger writes. Draft home shows Edit / Duyệt; Edit opens the four correction actions plus Back/Delete. Only the configured bank owner in the configured group can approve an unexpired, nondeleted draft with valid amount, direction and category. BankCommit.gs writes to the existing 18-column Transactions schema under the shared ScriptLock. A durable bank:<event digest> DedupeKey prevents repeated approval/ambiguous append retry from appending twice, including after temporary state loss. Event/raw/prompt state remains 48 hours; ledger records and their dedupe key persist normally. Original bank time is used where locally parsed; otherwise notification capture time. Raw notification is not copied into permanent ledger RawText. Approved messages use the existing ledger reply/edit/delete path; old draft prompts cannot mutate approved entries.

This is owner approval per draft, not automatic transaction ingestion. Cross-app/manual-entry transaction matching is not implemented: do not approve a draft for an expense already entered manually, or both sides of a transfer as real household income/expense. Do not activate automatic bank writes or change the phone/key settings. Mock tests cover 72 cases; actual user approval and live Sheets row verification remain distinct from deployment. See BANK_APPROVAL.md.

# MACRODROID PREVIEW — owner approved deployment 23/10/2026

Owner explicitly approved deploying PREVIEW to the existing active GAS. Integrate this branch into experiment/gas-webhook-isolated, verify deploy-gas-webhook-test workflow, then complete private GAS setup. At this commit deployment/configuration/live Telegram delivery have NOT yet been verified. New intake defaults disabled; PREVIEW only, no bank ledger writes. Existing manual bot entries remain unchanged. See [BANK_RELAY_PREVIEW.md](BANK_RELAY_PREVIEW.md). Runtime setup is not executed by clasp deployment.

# CURRENT OPERATING HANDOFF — 2026-10-16

> **READ THIS SECTION FIRST.** Older sections below are a chronological engineering journal, not current operational instructions. In particular, claims that the new webhook is still a candidate, that the old polling bot is live, or that the main workflow auto-bootstraps polling are superseded.

## Source of truth and deployment

- **Active family bot:** Telegram `@PoormanTest0219_bot`, direct webhook to isolated GAS. The old root/main polling bot `@Botnhangheo_bot` is retired for family expense intake.
- **Edit code here:** GitHub branch `experiment/gas-webhook-isolated`, folder `experiments/gas-webhook/`. The root files on `main` are legacy and **do not** implement changes to the active family bot.
- **Active GAS editor:** https://script.google.com/home/projects/1giuG5A8SrOsSwhcDC9Q_UTFxQGAr_TA73ukR8Tvq4cvOvYMuAv4wJUAO/edit
- **Webhook deployment:** `AKfycby9V-wbbucC9zTBRfMdCM5Tf8qsJRlMVeQtOfyKmrtuOVmLs1USBcTTMbe4J2ExhpQn`.
- **Deployment workflow:** `.github/workflows/deploy-gas-webhook-test.yml`; push changes under `experiments/gas-webhook/**` on the isolated branch to run tests, clasp push and update deployment. Verify GitHub Actions success before treating code as deployed. It does **not** execute migration/maintenance functions.
- **Legacy GAS:** `1sYaIFrLfzoj18ZbcXDwAEjuXBi-Y7iNPLZX2MqeFP2PV8I2SfFfLLFxt`. Its polling trigger was removed; keep its Homepage signed chat/stats endpoints intact. Do not run `setupFamilyBot()`, bootstrap old polling, or enable both bots as ledger writers.
- **Storage:** Both versions use the same existing Google Sheets `Transactions`; no data migration to a different spreadsheet. Secrets remain in GAS Script Properties, never in GitHub.
- **Timezone:** `Asia/Ho_Chi_Minh`. Scheduled daily summary is around 21:00 Vietnam time (GAS trigger timing is approximate), showing daily spend, monthly total and daily average, without member breakdown.

## Verified recent user-facing behavior and data maintenance

- Natural-language group expense messages are parsed locally when possible, Gemini as fallback. Confirmation was updated to include **total family expense for today** after the transaction, across members, excluding deleted and income rows. Check the current implementation and deployed workflow before promising exact runtime behavior.
- `Vay mượn` is a category. Interest, loan repayment and borrowing-related phrases are routed there by local parser; Gemini category choices include it. These were updated in `FamilyConfig.gs` and `FamilyLedger.gs` on this branch.
- The user confirmed that **two historical transactions** were reclassified from `Khác` to `Vay mượn` in the existing Sheets: **3,550,000 VND** (`3550k lãi vay NOXH`) and **2,400,000 VND** (Nam Á card interest), total **5,950,000 VND**. This was a **category-only** change, not a new expense or an amount adjustment. User confirmation is the evidence; assistant cannot directly execute GAS from the GitHub connector.
- One-time migration function `migrateTwoInterestPayments()` exists in `FamilyLedger.gs`. It matches each known expense by amount and description, checks uniqueness, and skips already-reclassified rows. **Do not rerun migrations as part of normal deployment**.
- New group-binding issue observed: earlier configured `FAMILY_GROUP_ID=-5534672148`, later webhook log showed `chat_id=-1003940444420`. The user was instructed to update `FAMILY_GROUP_ID` in the new GAS Script Properties. **The actual current Script Property value has not been independently read here**; do not assume either ID is still current. The ledger and reports must preserve historical rows across group-ID changes.
- The new webhook logs metadata to `WebhookLogs` via `showRecentWebhookLogs()` and keeps transaction diagnostics. Avoid storing sensitive message text or secrets in diagnostic logs.
- Receipt scanning exists in the active webhook source: photo/document scan → temporary draft → owner confirmation/edit/cancel → one ledger write. Read receipt-specific notes below; do not claim every live path is tested without evidence.
- Old polling trigger removal, new webhook activation, and user confirmation of transaction-category migration supersede the earlier migration TODOs below.

## Rules for another AI / maintainer

1. **Start with this file and the actual source on the isolated branch.** Do not infer active behavior from the `main` README or root `*.gs` files.
2. For active bot changes, edit `experiments/gas-webhook/` on `experiment/gas-webhook-isolated`; inspect its tests and deploy workflow. Do not alter legacy GAS or Homepage endpoints without a separate explicit request.
3. Prefer free, stable, simple Google Apps Script + Telegram + Sheets. Parser local first, Gemini fallback; do not add paid infrastructure or unnecessary external dependencies.
4. Preserve data and audit history: no blanket resets, no double writes, no deleting old-group transactions. Protect Telegram webhook secret, tokens, spreadsheet IDs, and other credentials.
5. Distinguish **committed**, **deployed**, **executed**, and **verified**. GitHub push and clasp deploy do not run a named GAS function; never claim Sheets were modified unless execution/user confirmation supports it.
6. The user primarily works from mobile/iPad and prefers direct GitHub changes by the assistant, with only unavoidable GAS actions delegated to the user.
7. Update this handoff and the `main` README pointer whenever the active branch/architecture changes. Do not merge webhook code into `main` just to make documentation easier to find.

---

# POORMAN TELEBOT — CONTEXT / HANDOFF (2026-10-08)

## Active configuration verified — 2026-10-11 (read this first)

- User explicitly confirmed @PoormanTest0219_bot is the active group bot. Use this branch’s experiments/gas-webhook source and GAS 1giuG5A8SrOsSwhcDC9Q_UTFxQGAr_TA73ukR8Tvq4cvOvYMuAv4wJUAO for bot changes. Root/main GAS uses retired @Botnhangheo_bot; do not bootstrap it.
- Live new-bot health: active YES, group member administrator, receives group photos, Gemini key present, report trigger count 1, webhook URL matches, pending 0, allowed_updates message + callback_query.
- Receipt scan deployed and installed with a query secret held only in GAS/Telegram. Keep HtmlService doPost response and secret validation; use getWebAppUrl() whenever setting webhook. Never log the webhook’s query key.
- Send photo/document to scan, or Reply an own photo with /scan@PoormanTest0219_bot. Gemini creates a temporary VND expense draft; only its owner can confirm, cancel or edit. No ledger write before confirmation. No real bill has been scanned/confirmed by the assistant; mocked flow and runtime wiring are verified.
- Old polling mistakenly revived during diagnosis has been stopped; verified old pollTriggers=0. Old GAS still provides Homepage’s signed Gemini chat bridge and expenses stats; preserve those HTTP actions.
- The sections below are historical migration notes. Current main deploy only runs via manual dispatch or [deploy-gemini] marker and never bootstraps polling automatically.

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

## Cutover update — 2026-10-09

- User confirmed NEW bot added to family group and private-chat /ping and /start work.
- New GAS readiness check confirmed test token, existing spreadsheet access (Transactions, 11 rows at check), Gemini key, group ID, matching webhook URL, zero pending, no last error. User reports daily trigger installation complete (re-check reportTriggers=1 before activation).
- **Old main workflow changed** in commit `5d5419399fa5b90ebd418859532b61d1660d9952`: no automatic deployment on push, no bootstrap that re-creates polling; manual workflow remains available. This does NOT delete the existing GAS polling trigger.
- **NEXT USER ACTION:** In OLD production GAS editor (script ID `1sYaIFrLfzoj18ZbcXDwAEjuXBi-Y7iNPLZX2MqeFP2PV8I2SfFfLLFxt`), open Triggers and delete ONLY trigger handler `pollFamilyTelegram_`. Confirm removal. Then in NEW GAS run `inspectNewBotReadiness()` and `activateNewFamilyWebhook()`. Test one controlled expense in family group, verify single new Sheets row, test /today and soft delete. Do not delete existing data.
- Old daily report was invoked by old polling; after trigger removal, new daily trigger must be present and enabled to maintain 21h report.


## Receipt scan — 2026-10-11

The active user bot is @PoormanTest0219_bot on this branch and GAS, not the root/main polling bot @Botnhangheo_bot. Receipt scanning is now implemented here: photos and JPG/PNG/WebP documents, own-photo /scan reply, JSON VND total validation, temporary draft, owner-only confirm/cancel/edit, original Telegram message dedupe, and forum topic preservation. Atomic ledger append accepts a caller-owned lock to avoid a nested ScriptLock in receipt confirmation. Existing Sheets and daily-report flow remain in use.

Install receipt webhook after deploying via GET ?installReceipt=1. Installer requires this exact bot, active family webhook, bound group membership, and existing expected webhook; it generates a query secret in Script Properties, sets the same deployment URL plus the secret, retains pending updates and subscribes to message/callback_query. It never returns secrets or changes token, group, activation, or ledger. doPost validates the query secret before routing once installed; HtmlService acknowledgement remains unchanged. Diagnostic GET ?diagnostic=1 returns only health metadata. GEMINI_SHARED_MODEL defaults to gemini-3.5-flash-lite, 20 receipt calls/day, no automatic retries.

The previous assistant mistakenly installed receipt code and revived polling on root/main. Recovery code removes only the retired Botnhangheo_bot polling triggers when Telegram confirms that bot left the configured group; Homepage’s existing chat bridge remains on old GAS. Do not re-bootstrap the old bot.

