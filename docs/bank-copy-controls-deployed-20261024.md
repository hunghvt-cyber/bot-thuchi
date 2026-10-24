# Native bank copy controls deployed — 24/10/2026

Owner approved client-side command selection: “Đồng ý, triển khai vậy đi, làm sao thao tác nhanh mượt nhất có thể”. This supersedes the nested Edit menu for new messages. Prior server-side batching/read-only optimizations were reported insufficient.

- PR https://github.com/hunghvt-cyber/poorman-telebot/pull/14
- Merge fc4f538599c1f7cc70b376a34c5ecb6e9d60574e
- Actions https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/40079180710
- Job 120828953886 completed success; logs verify 120 tests / 120 pass and successful fixed deployment update. Deployment version is in Actions logs.

Four native copy_text buttons appear directly: Sửa tiền, Nội dung, Danh mục, Thu/Chi. Tapping copies a command with a bound #b<12-hex event id> locally, without a callback to GAS. Owner Pastes, adds a value, Sends. Only the submitted command invokes the backend. Drafts retain Duyệt/Delete; confirmed original messages and fresh receipts retain the four copy controls. /bankbuttons (configured owner/group only) refreshes the newest retained applicable original message and links to it for immediate testing, without creating/writing a financial record. Future notifications have new controls automatically; no MacroDroid, BotFather, key/property/setup/trigger changes.

Reserved bank commands are uniquely resolved and authenticated before ordinary ledger parsing. Valid draft commands preserve edit-to-commit and 48h expiry. Recorded commands update the same owner/group active row under ScriptLock and append existing audit, with duplicate/reorder guards and exact VND/category/type/formula validation. No transaction append occurs for recorded edits. Bank references expire with seven-day logs; normal permanent-ID commands remain unchanged for longer-term edits. Input success receipts and original confirmation updates remain available. Existing receipt/manual intake, schema, Homepage and old polling remain untouched.

120 mocked/static cases pass, including all four commands, no-Reply draft commit, one-row recorded corrections/audit, missing/invalid values, owner/group/secret/expiry restrictions, duplicate/reordered requests, unknown/ambiguous refs and refresh without property/ledger writes. Assistant created no live callback, financial row or Telegram message. Successful deployment does not establish live phone rendering/clipboard behavior; owner should run /bankbuttons then try the native copy workflow. Applying the sent command still incurs GAS/Sheets latency; only edit-action selection no longer requires a backend round trip.

Details: experiments/gas-webhook/BANK_COPY_COMMANDS.md and latest PROJECT_CONTEXT.md.
