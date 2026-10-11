// Install once without changing bot identity, group, activation, or ledger data.
// The generated query key is stored only in GAS/Telegram, never returned here.
function receiptWebhookKeyMatches_(value,expected){
  value=String(value||'');var diff=value.length^expected.length;
  for(var i=0;i<expected.length;i++)diff|=(value.charCodeAt(i)||0)^expected.charCodeAt(i);
  return diff===0;
}
function installReceiptWebhook_(){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))throw new Error('Busy');
  try{
    var props=PropertiesService.getScriptProperties(),me=telegramApi_('getMe',{}).result||{},info=getWebhookInfo().result||{};
    if(me.username!=='PoormanTest0219_bot'||props.getProperty('ENABLE_FAMILY_WEBHOOK')!=='YES'||!familyGroupId_())throw new Error('Not active family bot');
    if(info.url!==getWebhookBaseUrl_()&&info.url!==getWebAppUrl())throw new Error('Unexpected webhook');
    var member=telegramApi_('getChatMember',{chat_id:familyGroupId_(),user_id:me.id}).result||{};
    if(member.status==='left'||member.status==='kicked')throw new Error('Bot not in group');
    var secret=props.getProperty('RECEIPT_WEBHOOK_SECRET');
    if(!secret){secret=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');props.setProperty('RECEIPT_WEBHOOK_SECRET',secret);}
    setWebhook(); // Retains pending updates and enables message + callback_query.
    registerFamilyCommands_();
  }finally{lock.releaseLock();}
}
function receiptWebhookDiagnostic_(){
  var me=telegramApi_('getMe',{}).result||{},info=getWebhookInfo().result||{},member=familyGroupId_()?telegramApi_('getChatMember',{chat_id:familyGroupId_(),user_id:me.id}).result||{}:{},last;
  try{last=JSON.parse(getScriptProp_('TEST_LAST_DIAGNOSTIC')||'null');}catch(ignore){}
  return {ok:true,botUsername:me.username||'',active:getScriptProp_('ENABLE_FAMILY_WEBHOOK')==='YES',groupConfigured:!!familyGroupId_(),botGroupStatus:member.status||'',groupPhotosVisible:member.status!=='left'&&member.status!=='kicked'&&(me.can_read_all_group_messages===true||member.status==='administrator'||member.status==='creator'),geminiConfigured:!!getGeminiApiKey(),model:getScriptProp_('GEMINI_SHARED_MODEL')||'gemini-3.5-flash-lite',receiptSecured:!!getScriptProp_('RECEIPT_WEBHOOK_SECRET'),webhookMatches:info.url===getWebAppUrl(),pending:info.pending_update_count||0,allowedUpdates:info.allowed_updates||[],lastStage:last&&last.stage||'',lastKind:last&&last.message_kind||'',lastAt:last&&last.at||'',reportTriggers:ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='runWebhookDailyReport_';}).length};
}
