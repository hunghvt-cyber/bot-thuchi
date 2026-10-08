// Standalone test project: no Sheets, no Gemini, no production bot settings.
function doPost(e) {
  var started = Date.now();
  try {
    var update = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var msg = update.message;
    if (msg && msg.text && /^\/ping(?:@\w+)?(?:\s|$)/i.test(msg.text)) {
      var token = PropertiesService.getScriptProperties().getProperty('TEST_BOT_TOKEN');
      if (!token) throw new Error('Missing TEST_BOT_TOKEN');
      var reply = 'PONG | Apps Script processing: ' + (Date.now() - started) + ' ms';
      var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify({chat_id:msg.chat.id,text:reply,reply_to_message_id:msg.message_id}),
        muteHttpExceptions:true
      });
      if (response.getResponseCode() !== 200) throw new Error('sendMessage HTTP ' + response.getResponseCode());
    }
  } catch (err) { console.error(String(err)); }
  return ContentService.createTextOutput('OK');
}
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({test:'direct-dopost',status:'ready'})).setMimeType(ContentService.MimeType.JSON);
}
