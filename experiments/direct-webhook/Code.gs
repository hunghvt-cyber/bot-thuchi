// Isolated Telegram webhook experiment. Production bot is not affected.
function doPost(e) {
  var started = Date.now();
  var updateId = 'unknown';
  try {
    var update = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    updateId = String(update.update_id === undefined ? 'unknown' : update.update_id);
    console.log('WEBHOOK_RECEIVED update_id=' + updateId);
    var msg = update.message;
    if (msg && msg.text && /^\/ping(?:@\w+)?(?:\s|$)/i.test(msg.text)) {
      var cache = CacheService.getScriptCache();
      var key = 'ping_update_' + updateId;
      var lock = LockService.getScriptLock();
      lock.waitLock(5000);
      try {
        if (updateId !== 'unknown' && cache.get(key)) {
          console.log('DUPLICATE_SKIPPED update_id=' + updateId);
          return HtmlService.createHtmlOutput('OK');
        }
        if (updateId !== 'unknown') cache.put(key, '1', 21600);
      } finally {
        lock.releaseLock();
      }
      var token = PropertiesService.getScriptProperties().getProperty('TEST_BOT_TOKEN');
      if (!token) throw new Error('Missing TEST_BOT_TOKEN');
      var reply = 'PONG | Apps Script processing: ' + (Date.now() - started) + ' ms';
      var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify({chat_id:msg.chat.id,text:reply,reply_to_message_id:msg.message_id}),
        muteHttpExceptions:true
      });
      console.log('SEND_MESSAGE_HTTP=' + response.getResponseCode() + ' update_id=' + updateId);
      if (response.getResponseCode() !== 200) throw new Error('sendMessage HTTP ' + response.getResponseCode());
    }
  } catch (err) {
    console.error('WEBHOOK_ERROR update_id=' + updateId + ' ' + String(err));
  }
  return HtmlService.createHtmlOutput('OK');
}
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({test:'direct-dopost',status:'ready'})).setMimeType(ContentService.MimeType.JSON);
}
