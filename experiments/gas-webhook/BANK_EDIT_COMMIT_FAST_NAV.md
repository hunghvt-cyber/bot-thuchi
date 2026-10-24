# Bank edit-to-commit and read-only navigation — 24/10/2026

Owner reported version 35 still feels slow and requested: “Mà đã edit thì cho ghi vào sheet như duyệt luôn nhé”. This explicitly extends approval to submitting a valid correction; merely opening Edit is not approval.

## Correction semantics

Submitting a valid amount/description reply or choosing category/Thu/Chi calls the same bankCommit_ path as Duyệt when all required fields are complete. This includes explicitly submitting an unchanged amount or choosing the current category/type: the owner has submitted a value. Owner/group/expiry/deletion checks, exact VND validation, shared ScriptLock and durable per-event ledger dedupe remain. Receipt/manual flows and existing Sheets schema are untouched.

Opening Edit/category/type menus, opening an input prompt, Back, Delete and Restore never approve. Incomplete edited drafts stay drafts until the missing amount/direction/category is supplied; invalid input never writes. Input prompts explicitly say submitting will edit and record. A valid correction ends with the normal approved confirmation; further existing ledger reply edits/deletes remain available. Earlier queued draft prompts and stale draft buttons cannot mutate an approved row. Ambiguous commit failure still asks Duyệt to reconcile; no second row is appended by retrying the same event.

## Navigation latency

Version 35 batching did not satisfy observed responsiveness. Edit/menu/type/Back now use a read-only path with owner/group/message/event/expiry/recorded/deleted/busy checks, but no ScriptLock, no edit claim, no extraction hash, no callback-ID history write and no final event rewrite. It reads current authoritative event state and dispatches ack/menu together. Read-only menu replay is safe and may run again; mutations remain locked/idempotent. No accounting authority is cached.

Category buttons carry exact category values in bank:catv callbacks, each below Telegram 64-byte limit. Thus the list does not need a property write to preserve a numeric index snapshot, and a category-order change cannot silently change a selected category. Legacy bank:cat callbacks continue to honor a saved snapshot, falling back to current list when no snapshot exists. The base Edit / Duyệt layout and four edit choices remain unchanged.

Navigation timings are cached only after UI dispatch for up to one hour, best effort; /banklog detail prefers newer cache timing to last persisted mutation timing. Cache contains only event id/action/timing, no authoritative accounting state or notification content, and may be evicted. Mutation timing and learning records still use existing seven-day retention; draft approval still expires after 48h. Timing is in-handler, not tap-to-visible. Concurrent read-only menu updates can arrive out of order, but every later mutation revalidates authoritative state and cannot create another ledger row after approval.

## Validation and limits

106 Node mock/static tests pass: 97 prior focused extraction/display/transport cases plus nine new integration cases. Prior draft-edit unit fixtures explicitly isolate auto-commit policy; new tests use the production auto-commit function and mock ledger. New coverage includes zero navigation locks/property writes, stable category values after reorder/64-byte limit, amount/content immediate commit and webhook routing, category/type immediate commit, menu/prompt/delete/restore no-write, incomplete/invalid/unauthorized/expired corrections, unchanged explicit submission, ambiguous flush recovery, legacy category callbacks and stale post-approval actions.

No real financial row, Telegram prompt or callback was generated during development. Deployed code and mock checks cannot prove phone latency; the user has not yet verified this version. GAS cold start/network latency remains; do not claim instant menus or a measured speed gain. No new macro/key/property/setup/trigger/service is required. Existing cross-app/manual-entry dedupe limitations remain.
