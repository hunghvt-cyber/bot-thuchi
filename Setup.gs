function setupFamilyBot(){
  familySheet_();
  if(!getBotToken())throw new Error('Thiếu BOT_TOKEN');
  if(!getGeminiApiKey())throw new Error('Thiếu GEMINI_API_KEY');
  // Apps Script ContentService responds with HTTP 302, which Telegram webhook rejects.
  // Poll Telegram directly from a time-based Apps Script trigger instead.
  var removed=telegramApi_('deleteWebhook',{drop_pending_updates:false});
  var commands=registerFamilyCommands_();
  if(!commands.result||!commands.result.length)throw new Error('Telegram commands not registered');
  var triggers=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='pollFamilyTelegram_';});
  if(!triggers.length)ScriptApp.newTrigger('pollFamilyTelegram_').timeBased().everyMinutes(1).create();
  if(triggers.length>1)triggers.slice(1).forEach(function(t){ScriptApp.deleteTrigger(t);});
  var info=getWebhookInfo().result||{};
  if(info.url)throw new Error('Webhook still active; cannot poll');
  return {ok:true,mode:'polling',pollIntervalMinutes:1,telegram:removed.ok===true,commands:commands.result.length,pending:info.pending_update_count||0};
}
function pollFamilyTelegram_(){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try{
    var props=PropertiesService.getScriptProperties();
    props.setProperty('POLL_LAST_START',new Date().toISOString());
    props.deleteProperty('POLL_LAST_ERROR');
    var offset=Number(props.getProperty('TELEGRAM_UPDATE_OFFSET')||0);
    var updates=telegramApi_('getUpdates',{offset:offset,limit:30,timeout:0,allowed_updates:['message','callback_query']}).result||[];
    props.setProperty('POLL_LAST_BATCH_SIZE',String(updates.length));
    for(var i=0;i<updates.length;i++){
      var update=updates[i];
      try{
        if(update.message)handleFamilyMessage_(update.message);
        if(update.callback_query)familyResetCallback_(update.callback_query);
      }catch(err){
        props.setProperty('POLL_LAST_ERROR',String(err.message||err).slice(0,250));
        Logger.log('Telegram update '+update.update_id+': '+(err.stack||err));
        try{if(update.message&&update.message.chat)sendText(update.message.chat.id,'Lỗi xử lý: '+escapeHtml_(String(err.message||err).slice(0,180)));}catch(ignore){}
      }
      props.setProperty('TELEGRAM_UPDATE_OFFSET',String(update.update_id+1));
    }
    props.setProperty('POLL_LAST_SUCCESS',new Date().toISOString());
    try{sendFamilyDailyReportIfDue_();}catch(reportError){props.setProperty('DAILY_REPORT_LAST_ERROR',String(reportError.message||reportError).slice(0,250));Logger.log('Daily report: '+(reportError.stack||reportError));}
  }catch(err){
    PropertiesService.getScriptProperties().setProperty('POLL_LAST_ERROR',String(err.message||err).slice(0,250));
    throw err;
  }finally{lock.releaseLock();}
}
function healthCheck(){return {spreadsheet:!!getMainSpreadsheetId(),bot:!!getBotToken(),gemini:!!getGeminiApiKey(),webApp:!!getWebAppUrl(),group:familyGroupId_()||'ANY'};}
function testMoneyParser(){
  var cases = [
    ['45k', 45000],
    ['45 nghìn', 45000],
    ['630', 630000],
    ['đi chợ 630', 630000],
    ['2tr5', 2500000],
    ['học phí 2tr5', 2500000],
    ['1tr350', 1350000],
    ['tiền điện 1tr350', 1350000],
    ['1.5tr', 1500000],
    ['1,5tr', 1500000],
    ['cafe 2 đứa 85', 85000]
  ];
  cases.forEach(function(test){
    var got = parseMoneyLocal_(test[0]);
    if (got !== test[1]) throw new Error(test[0]+' expected '+test[1]+' got '+got);
  });
  return 'PASS ('+cases.length+' cases)';
}

// Runs inside the existing one-minute polling trigger; no additional trigger needed.
// Lock in pollFamilyTelegram_ serializes checks. Retry on subsequent polls if sending fails.
function sendFamilyDailyReportIfDue_(){
  var now=new Date(),tz='Asia/Ho_Chi_Minh';
  if(Number(Utilities.formatDate(now,tz,'HH'))!==21)return;
  var date=Utilities.formatDate(now,tz,'yyyy-MM-dd');
  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('DAILY_REPORT_SENT_DATE')===date)return;
  var chatId=familyGroupId_();
  if(!chatId)throw new Error('Chưa cấu hình FAMILY_GROUP_ID cho báo cáo tự động');
  var data=familySheet_().getDataRange().getValues();
  var totalToday=0,totalMonth=0;
  var month=date.slice(0,7);
  for(var i=1;i<data.length;i++){
    var r=data[i];
    if(r[4]!=='ChiTieu'||String(r[15])==='DELETED')continue;
    var d=new Date(r[0]);if(isNaN(d.getTime()))continue;
    var day=Utilities.formatDate(d,tz,'yyyy-MM-dd');
    if(day.slice(0,7)!==month||day>date)continue;
    var amount=Number(r[7])||0;
    totalMonth+=amount;
    if(day===date)totalToday+=amount;
  }
  var days=Number(date.slice(8,10));
  var message=[
    '<b>BÁO CÁO CHI TIÊU — '+date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4)+'</b>',
    'Chi tiêu hôm nay: <b>'+formatVnd_(totalToday)+'</b>',
    'Trung bình/ngày trong tháng: <b>'+formatVnd_(totalMonth/days)+'</b>',
    'Tổng chi tiêu tháng: <b>'+formatVnd_(totalMonth)+'</b>'
  ].join('\n');
  sendText(chatId,message);
  props.setProperty('DAILY_REPORT_SENT_DATE',date);
  props.deleteProperty('DAILY_REPORT_LAST_ERROR');
}
