var TEST_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyz9lklOUobi-ghu4ZmRhFXJuI5GiHKfaCTb5Ss88GMigeMqxkhvixyKY4HtPcA-C-d/exec';
function testApi_(method, payload) {
  var token = PropertiesService.getScriptProperties().getProperty('TEST_BOT_TOKEN');
  if (!token) throw new Error('Missing TEST_BOT_TOKEN');
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method:'post', contentType:'application/json',
    payload:JSON.stringify(payload || {}), muteHttpExceptions:true
  });
  var result = JSON.parse(response.getContentText());
  if (!result.ok) throw new Error(method + ': ' + result.description);
  return result.result;
}
function setupTestWebhook() {
  testApi_('setWebhook', {url:TEST_WEB_APP_URL,allowed_updates:['message']});
  return checkTestWebhook();
}
function checkTestWebhook() {
  var info = testApi_('getWebhookInfo', {});
  console.log(JSON.stringify({url:info.url,pending:info.pending_update_count,last_error:info.last_error_message || ''}));
  return info;
}
function removeTestWebhook() {
  return testApi_('deleteWebhook', {drop_pending_updates:false});
}
