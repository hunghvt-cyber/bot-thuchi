# Bank Gemini fallback and category picker —23/10/2026

Requested after first live phone relay acceptance: support phone-selected additional banks without requiring a hand-coded sample for each; unknown purpose defaults Không rõ mục đích / Khác; choose existing categories with buttons.

Implementation:
- BankAssist.gs calls existing sharedGemini_ / sharedGeminiQuota_ only for unknown package or transaction-like format not handled locally. Recognized local formats remain fast and avoid API use.
- Intake accepts syntactically valid Android packages from the authenticated phone's selected apps, no longer just three hard-coded packages. Authentication, input bounds, TTL and PREVIEW gate remain mandatory. It does not auto-select apps on phone or authenticate a bank identity.
- Exact-event claim/dedupe happens BEFORE Gemini. Duplicate/in-flight events do not consume additional AI calls; all ignored results also expire48h.
- Reuse existing Gemini API key and GEMINI_SHARED_MODEL; no model/key/property reconfiguration. BANK_RELAY_GEMINI=NO disables fallback if needed; default enabled.
- Separate BANK quota50 requests/day, no retries or extra paid fallback. Existing receipt quota remains separate. This ceiling does not establish the Google account's billing tier.
- Validate integer VND amount against exact numeric token and context found in original title/body; reject balance/limit/debt/minimum-payment context and missing direction evidence. AI can still be wrong: this remains editable PREVIEW, never a ledger write.
- AI outage/invalid JSON/quota/ambiguous extraction yields review draft with no guessed amount.
- Known nontransaction ads/statements stay ignored; additional app nontransactions classified by AI are ignored.
- Missing purpose always Không rõ mục đích and Khác, even when AI offers a more specific category.
- Current fourteen categories from actual FamilyConfig.gs: Ăn uống, Đi chợ, Gia đình, Con cái, Đi lại, Hóa đơn, Mua sắm, Sức khỏe, Giáo dục, Giải trí, Nhà cửa, Vay mượn, Thu nhập, Khác.
- New drafts include Đổi danh mục button. Opens two-column single-choice picker, current category has✓; chọn updates original draft. Close collapses picker. Selection is one category per transaction, not multiple checkboxes.
- Callbacks are authenticated by existing Telegram query secret and additionally bound to draft owner, chat, message, event token and expiry; serialized and idempotent. Never routed to ledger or receipt callbacks.
- Menu snapshots category choices into existing48h state; stale/unknown category rejected. Already deleted drafts require restore.
- Existing text corrections retained; invalid/help response lists ALL current categories. Old drafts accept text edits; a successful edit adds new collapsed button.
- Existing phone macro/key/properties remain valid; preserve user's added apps. Do not reimport old three-app preset over their custom selection.

Validation:51 mocked tests pass, covering prior43 plus AI evidence/defaults/quota failure/dedupe-before-AI and14-category picker/owner/expiry/callback routing. No live Gemini bank extraction or real Telegram button click executed by assistant.
Runtime: next new-bank notification should display one amount or explicit unknown amount and Đổi danh mục. User should press picker and verify category change. Existing no-purpose previews may retain old wording until new notification/edit.

Limitations: bank notification contents are sent to existing Gemini service as requested; key stays server-side.
Macro HTTP25-second timeout may expire before slow Gemini completes; check actual Telegram and original phone logs rather than blindly resending with new IDs.
Cross-app matching of the same purchase, internal-transfer accounting and reliable offline phone queue remain future real-ledger work.
No new server/NAS/bot, no Sheets changes, no enabling real recording.
