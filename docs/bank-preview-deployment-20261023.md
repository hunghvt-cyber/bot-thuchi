# Bank PREVIEW deployed — 23/10/2026

Owner approved deployment in the bank notification conversation.
PR https://github.com/hunghvt-cyber/poorman-telebot/pull/2 merged into experiment/gas-webhook-isolated.
Deployment source commit: 87d87e2b5c8738724e5e1dba77b262325266d60c.
Workflow https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/39906724090 succeeded.
CI:36/36 tests passed, clasp pushed16 files including BankNotifications.gs and BankRelay.gs.
Existing deployment updated to version26. No webhook replacement, polling setup, ledger migration or bank Sheets writes were executed.

## Actual remaining state
Private Script Properties have not been read/modified by the assistant.
No setup function has been run by GitHub Actions.
Real phone → GAS → Telegram delivery and editable draft acceptance remain pending.
Direct unauthenticated probe from the assistant environment returned401, not a verified JSON relay response.
This does not prove whether access is blocked by the environment, deployment access policy or Google.
Do not mark end-to-end working from CI success.
New bank route is gated by BANK_RELAY_ENABLED=YES, MODE=PREVIEW and readiness.
Configured values must be verified in GAS. Existing manual bot flow remains as deployed.

## One-time setup, no code pasting
Open existing active GAS:
https://script.google.com/home/projects/1giuG5A8SrOsSwhcDC9Q_UTFxQGAr_TA73ukR8Tvq4cvOvYMuAv4wJUAO/edit

1. Select BankRelay.gs; run prepareBankRelayPreview. It generates BANK_RELAY_KEY if missing; no secret printed.
2. In Telegram family group send /whoami to existing bot and take your User ID, not chat/group ID.
3. GAS Project Settings → Script properties → Edit script properties:
   BANK_RELAY_OWNER_ID=<your numeric User ID>
   BANK_RELAY_MODE=PREVIEW
   Keep BANK_RELAY_ENABLED=NO during readiness checks.
   Preserve existing TEST_BOT_TOKEN/FAMILY_GROUP_ID/RECEIPT_WEBHOOK_SECRET and other properties.
4. Run inspectBankRelayReadiness. It returns a safe result but the editor may not automatically print returned objects.
   Check BANK_RELAY_VERIFIED=YES afterward. If NO or execution error, stop and report the error without secret values.
   Never set VERIFIED=YES manually to bypass verification.
5. Run installBankRelayCleanup once; adds hourly cleanup of expired state, idempotent.
6. Set BANK_RELAY_ENABLED=YES.
7. MacroDroid existing Bank Notify - Telegram Preview v1 → Local Variables:
   bank_endpoint=https://script.google.com/macros/s/AKfycby9V-wbbucC9zTBRfMdCM5Tf8qsJRlMVeQtOfyKmrtuOVmLs1USBcTTMbe4J2ExhpQn/exec/macrodroid
   bank_key=copy BANK_RELAY_KEY privately from GAS, never send it in chat/export/Git.
   bank_ready=YES last.
   No Telegram query key or bot token in MD.
8. Test with one NEW notification. Require status sent and a Telegram BANK_DRAFT_V1 message, not merely HTTP200.
   Reply to original draft with sửa nội dung ...; verify only draft changes, no new bank Sheets row.
   Unknown/parser/auth/transport errors should be diagnosed before enabling real writes.
   Keep only one phone HTTP sender. BuzzKill plugin experiment remains unverified; use proven direct Notification Received.

## Scope and rollback
PREVIEW only: owner edits/deletes/restores temporary Telegram drafts, no ledger/totals/Homepage changes.
Event/draft expiry48h; hourly cleanup can physically remove slightly later; Telegram message itself remains.
Phone does not yet have durable offline queue/retry. Uncertain sends need reconciliation, no blind resend.
Cross-app dedupe before real-ledger rollout is still required.
Stop bank intake by BANK_RELAY_ENABLED=NO and disabling phone sender; no need to pause the whole bot.
Do not run setupFamilyBot, reset tests, migrations, setWebhook or deleteWebhook for this setup.

See experiments/gas-webhook/BANK_RELAY_PREVIEW.md for design, supported formats and limitations.
