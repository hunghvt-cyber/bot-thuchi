/** Run once manually from the test Apps Script editor. Never run for production bot. */
function registerTestWebhook() {
  var token = PropertiesService.getScriptProperties().getProperty('TEST_BOT_TOKEN');
  if (!token) throw new Error('Missing TEST_BOT_TOKEN in test Script Properties');
  var url = 'https://script.google.com/macros/s/AKfycby9V-wbbucC9zTBRfMdCM5Tf8qsJRlMVeQtOfyKmrtuOVmLs1USBcTTMbe4J2ExhpQn/exec';
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'post',
    payload: {url: url, drop_pending_updates: 'true'},
    muteHttpExceptions: true
  });
  console.log('setWebhook HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
  inspectTestWebhook();
}
function inspectTestWebhook() {
  var token = PropertiesService.getScriptProperties().getProperty('TEST_BOT_TOKEN');
  if (!token) throw new Error('Missing TEST_BOT_TOKEN');
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo', {muteHttpExceptions: true});
  console.log('getWebhookInfo HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
}
