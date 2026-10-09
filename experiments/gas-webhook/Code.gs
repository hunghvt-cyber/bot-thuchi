/**
 * Webhook entrypoint for the NEW GAS only.
 * Financial routing is gated until cutover; benchmark commands remain available.
 */
function doGet(){return HtmlService.createHtmlOutput('poorman-webhook-ready');}
function doPost(e){
  var started=Date.now(),diag={at:new Date().toISOString(),stage:'received'};
  try{
    var u=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
    diag.update_id=u.update_id;
    var msg=u.message,cb=u.callback_query;
    diag.chat_id=msg&&msg.chat?String(msg.chat.id):cb&&cb.message&&cb.message.chat?String(cb.message.chat.id):null;
    var props=PropertiesService.getScriptProperties();
    var active=props.getProperty('ENABLE_FAMILY_WEBHOOK')==='YES';
    diag.active=active;
    if(!active){
      if(msg&&msg.chat&&typeof msg.text==='string'){
        var command=String(msg.text).trim().split(/\s+/)[0].split('@')[0].toLowerCase();
        if(command==='/ping'||command==='/start'||command==='/status'){
          sendText(msg.chat.id,command==='/ping'?'pong':'Webhook ready; family ledger is not activated yet.');
          diag.stage='test_reply';
        }else{diag.stage='inactive_ignored';}
      }else{diag.stage='inactive_ignored';}
    }else{
      if(!getMainSpreadsheetId())throw new Error('GOOGLE_SPREADSHEET_ID missing');
      if(!getFamilyGroupId())throw new Error('FAMILY_GROUP_ID missing');
      // The ledger append and reset callback each acquire their own script lock.
      // Do NOT lock the entire handler (nested ScriptLock is not reentrant).
      if(msg)handleFamilyMessage_(msg);
      if(cb)familyResetCallback_(cb);
      diag.stage='handled';
    }
  }catch(err){
    diag.stage='error';
    diag.error=String(err).slice(0,200);
    console.error('Webhook error: '+(err.stack||err));
  }finally{
    diag.elapsed_ms=Date.now()-started;
    PropertiesService.getScriptProperties().setProperty('TEST_LAST_DIAGNOSTIC',JSON.stringify(diag));
    console.log(JSON.stringify(diag));
  }
  return HtmlService.createHtmlOutput('OK');
}
function showLastWebhookDiagnostic(){
  var value=PropertiesService.getScriptProperties().getProperty('TEST_LAST_DIAGNOSTIC');
  console.log(value||'No diagnostic');return value;
}
function runTestWebhookSelfChecks(){
  var checks=['TEST_BOT_TOKEN','GOOGLE_SPREADSHEET_ID','GEMINI_API_KEY','FAMILY_GROUP_ID'];
  var props=PropertiesService.getScriptProperties();
  checks.forEach(function(key){console.log(key+': '+(props.getProperty(key)?'configured':'MISSING'));});
  console.log('ENABLE_FAMILY_WEBHOOK: '+(props.getProperty('ENABLE_FAMILY_WEBHOOK')||'NO'));
  console.log('New GAS webhook source loaded');
}

function showLastTransactionDiagnostic(){
  var v=PropertiesService.getScriptProperties().getProperty('FAMILY_LAST_TRANSACTION_DIAGNOSTIC');
  console.log(v||'No transaction diagnostic');return v;
}
