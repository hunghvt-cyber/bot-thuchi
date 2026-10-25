/**
 * Webhook entrypoint for the NEW GAS only.
 * Financial routing is gated until cutover; benchmark commands remain available.
 */
function doGet(e){
  if(e&&e.parameter&&e.parameter.action==='homepage_donations')return donationFeedResponse_();
  if(e&&e.parameter&&(e.parameter.diagnostic==='1'||e.parameter.installReceipt==='1')){
    try{if(e.parameter.installReceipt==='1')installReceiptWebhook_();return ContentService.createTextOutput(JSON.stringify(receiptWebhookDiagnostic_())).setMimeType(ContentService.MimeType.JSON);}
    catch(err){return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Không hoàn tất cấu hình receipt webhook.'})).setMimeType(ContentService.MimeType.JSON);}
  }
  return HtmlService.createHtmlOutput('poorman-webhook-ready');
}
function doPost(e){
  // Bank intake stays separate from normal ledger routing; the MB donation projection uses its own Sheet.
  if(e&&(e.pathInfo==='macrodroid'||e.parameter&&e.parameter.intake==='macrodroid'))return bankRelayPost_(e);
  var webhookSecret=getScriptProp_('RECEIPT_WEBHOOK_SECRET');
  if(webhookSecret&&!receiptWebhookKeyMatches_(e&&e.parameter&&e.parameter.key,webhookSecret))return HtmlService.createHtmlOutput('OK');
  // Draft replies must not fall through to normal ledger parsing, even after expiry.
  try{var bankUpdate=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
    if(bankUpdate.message&&typeof handleBankCopyCommand_==='function'&&handleBankCopyCommand_(bankUpdate.message))return HtmlService.createHtmlOutput('OK');
    if(bankUpdate.message&&typeof handleBankLogCommand_==='function'&&handleBankLogCommand_(bankUpdate.message))return HtmlService.createHtmlOutput('OK');
    if(bankUpdate.callback_query&&typeof handleBankDraftCallback_==='function'&&handleBankDraftCallback_(bankUpdate.callback_query))return HtmlService.createHtmlOutput('OK');
    if(bankUpdate.message&&typeof handleBankDraftReply_==='function'&&handleBankDraftReply_(bankUpdate.message))return HtmlService.createHtmlOutput('OK');
  }catch(bankReplyError){return HtmlService.createHtmlOutput('OK');}
  var started=Date.now(),diag={at:new Date().toISOString(),stage:'received'};
  try{
    var u=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
    diag.update_id=u.update_id;
    var msg=u.message,cb=u.callback_query;
    diag.chat_id=msg&&msg.chat?String(msg.chat.id):cb&&cb.message&&cb.message.chat?String(cb.message.chat.id):null;
    var props=PropertiesService.getScriptProperties();
    var active=props.getProperty('ENABLE_FAMILY_WEBHOOK')==='YES';
    diag.active=active;
    diag.message_id=msg&&msg.message_id;
    diag.from_id=msg&&msg.from&&msg.from.id;
    diag.message_kind=msg?(typeof msg.text==='string'?'text':'non_text'):cb?'callback':'other';
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
      if(cb&&!(webhookSecret&&receiptCallback_(cb,false)))familyResetCallback_(cb);
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
    try{writeWebhookHistory_(diag);}catch(logError){console.error('History error: '+logError);}
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

function writeWebhookHistory_(d){
 var ss=SpreadsheetApp.openById(getMainSpreadsheetId());
 var sh=ss.getSheetByName('WebhookLogs');
 if(!sh){sh=ss.insertSheet('WebhookLogs');sh.appendRow(['Time','Stage','Update','Chat','Message','Sender','Kind','Active','Error']);}
 sh.appendRow([d.at,d.stage,d.update_id||'',d.chat_id||'',d.message_id||'',d.from_id||'',d.message_kind||'',d.active===true?'YES':'NO',d.error||'']);
}
function showRecentWebhookLogs(){
 var sh=SpreadsheetApp.openById(getMainSpreadsheetId()).getSheetByName('WebhookLogs');
 if(!sh){console.log('No history');return;}
 var n=sh.getLastRow();if(n<2)return;
 sh.getRange(Math.max(2,n-19),1,Math.min(20,n-1),9).getDisplayValues().forEach(function(row){console.log(JSON.stringify(row));});
}


