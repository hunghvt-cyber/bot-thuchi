function telegramApi_(method,payload){
  var token=getBotToken();
  if(!token) throw new Error('Thiếu BOT_TOKEN');
  var r=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'post',contentType:'application/json',payload:JSON.stringify(payload||{}),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300) throw new Error('Telegram '+method+' HTTP '+r.getResponseCode()+': '+r.getContentText());
  var body=JSON.parse(r.getContentText());
  if(!body.ok) throw new Error('Telegram '+method+': '+(body.description||'API error'));
  return body;
}
function sendText(chatId,text,extra){
  var p={chat_id:String(chatId),text:String(text),parse_mode:'HTML'};
  if(extra) Object.keys(extra).forEach(function(k){p[k]=extra[k];});
  return telegramApi_('sendMessage',p);
}
function setWebhook(){
  var url=getWebAppUrl();
  if(!url) throw new Error('Thiếu WEB_APP_URL');
  return telegramApi_('setWebhook',{url:url,allowed_updates:['message']});
}

function getWebhookInfo(){ return telegramApi_('getWebhookInfo',{}); }
