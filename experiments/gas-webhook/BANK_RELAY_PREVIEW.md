# MacroDroid → GAS → Telegram: editable preview (23/10/2026)

Status at deployment preparation 23/10/2026: owner APPROVED deploying PREVIEW. Mocked tests passed; workflow deployment and private configuration still require verification. NOT enabled, NOT sent to a real Telegram group, NO Sheets writes. Source branch experiment/macrodroid-preview-20261023 derives from experiment/gas-webhook-isolated. Owner approval has now been received; merge into the active branch as one reviewed change, then verify workflow success.

## User goal and scope

Use existing @PoormanTest0219_bot and GAS deployment, no new bot/server/NAS. MacroDroid keeps raw log locally and posts only BIDV/VIB/BHX. Every candidate transaction has a Telegram draft with the original notification excerpt and parsed fields. Owner can Reply edit money/content/category/type or delete/restore the draft. PREVIEW only: no ledger rows, reports or Homepage changes.

Current production getWebhookInfo/group/revision have not been read directly here. One-time readiness verification must precede enabling. Root main is legacy bot/active Homepage bridge; do not deploy this bank code there.

## Changes

- BankNotifications.gs: pure parser for VIB account + credit, BIDV card + signed multiline current-account notifications (optional final balance/code), BHX package com.bachhoaxanh. Strict date/calendar/VND validation. Money comes from transaction labels, not balance/limit.
- BankRelay.gs: separate authenticated /exec/macrodroid route, fixed PREVIEW gate, atomic claim/dedupe, 48-hour draft state, Telegram replies/editMessageText. No SpreadsheetApp/Gemini calls.
- Code.gs: branch MacroDroid route before Telegram authentication/history. Preserve Telegram key validation. Intercept bank draft replies before normal ledger routing; even expired draft replies cannot accidentally append a transaction. Existing Telegram receipt code otherwise unchanged.
- .claspignore explicitly includes both new GAS modules.
- tests/bank-relay.test.js covers security, parser, transport, state, duplicate/timeout/expiry, owner edits, routing; receipt tests retained.

Proof from actual uploaded logs: 23 RAW events now yield 8 recognized / 15 ignored with this parser; recognized outflow=720129 VND. Earlier review missed two BIDV account fee variants containing Số dư cuối/Mã giao dịch. No raw personal log is committed. BHX package and its 163928 invoice are now evidenced by device log. This is parser replay, not evidence Telegram has run.

## Wire protocol

Content-Type text/plain; charset=utf-8, six header lines followed by remaining raw body:

1. BANK-NOTIFY-1
2. separate intake key (64 hex in delivered macro)
3. device alias (letters/digits/_/-)
4. captured epoch milliseconds (13 digits)
5. Android package
6. title (one line)
7+. notification text; macro uses big when text empty.

This avoids unsafe JSON string interpolation of quotes/backslashes/newlines. Title must remain one line; multiline titles/unknown formats need a later protocol version. Server bounds input length to18000 characters. Auth key never in URL, log or Telegram. Body is HTTPS; keep key out of exported/shared configured macros and Git. Rotate BANK_RELAY_KEY + phone variable together to revoke.

Macro sends one request per notification. No durable phone queue or programmed retry yet. Lost connection must be reviewed via local raw log; do not claim offline reliability. Server event identity hashes device + original captured_at + package + title + full body. A retry must reuse the ENTIRE envelope, especially captured_at. Re-running Test Actions regenerates receipt time and is a new event; it is not a valid retry.

No amount-only dedupe; two receipt times/full contents remain separate. Cross-app transaction matching is NOT implemented and unnecessary to PREVIEW writes; must be solved before automatic ledger intake. Exact same millisecond/device/content is treated as replay; two physical identical events in that millisecond cannot be distinguished by this v1 protocol.

## Telegram behavior

Recognized messages show source, Thu/Chi, VND amount, description (fallback Thu/Chi), category, masked account suffix, transaction time when available, reference, original title/body excerpt<=1200 characters and draft ID. Raw full original remains on phone.

Known advertisements/statements/card activation are ignored. Unknown transaction-shaped messages get a review draft with unknown amount/direction instead of disappearing. No blind total extraction. Ads with transaction-looking titles may still appear as review; no amount is auto-recorded.

Only configured BANK_RELAY_OWNER_ID may edit. Other group members/admins cannot edit this owner's draft. Commands via Reply to ORIGINAL draft:

- sửa tiền 50k (bare integer5500 means exactly5500 VND)
- sửa nội dung ...
- sửa danh mục <existing FAMILY_CATEGORIES value>
- sửa loại thu / sửa loại chi
- xóa / khôi phục

These mutate temporary draft state and edit the original Telegram message, not Sheets. No confirm-to-ledger button/function exists in this version. Existing manual Telegram ledger transactions continue using their own edit handlers. No bot-sent message is forged into a Telegram user update.

