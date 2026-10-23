# Bank learning logs deployed — 23/10/2026

Owner requested “Ok, thiết lập log” after agreeing to compare initial extraction, corrections and approval while keeping temporary data for 48h. Unattended drafts must not be treated as model mistakes.

- PR https://github.com/hunghvt-cyber/poorman-telebot/pull/9 merged as d956493cf038f73a5f05299eb22f97eff985fc2b.
- Actions https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/39952797235, job 120411149991: success. Logs confirm **84 tests, 84 pass**, and existing fixed deployment redeployed as **version 33**.
- Active source remains experiments/gas-webhook/ on experiment/gas-webhook-isolated. No changes to retired polling, Homepage, phone macro, private properties, triggers, existing Sheets schema or owner approval policy.

New intake events include a compact immutable initial extraction (local/Gemini/review/ignored), ordered bounded owner corrections, approved final snapshot/time and sanitized failures. Existing event original text remains available. Learning data is embedded in existing temporary event properties, expires at the original capture+48h and is removed by existing cleanup; edits/approval do not extend expiry. No per-event log is copied into a Sheet or permanent console log. Legacy baseline is explicitly unknown; past overwritten values cannot be reconstructed. Old ignored/legacy events may lack learning notes.

No automatic extra Telegram message. Only configured owner in configured group can request /banklog (summary/page 1), /banklog 2 (page 2), /banklog <id> (detail). Commands validate webhook secret before handling and bypass ledger parsing. Reads omit expired events; manually requested report messages may remain in Telegram after server expiry. No automatic Gemini training is introduced. Deletion is only an action, not a rejection reason; pending/unreviewed does not imply model error.

History caps at eight changes/four errors and may trim further to fit the existing property limit; descriptions are clipped with hashes detecting tail changes. Initial and final approval comparison remains; dropped history count is visible. Post-approval manual ledger corrections still use the existing permanent ledger AuditLog, outside this temporary learning trail.

84 tests are mocked/static. The assistant did not trigger a live report, create/approve any real transaction, or read runtime financial state. Runtime user verification remains separate from successful deployment. Future AI can ask owner to share /banklog output within 48h when investigating extraction quality; GitHub access alone cannot read GAS Script Properties.

Detailed implementation/limits: experiments/gas-webhook/BANK_LEARNING_LOG.md.
