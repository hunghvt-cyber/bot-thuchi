# Fresh bank edit acknowledgement deployed — 24/10/2026

User pasted a confirmed bank message showing Chi 312.000đ / VIB / Khác / #d0090412 with the same description they had submitted below a ForceReply prompt, but missed a new success notice. Current source edits the old confirmation only after bankCommit_ returns, explaining the visual order. Assistant did not independently inspect the live example row.

- PR https://github.com/hunghvt-cyber/poorman-telebot/pull/13
- Merge 4dddc5da0a80e0d47686065cb3ca8f02be847bdb
- Actions https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/40076889036
- Job 120822045710: completed success; logs confirm 111 tests / 111 pass and successful fixed deployment update. Exact version is in the Actions logs.

After an amount/content text edit commits or finds its verified durable row, send a fresh concise “✅ Đã ghi Sheets” receipt replying to the user input before refreshing the old confirmation. Bind the new receipt as BotMessageId, retaining the original TelegramMessageId for existing ledger reply editing. No extra transaction row or schema change. Button confirmations remain in place only. Ambiguous ledger failure never sends success and now reports under the input. Telegram rendering/receipt/binding failure cannot turn a verified ledger write into a misleading “not completed” message; errors remain in sanitized weekly learning notes and no ambiguous send is automatically retried.

111 mocked/static tests pass, including confirmation placement, row binding, success after flush/state verification, ambiguous write without false success, old-message failure without duplicate notice and receipt transport failure. Assistant generated no live financial transaction/callback/message and did not send a retrospective receipt for the example. Deployment is verified; live receipt delivery awaits user activity. No macro/key/config/setup/trigger change is required. Source detail: experiments/gas-webhook/BANK_EDIT_RECEIPT.md.
