# Weekly bank learning retention — 24/10/2026

Owner requested **one week** of logs for meaningful extraction review, superseding the original 48h log window. This change retains original notification excerpts and learning records for seven days from capture. Draft approval/edit expiry remains 48h; no late approval is enabled by longer retention. Owner can use /banklog and its existing pagination/details to read expired-unreviewed drafts within the week. Abandonment is not labeled a model error.

- PR https://github.com/hunghvt-cyber/poorman-telebot/pull/10
- Merge 7e671cfd00f67034d12153bad764e0d3a2bb9f9d
- Actions https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/39995686625
- Job 120558481111 completed success. Tests passed: 88 mock/static cases. Deployment version is recorded in Actions logs.

BANK_EVT_ cleanup and report reads use the separate capture+7d deadline; BANK_MSG_ and prompt mappings keep their existing expiry. Existing state still present at upgrade benefits immediately using captured_at or legacy created; purged data cannot be recovered. Edits, approval and reading logs do not reset the clock. Existing hourly/intake cleanup handles physical deletion; report access stops exactly at the retention deadline. Existing storage capacity guard, owner/group authorization, webhook authentication and durable ledger dedupe remain intact.

No change to phone macro, keys/properties, setup functions, triggers, Sheets schema, retired polling or Homepage. No real transaction/report was generated during development. Deployed-code verification does not prove runtime financial state or historical record availability. Source policy: experiments/gas-webhook/BANK_LEARNING_LOG.md and latest PROJECT_CONTEXT.md.