Drafts/duplicate markers expire48h relative to captured time. Cleanup runs on intake plus optional hourly cleanupBankRelayState trigger; physical removal may lag until next hourly tick, editing rejects at expiry. Expired message text remains in Telegram until user deletes it; server no longer edits it. Errors/replies to expired drafts are consumed by draft route, not ledger.

Pending claim is stored under ScriptLock before send, lock released during Telegram I/O. Concurrent same-event requests return pending. Success returns sent/duplicate_sent. Timeout/uncertain result is not auto-resent because Telegram sendMessage has no idempotency key. Quota errors after an uncertain send may require operator checking; never promise exactly-once delivery.

State capacity is bounded; expired bank keys removed, fresh markers not evicted just to fit more events. At capacity, request returns bank_capacity. Do not log Script Properties values.

## Deployment checklist — owner approved 23/10/2026

1. Review this branch's diff and tests, then integrate to active experiment/gas-webhook-isolated under an approved deployment window. Its push workflow updates the currently used GAS. Do not dispatch existing workflow while changes exist only on this preview branch: it hardcodes the active source ref.
2. Verify workflow success. This updates code only, not config, setup functions or data.
3. In the NEW active GAS project, run prepareBankRelayPreview once. It generates intake key privately if missing and defaults disabled. It returns no secret. Do not run legacy setupFamilyBot/setWebhook or change bot/group.
4. Script Properties: BANK_RELAY_OWNER_ID = actual numeric User ID from /whoami (not group ID); BANK_RELAY_MODE=PREVIEW; existing FAMILY_GROUP_ID must be verified; BANK_RELAY_KEY generated above must be copied directly from Script Properties to phone local variable bank_key, not chat/Git.
5. Existing RECEIPT_WEBHOOK_SECRET must be present. Run inspectBankRelayReadiness; require ok=true, correct username, matching webhook and bot membership. It stores BANK_RELAY_VERIFIED=YES only on checks passing. It does not enable intake, change webhook or token.
6. Run installBankRelayCleanup (idempotent, creates only an hourly cleanupBankRelayState trigger). Set BANK_RELAY_ENABLED=YES last.
7. On phone configure bank_endpoint = current GAS base /exec/macrodroid (NO Telegram query secret), bank_key=the separate64hex intake key, then bank_ready=YES. Do not compare a secret with an MD CompareValue constraint: verbose logging may expose operands. GAS validates actual key; phone gate only checks readiness. Import/check HTTP action first. Default macro is disabled and has no real key/URL.
8. Test one new notification, verify raw log + server status sent + Telegram draft; Reply edit as owner, try another actor, repeat exact HTTP envelope to verify dedupe; inspect no Sheets row/history change from bank route.
9. To stop: BANK_RELAY_ENABLED=NO + disable phone macro. Existing draft replies remain preview-only until expiry. Never enable WRITE mode: it is rejected in this version.

GitHub connector can prepare/commit code and inspect workflows but cannot read/change GAS Script Properties or execute editor functions with the tools available in this session. These unavoidable one-time GAS config/setup steps need the owner or a separately verified execution mechanism. Never invent a deployed/configured state.

## Tests and limitations

Run node --test tests/*.test.js in experiments/gas-webhook. Here:26 new bank tests +10 existing receipt tests passed. All Telegram/Properties/Locks are mocks; SpreadsheetApp/ledger spies throw if bank intake or draft reply routes touch them. For macro,6 dry-run checks passed (no real HTTP). Total42 mock/static checks, not end-to-end acceptance.

HTTP schema is based on reverse-engineered MacroDroid5.38.16 HttpRequestAction/HttpRequestConfig and prior MD6 templates; actual HTTP import/redirect/response handling must be verified on S25 Ultra. Phone local-variable concurrency with two HTTP invocations close together is not verified; no trigger throttling is added because that would lose transactions. Backend lock testing covers re-entrant/interleaved mocked requests, not actual GAS concurrency load.

Bank displayed times are preserved and interpreted in Asia/Ho_Chi_Minh; BIDV notifications arriving~7h later do not prove whether that is delivery delay or bank timezone formatting. Do not silently add/subtract7h. BHX has receipt time only, not proven payment timestamp. Category Grab remains Khác until a more specific service/category is known; users can edit.

State editing is serialized with a per-draft editing flag; a killed GAS execution mid-edit can require operator recovery of that flag. This is a preview limitation to solve before ledger rollout. Draft owner assignment is explicit config, never a synthetic Telegram sender.

Future actual-ledger phase needs explicit approval: stable persistent phone event queue/retry, cross-app dedupe, ledger owner/date/source metadata, and mapping BotMessageId/TransactionId to existing edit/delete paths. Do not equate editable draft to an editable saved transaction.

