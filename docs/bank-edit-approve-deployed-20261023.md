# Bank Edit / Duyệt deployed — 23/10/2026

Owner explicitly selected **Ghi vào Sheets** for Duyệt in the current session. This authorizes deployment of owner-confirmed per-draft ledger writes, superseding the earlier preview-only restriction for this action. Receiving/recognizing/editing notifications still creates drafts only.

- PR: https://github.com/hunghvt-cyber/poorman-telebot/pull/8
- Merge: 51e1ec7ef10c21e2048ea483c9797a2ff13ffb39
- Workflow: https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/39945188809
- Job 120386009151 completed success; logs show 72 tests / 72 pass and existing deployment redeployed as **version 32**.
- Same active isolated GAS project/deployment, same bot and existing Transactions schema. No key/config/macro/trigger change, no migration or old polling activation.

New drafts show Edit / Duyệt; Edit expands four correction actions plus Back/Delete. Only the bound owner can approve an unexpired, nondeleted draft after valid amount/direction/category. Duyệt writes once under shared ScriptLock and permanent bank:event-digest DedupeKey. Original parsed transaction time is preserved, otherwise capture time is used. Edited confirmation has the transaction ID; the existing ledger reply/edit/delete route remains available. Stale draft buttons/input prompts cannot change an approved ledger row. Ambiguous append retries look up the durable key. Temporary event/raw state still expires after 48 hours; permanent ledger rows retain only source label in RawText, plus normal transaction fields and dedupe metadata.

Assistant development used mock/static tests and did not approve or create any live ledger transaction. Deployment is verified; real approval/Sheets row/UI verification remains for user action. Do not mark live write tested until evidence arrives. Do not ask for reapproval for this already authorized feature.

Limits: dedupe is per original stable event, not matching manually entered transactions or two apps reporting the same payment. Tell the owner not to approve drafts already entered by hand. Internal transfers need human judgment. No automatic approval or bank offline queue added. See experiments/gas-webhook/BANK_APPROVAL.md for implementation and coverage.
