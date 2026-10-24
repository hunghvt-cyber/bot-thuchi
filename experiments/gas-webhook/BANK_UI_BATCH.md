# Bank button response batching — 24/10/2026

Owner approved trying a faster existing Edit / Duyệt flow after reporting residual 1–2 second menu delays. The previous implementation acknowledged the callback via one blocking UrlFetchApp.fetch and only then called Telegram again to edit the menu or send a ForceReply prompt.

## Behavior

After the existing group/owner/message/event/expiry/claim checks, non-approval bank buttons call telegramCallbackUi_. It dispatches answerCallbackQuery and exactly one independent editMessageReplyMarkup, editMessageText or sendMessage together in one UrlFetchApp.fetchAll. Token is read once. Navigation still updates only reply_markup; legacy text refresh and actual edits still update message text. ForceReply prompt creation keeps its returned message ID and existing temporary mapping. Pure menu navigation no longer computes an unnecessary extraction snapshot hash.

Approval is deliberately unchanged: acknowledge first, then the existing atomic ledger function verifies/writes a durable dedupe key and confirms the result. No ledger write is inside a network batch. Manual/receipt flows still use the unchanged telegramApi_ function.

Each batch handles the UI response independently. A stale/bad callback acknowledgement must not hide a successful UI operation. UI API failures release the editing claim and retain sanitized learning errors plus the existing visible failure note. Message-is-not-modified remains a benign no-op. No ambiguous network batch is automatically retried: a sendMessage prompt may already have been accepted, and an entire retry could duplicate it. There are no serial fallback UI sends.

## Measurement and limits

The existing event stores only last_ui_timing for a non-approval button: action, batch mode, preparation milliseconds, Telegram batch milliseconds and elapsed handler milliseconds. This uses the existing final state save and expires with the seven-day event. /banklog <id> exposes preparation and Telegram timing only on owner request, with no extra automatic group messages. Measurement starts inside the callback handler; it excludes Telegram delivery to GAS, cold start before handler entry, final property-save/response delivery and phone rendering. It is not tap-to-visible latency or a BotFather benchmark.

This removes a serial network wait; actual latency improvement is an expectation requiring live user observation, not a measured claim. GAS and Telegram/network delay remain. No new service, configuration, app, macro, token, Sheet, trigger or category changes. Weekly log retention and 48-hour approval expiry remain.

## Validation

97 Node mock/static tests pass (88 existing + 3 callback batch integration cases + 6 real-helper transport cases). Coverage verifies one fetchAll dispatch/one token read/no serial fetch; exact payloads and prompt IDs; independent ack/UI failure; safe not-modified handling; ambiguous network/malformed response behavior without retries or error-body leaks; invalid method/missing token; authorized menu/input batch timing; unauthorized/replayed requests; unchanged approval dedupe. No real Telegram message, callback or ledger row was created during development. Deployment and live latency must be verified separately.
