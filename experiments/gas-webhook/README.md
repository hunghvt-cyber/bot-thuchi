# Isolated Telegram webhook hardening (TEST ONLY)

This branch deploys to a separate Apps Script project and uses only `TEST_BOT_TOKEN` in that project's Script Properties. Never copy production tokens or change the production polling workflow.

## Confirmed in manual tests (2026-10-08)

- Telegram -> Apps Script `doPost` -> Telegram `sendMessage` worked with `HtmlService.createHtmlOutput('OK')` and **string** `chat_id`.
- `ContentService` previously produced Telegram `302 Found` retry errors.
- The isolated bot successfully echoed `hello999`, `/start`, `/ping`, `/pong`.
- The numeric timing inside a reply measures GAS processing up to constructing the reply, **not** end-to-end Telegram latency.

## Changes requiring fresh validation

- Commands: `/start` -> help; `/ping` -> `pong`; other text -> echo.
- Deduplication: `LockService` serializes updates; last 100 **successfully processed** `update_id` values in `TEST_PROCESSED_UPDATE_IDS` Script Property. Does not assume update IDs arrive in order.
- Diagnostics: `TEST_LAST_DIAGNOSTIC` records `sent`, `ignored`, `duplicate`, `lock_busy`, or `error`. Never stores bot token.
- `runTestWebhookSelfChecks()` runs offline assertions for command routing.
- No `getMe` API call for every webhook request.

## Deployment and acceptance checklist

1. Run the GitHub Actions **Deploy isolated GAS webhook test** workflow (manual dispatch; fixed test deployment).
2. Run `runTestWebhookSelfChecks()` from the TEST GAS editor; confirm all checks PASS.
3. If webhook is not registered, run `registerTestWebhook()` from TEST GAS editor. **Warning:** this intentionally drops pending updates.
4. In a private chat with `@PoormanTest0219_bot`, send `/start`, `/ping`, `hello`, and several distinct messages quickly. Expected: help, `pong`, echo, and one reply per message.
5. Run `inspectTestWebhook()`. Check `pending_update_count`, `last_error_date` and `last_error_message`; an old last_error may persist, so compare timestamps.
6. Inspect `TEST_LAST_DIAGNOSTIC` for successful `stage:sent`, `telegram_http:200`. Duplicate handling needs explicit test before declaring verified.
7. Monitor for 24 hours and confirm no retries, duplicate expense entries or quota issues **before considering production**.

## Caveats / rollback

- Telegram treats a successful HTTP response as delivery confirmation. If GAS catches an error but returns HTTP 200, Telegram will **not retry**: the failed update may be lost. This test implementation records the error, but is **not** a durable queue. Production financial writes require idempotency at the expense record level and a reconciliation path.
- Deduplication of last 100 IDs is a bounded protection, not an infinite exactly-once guarantee. Script Properties is not a full queue. `LockService` is held across the send operation, so bursts may queue and potentially hit lock timeout.
- For **test bot only**, run `stopTestWebhook()` (if present) or call Telegram `deleteWebhook` with `drop_pending_updates=true` to stop deliveries. Never call deleteWebhook using the production bot token.
- Do not enable production webhook while its polling trigger is running. Production cutover and rollback must be separately reviewed.

## Files

- `Code.gs`: webhook handling, command router, deduplication and diagnostics
- `WebhookSetup.gs`: test-only registration, status and direct-send diagnostics
- `.github/workflows/deploy-gas-webhook-test.yml`: manual isolated deployment
