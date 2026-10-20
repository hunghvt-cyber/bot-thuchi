# Homepage chat input limits

Homepage chat accepts 50,000 UTF-16 units per user message, 200,000 total across
user/model messages, and up to 39 alternating messages ending with user (20 turns).
Response/model-history limit remains 16,000. Signed envelope string ceiling is
1,500,000 to allow JSON escaping of the bounded history; all HMAC/timestamp,
quota and model-selection checks remain before generation.

Only homepageChat_ validation changes; receipt generation, model configuration,
Telegram webhook, Sheets and trigger configuration remain as before. Deploy the
existing Homepage bridge through deploy-apps-script.yml on reviewed main, then
deploy matching Homepage UI/API. No bootstrap or key/property changes.
