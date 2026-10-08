function doGet(e) { return HtmlService.createHtmlOutput('webhook-test-ready'); }
function doPost(e) {
  var start=Date.now();
  var diagnostic={at:new Date().toISOString(),stage:'start'};
  try {
    var update=JSON.parse((e.postData && e.postData.contents)||'{}');
    var msg=update.message;
    var token=PropertiesService.getScriptProperties().getProperty('TEST_BOT_TOKEN');
    diagnostic.update_id=update.update_id;
    diagnostic.message_type=msg ? (msg.text ? 'text' : 'non_text') : 'no_message';
    diagnostic.has_token=!!token;
    diagnostic.chat_id=msg && msg.chat ? String(msg.chat.id) : null;
    diagnostic.chat_type=msg && msg.chat ? msg.chat.type : null;
    if(token) {
      var me=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/getMe',{muteHttpExceptions:true});
      var meJson=JSON.parse(me.getContentText());
      diagnostic.bot_username=meJson.ok && meJson.result ? meJson.result.username : null;
      diagnostic.get_me_http=me.getResponseCode();
    }
    if(msg && msg.text && token) {
      var r=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
        method:'post',payload:{chat_id:msg.chat.id,text:'Webhook OK ('+(Date.now()-start)+'ms): '+msg.text},
        muteHttpExceptions:true
      });
      diagnostic.telegram_http=r.getResponseCode();
      var reply=JSON.parse(r.getContentText());
      diagnostic.telegram_ok=reply.ok;
      diagnostic.telegram_error=reply.ok ? null : String(reply.description||'unknown').slice(0,180);
      diagnostic.stage='sendMessage';
    } else {
      diagnostic.stage='skipped';
    }
  } catch(err) {
    diagnostic.stage='error';
    diagnostic.error=String(err).slice(0,220);
  } finally {
    diagnostic.elapsed_ms=Date.now()-start;
    PropertiesService.getScriptProperties().setProperty('TEST_LAST_DIAGNOSTIC',JSON.stringify(diagnostic));
    console.log(JSON.stringify(diagnostic));
  }
  return HtmlService.createHtmlOutput('OK');
}
function showLastWebhookDiagnostic() {
  var value=PropertiesService.getScriptProperties().getProperty('TEST_LAST_DIAGNOSTIC');
  console.log(value||'No webhook diagnostic recorded yet');
  return value;
}
