# Bank edit commits and read-only menus — deployed 24/10/2026

Owner reported v35 still slow and explicitly requested edits to record directly like Duyệt. This authorizes submitting a valid correction as approval; opening Edit is not approval.

- PR https://github.com/hunghvt-cyber/poorman-telebot/pull/12
- Merge f9152b6e8dc59088d173ad69bb3c1d1f377d893d
- Actions https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/40071866429
- Job 120806847875 completed success; logs verify 106 tests / 106 pass and successful fixed deployment update (version in Actions logs).

Amount/content replies and category/Thu-Chi selections immediately invoke the existing owner/group/expiry-validated atomic ledger commit when the resulting draft is complete. No additional Duyệt is required. Unchanged explicit field submissions also approve. Incomplete/invalid edits cannot write. Menus, input prompts, Back, Delete and Restore alone do not approve. Prompts state that submitting edits and records. Existing manual ledger reply correction remains available after confirmation; stale draft prompts/actions cannot modify an approved row. Ambiguous append failure still reconciles via durable event key on Duyệt.

Pure menu navigation no longer acquires ScriptLock, claims editing, computes a snapshot hash, saves callback history or rewrites event properties. It reads current authoritative state and validates owner/group/message/id/expiry/deleted/recorded/busy before batching ack/UI. New category buttons carry actual category values, avoiding index snapshots and reorder mistakes; old numeric buttons remain supported. Best-effort timing-only cache written after UI dispatch lasts up to one hour and is exposed by owner-only log details. No accounting state is cached. Normal learning remains seven days; draft approval/edit expiry remains 48h. No phone macro/private config/key/trigger/Sheet schema/new service change.

106 mocked/static tests pass, including real auto-commit integration with a mock ledger and no navigation property writes/locks. No real financial row or live callback was created in development. Actual user-visible latency for this version remains unverified: v35 batching was reported insufficient; do not imply the current version is proven instant or BotFather-equivalent. Source details: experiments/gas-webhook/BANK_EDIT_COMMIT_FAST_NAV.md.
