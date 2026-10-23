# Bank learning log — 23/10/2026

Owner extended the comparison log to **seven days** on 24/10/2026 (supersedes the original 48-hour log window) to improve extraction prompts after reviewing real drafts. This does not train Gemini automatically or change approval behavior.

## Storage and lifecycle

Learning notes are embedded in existing BANK_EVT_ Script Properties. New notifications capture an immutable compact extraction baseline (local/Gemini/review/ignored), initial amount/direction/category/description, status/reason and description digest. Existing original notification excerpt remains capped at 1200 characters. No extra spreadsheet, external service, token, phone config, trigger or automatic Telegram report.

Authorized draft edits append timestamped field changes (from/to); delete and restore record actions with no inferred reason. Menus, repeated updates and unchanged values do not manufacture corrections. Approval freezes the final accepted snapshot and approval time once, after the row is verified; failures append sanitized stage/kind/HTTP information, never API response bodies or secrets. Existing post-approval manual ledger edits continue using the existing AuditLog, outside this temporary draft-learning record.

The learning window is seven rolling days from original capture, never extended by editing, approval or report reads. The existing event original excerpt and learning notes remain for this window. Draft approval/edit expiry stays at 48 hours, and temporary Telegram/prompt mappings are still cleaned at their own expiry. Existing intake/hourly cleanup deletes BANK_EVT_ only at the separate seven-day log deadline; /banklog excludes logs past that deadline even before physical cleanup. Already retained pre-upgrade events gain the same seven-day window derived from capture (server creation time for legacy records); deleted data cannot be recovered. Untouched active drafts are unreviewed, and days 3–7 are explicitly expired-unreviewed, never inferred model mistakes. No permanent per-event history or model accuracy metric is retained. Delete does not prove extraction was wrong (could be internal transfer or manual duplicate). Approval is acceptance of the final fields, not proof the initial model output was correct.

History keeps at most eight latest edits and four sanitized errors; byte-budget trimming may keep fewer. Initial and final snapshots remain, with descriptions clipped to 80 characters and hashes detecting changes beyond that prefix. Other long fields retain existing application limits. Records report dropped edit count. Legacy drafts cannot recover overwritten original extraction: initial=null/legacy=true rather than fabricating a baseline.

## Review

In the configured group, only the configured BANK_RELAY_OWNER_ID may request:

- `/banklog`: up to eight newest retained events with counts and outcome labels.
- `/banklog 2`: another page (eight per page).
- `/banklog <12-character id>`: extraction baseline, current fields, correction trail, sanitized errors and original excerpt (up to 900 characters in the report).

Webhook secret validation precedes this handler. Reports route before normal ledger parsing/diagnostic Sheets access. No report is sent unless requested. Like any manually requested Telegram message, the resulting report can remain in group chat after GAS state expires; the GAS seven-day deletion cannot delete that copied text. Assistant cannot read runtime Script Properties via GitHub; user can request/share a report for analysis. No live request or real ledger transaction was generated during development. Log storage remains bounded by the existing Script Properties capacity guard; it fails explicitly rather than evicting recent records.

## Validation

88 Node mock/static tests pass (72 pre-logging + 12 logging + four separate-retention cases): immutable baseline and edits, Gemini/review/ignored distinction, final approval with ambiguous append recovery, abandoned vs deleted, idempotent/unauthorized changes, legacy drafts, bounded UTF-8 record size, sanitized errors/not-modified handling, owner/group/webhook-secret report access without ledger routing, expiry/cleanup, pagination and callback errors. Deployment and live behavior must be verified separately.
