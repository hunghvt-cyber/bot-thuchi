# Isolated webhook test

Use only the test bot. Store TEST_BOT_TOKEN in test GAS Script Properties. Never reuse production token, GAS deployment or Sheets.

Deploy clasp from this directory with separate workflow; first Web App deployment may need authorization. Test Telegram webhook and measure latency before production changes.
