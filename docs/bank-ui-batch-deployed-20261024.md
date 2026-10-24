# Bank UI batching deployed — 24/10/2026

Owner authorized trying the faster existing button flow (“Ok, thử xem sao, bạn làm đi”).

- PR https://github.com/hunghvt-cyber/poorman-telebot/pull/11
- Merge 03208b5f2131bd6208eb453844aeae91ae2e399e
- Actions https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/40058194751
- Job 120765752069 completed success; logs confirm 97 tests / 97 pass. Fixed deployment updated successfully (version in Actions log).

After existing authorization/state claim, non-approval bank buttons dispatch answerCallbackQuery and their independent menu edit or ForceReply prompt together in one fetchAll, using one token read and no serial fallback. UI response errors are handled independently of acknowledgement errors. Ambiguous batches are never automatically retried, avoiding duplicate prompts. Duyệt keeps the existing early acknowledgement and atomic ledger path; no write is batched. Existing manual/receipt Telegram helpers are unchanged. No phone import/config/key/setup/trigger change is required; the update applies to existing unexpired bank draft callbacks.

last_ui_timing stores the most recent in-handler preparation, Telegram and handler times with the seven-day event and appears in owner-only /banklog detail. This excludes delivery/cold start before handler entry, final state write and phone rendering; it does not prove end-to-end improvement. Existing weekly learning retention and 48-hour approval deadline remain intact.

97 mocked/static tests pass. No live Telegram callback/message or real financial row was created in development. Deployed code is verified, actual user-visible speed is not yet measured and must not be claimed as BotFather-equivalent or assigned a millisecond target. Source detail: experiments/gas-webhook/BANK_UI_BATCH.md.
