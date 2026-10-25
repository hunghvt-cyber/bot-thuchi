# MB donate projection — draft, not deployed

Owner selected MB account 566766 only, arbitrary donor messages, funny Gemini thanks on Homepage terminal, rolling 24h history OR newest ten records. Existing phone Durable Relay should remain the only capture/queue/ACK path.

Donations.gs stores sanitized JSON in a dedicated HomepageDonations tab in the existing spreadsheet. No auto-approval or change to Transactions. The hook is after relay authentication/time checks, before BANK_EVT short-circuit so replay can reconcile a previously ambiguous donation append. Gemini is called once only for a durably new donation; amount/style seed only, no raw/donor instructions in model prompt. Failure keeps the saved fallback thanks. Public GET `?action=homepage_donations` never creates a Sheet, calls Gemini or reads Transactions. Cache five seconds; 24h rolling OR newest ten. Durable dedupe retained independently of visible history.

BLOCKER: owner will send a real MB notification screenshot. `DONATE_MB_FORMAT_VERIFIED_=false`; `donationFromMB_` always returns null until exact package/account/direction/amount/message/ID evidence is available. Do not deploy/enable by inventing a sample. When implemented, derive stable donation identity from real bank reference (preferred) or exact source/account/transaction-time evidence, never amount alone or phone capture-time alone. Only incoming MB account 566766; ambiguous/outgoing/non-bank notifications ignored. Retain an activation cutoff so old queued notifications cannot become new donations.

Current checks: all 128 mock/static GAS tests pass, including default-disabled intake compatibility, isolated storage, dedupe/conflict/ambiguous flush, history retention and one Gemini call/fallback. No phone import, live Sheet writes, Gemini execution or production verification performed.

Next: read real notification, implement/test deterministic MB parser, re-run tests; deploy only to active isolated webhook branch/project after ready. Update Homepage `/api/donations`, UI and handoffs in coordinated release. Verify a real transfer end-to-end without creating fake public donations. The assistant must not send money to test.
