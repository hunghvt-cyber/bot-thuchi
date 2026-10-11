function telegramApi_(method,payload){
  var token=getBotToken();
  if(!token) throw new Error('Thiếu BOT_TOKEN');
  var r;try{r=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'post',contentType:'application/json',payload:JSON.stringify(payload||{}),muteHttpExceptions:true});}catch(networkError){throw new Error('Telegram '+method+': kết nối tạm thời lỗi.');}
  if(r.getResponseCode()<200||r.getResponseCode()>=300) throw new Error('Telegram '+method+' HTTP '+r.getResponseCode()+': '+r.getContentText());
  var body=JSON.parse(r.getContentText());
  if(!body.ok) throw new Error('Telegram '+method+': '+(body.description||'API error'));
  return body;
}
function sendText(chatId,text,extra){
  var p={chat_id:String(chatId),text:String(text),parse_mode:'HTML'};
  if(extra) Object.keys(extra).forEach(function(k){p[k]=extra[k];});
  var result=telegramApi_('sendMessage',p);
  try{if(result.result&&result.result.message_id)familyRememberBotMessage_(chatId,result.result.message_id);}catch(e){Logger.log('Message tracking: '+e);}
  return result;
}
function setWebhook(){return telegramApi_('setWebhook',{url:getWebAppUrl(),allowed_updates:['message','callback_query'],drop_pending_updates:false});}

function getWebhookInfo(){ return telegramApi_('getWebhookInfo',{}); }

function registerFamilyCommands_(){
  var commands=[
    {command:'help',description:'Hướng dẫn sử dụng'},
    {command:'scan',description:'Reply ảnh bill của bạn để đọc tổng tiền'},
    {command:'giaodich',description:'Xem giao dịch và mã để sửa hoặc xóa'},
    {command:'clear',description:'Dọn tin nhắn bot trong nhóm'},
    {command:'xoa',description:'Xóa giao dịch theo mã'},
    {command:'khoiphuc',description:'Khôi phục giao dịch theo mã'},
    {command:'resettests',description:'Xóa mềm các giao dịch thử nghiệm'},
    {command:'baocaongay',description:'Báo cáo chi tiêu hôm nay'},
    {command:'baocaotuan',description:'Báo cáo chi tiêu tuần'},
    {command:'baocaothang',description:'Báo cáo chi tiêu tháng'},
    {command:'baocaonam',description:'Báo cáo chi tiêu năm'},
    {command:'mine',description:'Chi tiêu của tôi'},
    {command:'whoami',description:'Xem ID nhóm và người dùng'}
  ];
  telegramApi_('setMyCommands',{commands:commands});
  telegramApi_('setMyCommands',{commands:commands,scope:{type:'all_group_chats'}});
  return telegramApi_('getMyCommands',{scope:{type:'all_group_chats'}});
}

