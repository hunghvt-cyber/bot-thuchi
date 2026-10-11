/** Run once manually from the test Apps Script editor. Never run for production bot. */
function registerTestWebhook() {
  // Preserve the receipt query secret and pending family updates.
  setWebhook();
  inspectTestWebhook();
}
function inspectTestWebhook() {
  var state=receiptWebhookDiagnostic_();
  console.log(JSON.stringify(state));return state;
}

/** Diagnostic only: verifies whether the TEST bot can access the last webhook chat. */
function testReplyToLastChat() {
  var props=PropertiesService.getScriptProperties();
  var token=props.getProperty('TEST_BOT_TOKEN');
  var raw=props.getProperty('TEST_LAST_DIAGNOSTIC');
  if(!token || !raw) throw new Error('Missing test token or diagnostic');
  var chatId=JSON.parse(raw).chat_id;
  if(!chatId) throw new Error('No chat_id in last diagnostic');
  var base='https://api.telegram.org/bot'+token+'/';
  var chat=UrlFetchApp.fetch(base+'getChat',{method:'post',payload:{chat_id:chatId},muteHttpExceptions:true});
  console.log('getChat HTTP '+chat.getResponseCode()+': '+chat.getContentText());
  var send=UrlFetchApp.fetch(base+'sendMessage',{method:'post',payload:{chat_id:chatId,text:'Direct diagnostic from GAS test'},muteHttpExceptions:true});
  console.log('sendMessage HTTP '+send.getResponseCode()+': '+send.getContentText());
}

