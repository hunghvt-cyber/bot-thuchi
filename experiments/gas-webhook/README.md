# Poorman Telebot — active group webhook

Active bot: **@PoormanTest0219_bot**. This folder on `experiment/gas-webhook-isolated` is its source; root/main GAS belongs to the retired polling bot. Read the latest verification at the top of [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

Scan a bill by sending its photo, or Reply your photo with `/scan@PoormanTest0219_bot`. Check the temporary draft before pressing **Ghi chi tiêu**. Reply the draft with `sửa tiền 85k` to correct the total.


**Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first.** This folder is the candidate replacement for the old polling GAS. It uses a different Telegram bot and GAS deployment but the **same existing family Google Sheets**. Old polling is NOT disabled by code deployment.

## Deploy (safe by default)

1. Run [Deploy isolated GAS webhook test](https://github.com/hunghvt-cyber/poorman-telebot/actions/workflows/deploy-gas-webhook-test.yml). It deploys only this folder to the separate GAS project.
2. In NEW GAS Script Properties, configure:
   - `TEST_BOT_TOKEN`: new bot token (already present from webhook tests)
   - `GOOGLE_SPREADSHEET_ID`: **existing** family Sheet ID from old GAS properties
   - `GEMINI_API_KEY`: Gemini key from old GAS properties
   - `FAMILY_GROUP_ID`: existing family Telegram group ID
   - `GEMINI_MODEL`: optional
   - **Do not set** `ENABLE_FAMILY_WEBHOOK=YES` yet.
3. Authorize new GAS scopes for Sheets and triggers; run `inspectNewBotReadiness()` to check configuration, and `installWebhookDailyReportTrigger()` once.
4. In private chat with `@PoormanTest0219_bot`, send `/ping`. Expect `pong`. Expense messages are ignored until activation.

## Cutover (manual, requires coordinated steps)

1. Add new bot to family group; configure BotFather privacy mode appropriately; verify permissions.
2. Stop old GAS polling trigger `pollFamilyTelegram_` **and prevent old GitHub main workflow from re-running `setupFamilyBot()`**. Do not delete any spreadsheet or Telegram data.
3. Run `activateNewFamilyWebhook()` in NEW GAS editor. It refuses activation unless required Script Properties, Sheets access, webhook URL and report trigger are ready.
4. Send controlled test expenses and commands to new bot in family group; verify one row per expense in existing `Transactions` sheet, edits/deletes and callback confirmation. Check `inspectTestWebhook()` and `showLastWebhookDiagnostic()`.
5. Verify the daily report runs once around 21:00 Vietnam time. Time-based GAS triggers are not exact-time guarantees.

## Emergency rollback

- Run `pauseNewFamilyWebhook()` in new GAS; then restore exactly one old polling trigger (and only if old deployment is still valid). Avoid two active writers.
- Do not use `drop_pending_updates:true` on the family production bot.

## Caveats

- New GAS webhook uses `HtmlService` to avoid the earlier Telegram 302.
- Ledger dedupe is atomic using ScriptLock, but webhook error responses may be acknowledged despite business failure; monitor diagnostics and reconcile errors manually.
- Full family workflow and shared-sheet write tests **remain pending** until the new GAS is deployed and configured.
- The GitHub `main` workflow automatically redeploys and reboots the OLD polling bot on push; do not casually merge this branch into main.

