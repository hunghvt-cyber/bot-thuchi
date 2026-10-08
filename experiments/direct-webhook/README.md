# Direct Telegram webhook → Apps Script test

Separate Google Apps Script project; **does not touch production bot**.

Script ID: `1bZPB4JI11VRZJA1aoGkNZ2JOo4_hWXlqsenGd6902yOikX_oKG74jPoP`

Deploy via manual GitHub Actions workflow on the experiment branch using existing `CLASPRC_JSON`. Deployment only pushes source and updates a separately configured test web-app deployment. No webhook changes are performed automatically.

In the test Apps Script project, set script property `TEST_BOT_TOKEN` to the **new test bot token**. Deploy web app as **Execute as me**, **Anyone**. Copy deployment ID and add it to the workflow input. Set the webhook on the **test bot only** using its new token and the web app /exec URL. Check Telegram getWebhookInfo for 302 errors, then send /ping.

Important: Google Apps Script ContentService typically redirects with HTTP 302, which Telegram may reject. A direct webhook is therefore an experiment, not a promised fix. Avoid pasting tokens into logs or chat.
