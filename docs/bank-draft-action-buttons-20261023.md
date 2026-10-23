# Bank draft actions as buttons —23/10/2026

User asked when amount is unknown, and to replace command instructions with selectable actions.
No real ledger activation; existing MacroDroid/URL/key unchanged.

## UI
Base keyboard: Đổi danh mục, Thu / Chi, Sửa tiền, Sửa nội dung, Xóa nháp.
- Category menu retains all14 categories, one choice. Quay lại restores full action panel.
- Thu / Chi opens two choices, updates same draft.
- Sửa tiền / Sửa nội dung sends selective ForceReply to configured owner, with an inline mention.
  User answers with value only (50k, 50.000 or content); no command prefix.
  If client does not open reply automatically, Reply that specific prompt manually.
- Prompt mapping is tied to same bank event and expires at min(original draft expiry, now+5min).
- Replies to prompts are intercepted before ledger/history. Ownership, original group and state expiry remain enforced.
- Money/content prompt reply never starts a new ledger transaction. Do not interpret arbitrary unthreaded group text as an edit.
- Deleted draft shows Khôi phục nháp only; restores same state, no Sheets operation.
- Original bank draft retains48h expiry; opening prompts does not extend it.
- Original command parsing remains compatible, but bank draft text no longer advertises a command wall.
- Old category-only message: click Đổi danh mục then Quay lại to display new action panel without a new bank notification.
- A prompt can be cancelled by replying Hủy; prompt mapping is invalidated. Existing draft remains.

## Amount unknown
Status review can occur for missing/ambiguous amount or direction, unsupported/malformed values, evidence not matching original text,
balance/limit/debt mistaken as transaction, conflicting sign/direction, foreign/nonVND output,
Gemini invalid JSON/unavailable/incomplete/quotas. A recognizable purpose is NOT required:
known amount/direction + no purpose still shows amount with Không rõ mục đích / Khác.
No balance/limit fallback, no guessed amount. User can supply amount via button in PREVIEW.

## Validation
57 mocked tests pass: previous51 plus action panel, selective input prompt, bare amount reply routing without Sheets,
plain content including angle brackets, owner/5minexpiry/invalid/cancel, direction/delete/restore and failed-prompt lock release.
Current code uses official Telegram ForceReply/inline keyboard semantics:
https://core.telegram.org/bots/api#forcereply
No live button/prompt interaction performed by assistant; require user acceptance after deployment.
No migration, property update, phone reimport or secret rotation needed.
