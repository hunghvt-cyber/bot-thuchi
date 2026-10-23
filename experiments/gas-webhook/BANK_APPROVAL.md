# Bank draft Edit / Duyệt — 23/10/2026

## Authorization and behavior

The owner explicitly chose “Ghi vào Sheets” when asked what Duyệt should do. This supersedes the earlier preview-only bank restriction for this explicit button only. Receiving a notification, opening Edit, or editing a draft still never writes a ledger row.

- Home: Edit / Duyệt. Edit: amount, description, category, Thu/Chi, plus Back/Delete. Duyệt immediately commits, without another confirmation screen.
- Only configured owner/group, valid unexpired/nondeleted draft, positive integer VND <= 1e12, valid Thu/Chi and current category may commit. Unknown purpose is allowed as Không rõ mục đích / Khác.
- Uses existing Transactions columns and reports; no schema changes, no new Sheet, token, app or phone configuration.
- Timestamp is original parsed transaction time, otherwise phone capture time (legacy drafts fall back to server receipt time). Category/direction/amount/description are the latest edited draft values.
- Shared ScriptLock protects dedupe lookup plus append. Durable key bank:<full event digest> is stored in existing DedupeKey. Repeated clicks, concurrent approvals and retry after append/flush timeout cannot append the same event twice. Read only the dedupe column before loading a matched row.
- Confirmation is edited in place with empty keyboard and transaction ID. If Telegram edit fails, send a compact confirmation and bind its BotMessageId for existing ledger reply edits. Never claim an uncertain Sheets failure means no row: ask to click Duyệt again to reconcile the key.
- Already approved drafts cannot be modified by stale draft buttons or old ForceReply prompts. Existing ledger reply editing/deletion remains available on the approved confirmation. Existing manual and receipt writers are unchanged.
- Recover stale in-progress UI claims after two minutes; durable ledger key still prevents a repeated append. Existing no-timestamp claims require operator inspection.
- Temporary raw/event/prompt data still expires in 48h; real ledger records and dedupe metadata persist. Permanent RawText contains only source label, not full notification/balance. Text fields are escaped against formula execution.

## Limits and validation

Dedupe is per stable event envelope, not amount-only, cross-app matching or matching previously typed transactions. Do not approve a draft already entered manually. Two opposite notifications for an internal transfer require human judgment; the direction alone does not establish household income or expense. Identical bank transactions recaptured as separate events may remain separate drafts. No unattended auto-approval, offline queue or inferred merge is added.

72 Node mock/static tests pass, including wrong owner/group/secret, missing amount/direction, no intake write, exact VND/18 columns, timestamps, duplicate/concurrent click, ambiguous append/flush recovery, lost temporary confirmation flag, soft-deleted durable row, Telegram failure/fallback binding, stale prompt rejection, equal-amount distinct transactions and formula escaping. These tests do not prove a live Sheets mutation; no real transaction was written during development. Deployment evidence belongs in the root deployment handoff after Actions completes.
