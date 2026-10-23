# Bank preview: query route fixes HTTP401 — 23/10/2026

Supersedes /exec/macrodroid setup instructions for real phone use.
Phone at13:23 captured both VIB debit2000 and credit2000 and attempted HTTP; both received Google HTML401.
Independent anonymous POST probes: base /exec returned200; /exec/macrodroid returned401 without redirect.
This is observed transport behavior, not a proven explanation of Google's internal failure.
Disabling MD before bank use does not explain the two logged events: both triggers and HTTP actions ran.

Fix: Code.gs accepts e.parameter.intake==='macrodroid' before Telegram secret routing, retaining legacy path routing.
Canonical phone URL:
https://script.google.com/macros/s/AKfycby9V-wbbucC9zTBRfMdCM5Tf8qsJRlMVeQtOfyKmrtuOVmLs1USBcTTMbe4J2ExhpQn/exec?intake=macrodroid
intake is a public selector, NOT an authentication key. Actual key remains HTTPS body only.

PR https://github.com/hunghvt-cyber/poorman-telebot/pull/3 merged86928565226c0d2da77aa3711a111747db8c7686.
CI https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/39911628957 succeeded,37/37 tests; GAS deployment version27.
Live unauthenticated probe to new URL with deliberately invalid intake key returned HTTP200 JSON {"ok":false,"status":"unauthorized"}.
This proves the bank route was reached and authentication refused the test. No ledger writes or financial test messages sent.
Real valid-key Telegram send and draft edit still need phone acceptance; do not call end-to-end complete.

User reports prepare/readiness succeeded, BANK_RELAY_VERIFIED=YES and phone configuration completed.
Existing actual key/owner/group properties are unknown to assistant and are not changed by this fix.
No need to regenerate key or run setup helpers again.

## Replacement macro
macrodroid-config branch experiment/bank-telegram-preview-20261023:
macros/Bank_Notify_telegram_preview_v1_1_QUERY.mdr
builder/check: tools/build_bank_preview_query_v1_1.py, tools/check_bank_preview_query_v1_1.py

Retains same name/GUID as existing Bank Notify - Telegram Preview v1.
Only public URL default, its regex guard and description differ from v1_GAS.
Do not only change bank_endpoint in the old macro: old URL guard rejects the new query form.
Artifact defaults disabled, bank_key=CHUA_CAU_HINH, bank_ready=NO.
Back up phone config; import only this macro and replace existing identity, keep unrelated settings.
Copy existing BANK_RELAY_KEY to bank_key locally, bank_ready=YES, save/enable exactly one sender.
If importer creates a duplicate, disable old sender before enabling new one.
Do not export/share phone macro containing actual key.
Do not import full old settings from wrapper.

Expected new notification: HTTP200 plus status sent (or duplicate_sent for exact envelope replay) AND actual Telegram BANK_DRAFT_V1.
HTTP200 alone is not success: unauthorized/not_configured/disabled need their own diagnosis.
Reply edit only modifies temporary draft. Still no Sheets writes, manual transaction input remains necessary.
No need to make financial transfers only for testing.

Known remaining limitations unchanged: phone offline queue absent; cross-app transaction dedupe not implemented;
draft/event expiry48h, cleanup hourly; uncertain Telegram send not auto-resent.
BIDV/VIB/BHX only. VCB/MB/MBS samples are not newly supported by this transport fix.
