/**
 * NEW GAS ONLY. Configure Script Properties without committing any secret:
 * TEST_BOT_TOKEN, GOOGLE_SPREADSHEET_ID (same existing family Sheet),
 * GEMINI_API_KEY, FAMILY_GROUP_ID (existing Telegram group), optionally GEMINI_MODEL.
 * Leave ENABLE_FAMILY_WEBHOOK unset until the old polling bot is disabled.
 */
function inspectNewBotReadiness(){
  var props=PropertiesService.getScriptProperties();
  var keys=['TEST_BOT_TOKEN','GOOGLE_SPREADSHEET_ID','GEMINI_API_KEY','FAMILY_GROUP_ID'];
  var state={};
  keys.forEach(function(k){state[k]=!!props.getProperty(k);});
  state.enabled=props.getProperty('ENABLE_FAMILY_WEBHOOK')==='YES';
  state.reportTriggers=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='runWebhookDailyReport_';}).length;
  if(state.GOOGLE_SPREADSHEET_ID){
    try{var sh=familySheet_();state.sheet=sh.getName();state.rows=sh.getLastRow();}catch(e){state.sheet_error=String(e).slice(0,150);}
  }
  try{var info=getWebhookInfo().result||{};state.webhook_url_matches=info.url===getWebAppUrl();state.pending=info.pending_update_count;state.last_error=info.last_error_message||'';}catch(e){state.webhook_error=String(e).slice(0,150);}
  console.log(JSON.stringify(state));return state;
}
/** Run once before cutover; scheduling alone does NOT activate expense processing. */
function installWebhookDailyReportTrigger(){
  var triggers=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='runWebhookDailyReport_';});
  if(!triggers.length)ScriptApp.newTrigger('runWebhookDailyReport_').timeBased().everyMinutes(10).create();
  triggers.slice(1).forEach(function(t){ScriptApp.deleteTrigger(t);});
  console.log('Daily report trigger installed (checks 21:00-21:59 Vietnam).');
}
function runWebhookDailyReport_(){
  if(PropertiesService.getScriptProperties().getProperty('ENABLE_FAMILY_WEBHOOK')!=='YES')return;
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))return;
  try{sendFamilyDailyReportIfDue_();}
  catch(e){PropertiesService.getScriptProperties().setProperty('DAILY_REPORT_LAST_ERROR',String(e).slice(0,200));throw e;}
  finally{lock.releaseLock();}
}
/**
 * Explicit manual cutover only. First stop OLD GAS polling and ensure new bot is
 * sole active ledger writer in the family group; then run this in NEW GAS editor.
 */
function activateNewFamilyWebhook(){
  var state=inspectNewBotReadiness();
  if(!state.TEST_BOT_TOKEN||!state.GOOGLE_SPREADSHEET_ID||!state.GEMINI_API_KEY||!state.FAMILY_GROUP_ID||!state.webhook_url_matches||state.sheet_error){
    throw new Error('New webhook readiness checks failed; activation refused');
  }
  if(state.reportTriggers!==1)throw new Error('Install exactly one daily report trigger first');
  PropertiesService.getScriptProperties().setProperty('ENABLE_FAMILY_WEBHOOK','YES');
  console.log('NEW family webhook enabled. Confirm OLD polling is already disabled.');
}
/** Emergency pause of NEW expense processing; preserves all Sheets data. */
function pauseNewFamilyWebhook(){
  PropertiesService.getScriptProperties().setProperty('ENABLE_FAMILY_WEBHOOK','NO');
  console.log('NEW expense processing paused; /ping remains available.');
}
