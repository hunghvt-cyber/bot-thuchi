# Compact bank drafts and edit feedback —23/10/2026

User confirms valid-key phone notification reached family Telegram group on v27.
Example original VIB+2000 notification produced a draft later showing Thu3000 after command Sửa tiền3k,
but bot also emitted a generic display-update warning. This supports that draft value changed; exact prior
Telegram error cannot be recovered because old code did not record it. Do not assert a proven not-modified root cause.

Change:
- New marker 🧪 Nháp ngân hàng; legacy 🧪 BANK_DRAFT_V1 replies remain accepted within original48h TTL.
- Main summary formats one clear amount with dot thousands separators, direction, source and category.
- No original amount/balance/account/time/reference/draftID/instruction wall in Telegram display.
- Non-generic description shown up to100 characters. Original raw notification remains in MD log and existing
  temporary server state; no extra Sheet, no ledger write or retention extension.
- Owner Reply corrections send a short confirmation containing the current amount/category.
- Skip editMessageText when reply snapshot already equals desired text; handle explicit Telegram
  message-is-not-modified error as success. Real API/network failures keep saved amount visible in a concise
  warning, do not claim original message display was updated.
- Safe error class/HTTP code kept only inside the existing expiring event state. Never expose raw API payload/token.
- Money corrections accept exact bare VND, 3.000/3,000/3000đ and shorthand3k; ambiguous extra text rejected.
- No macro/key/property/setup changes needed.

Validation:43 mocked tests pass (33bank+10existingreceipt), including legacy capitalized reply,
compact output, grouped amounts, repeated same display, not-modified handling, genuine429 error, ownership,
idempotency and zero bank Sheets access. Exact runtime edit failure remains unverified until user retries.
Please Reply the ORIGINAL existing draft with Sửa tiền4k after deployment and verify displayed4.000đ
plus a confirmation. No need for a new bank transfer.
