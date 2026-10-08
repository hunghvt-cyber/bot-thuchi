function isFamilyGroupAllowed_(chatId){var x=familyGroupId_();return !x||String(x)===String(chatId);}
function handleFamilyMessage_(msg){
  var chatId=msg.chat.id,text=String(msg.text||'').trim();if(!text)return true;
  if(!isFamilyGroupAllowed_(chatId)){
    if(text.charAt(0)==='/'||/^\s*(xóa|xoá|khôi phục|sửa\s)/i.test(text))sendText(chatId,'Bot đang khóa với một nhóm Telegram khác. Dùng /whoami trong nhóm đã đăng ký hoặc kiểm tra FAMILY_GROUP_ID trong Apps Script.');
    return true;
  }
  try{familyRememberUserMessage_(msg);}catch(trackError){Logger.log('User message tracking: '+trackError);}
  var cmd=text.split(/\s+/)[0].split('@')[0].toLowerCase();
  if(cmd==='/start'||cmd==='/help'){
    sendText(chatId,
      '<b>HƯỚNG DẪN BOT CHI TIÊU GIA ĐÌNH</b>\n\n'+
      '<b>1. Ghi giao dịch</b>\n'+
      '• <code>mì tôm 10k</code>\n'+
      '• <code>đi chợ 630</code> (630.000đ)\n'+
      '• <code>học phí 2tr5</code> (2.500.000đ)\n\n'+
      '<b>2. Báo cáo</b>\n'+
      '• /baocaongay — hôm nay\n'+
      '• /baocaotuan — tuần này\n'+
      '• /baocaothang — tháng này\n'+
      '• /baocaonam — năm nay\n'+
      '• /mine — chi tiêu của tôi trong tháng\n'+
      '• /giaodich — xem giao dịch và mã\n\n'+
      '<b>3. Sửa hoặc xóa</b>\n'+
      'Nhấn Reply vào tin nhắn xác nhận của bot (hoặc tin nhắn chi tiêu gốc), rồi gửi:\n'+
      '• <code>sửa danh mục Ăn uống</code>\n'+
      '• <code>sửa tiền 15k</code>\n'+
      '• <code>sửa nội dung Mì tôm Hảo Hảo</code>\n'+
      '• <code>xóa</code> — xóa mềm, không mất dữ liệu\n'+
      '• <code>khôi phục</code> — khôi phục giao dịch đã xóa\n'+
      'Không cần Reply: <code>/xoa #mã</code>, <code>/khoiphuc #mã</code>, <code>/suatien #mã 15k</code>, <code>/suadanhmuc #mã Ăn uống</code>, <code>/suanoidung #mã nội dung mới</code>. Lấy mã bằng /giaodich.\n\n'+
      '<b>4. Dọn dẹp</b>\n'+
      '• /clear — quản trị viên xóa tin nhắn bot và thành viên mà bot đã ghi nhận (thường trong 48 giờ), không xóa giao dịch.\n'+
      '• /resettests — quản trị viên xóa mềm toàn bộ giao dịch cũ sau xác nhận.\n\n'+
      '<b>5. Lưu ý</b>\n'+
      '• Chỉ người tạo giao dịch được sửa, xóa hoặc khôi phục.\n'+
      '• Giao dịch đã xóa không tính vào báo cáo.\n'+
      '• Có thể Reply lại tin nhắn xác nhận cũ để khôi phục.\n'+
      '• /whoami — xem ID người dùng và nhóm.\n'+
      '• /help — xem hướng dẫn này.'
    );return true;}
  if(cmd==='/giaodich'){familyListTransactions_(msg);return true;}
  if(cmd==='/clear'){familyClearMessages_(msg);return true;}
  if(cmd==='/resettests'){familyResetTests_(msg,text);return true;}
  if(['/xoa','/khoiphuc','/suatien','/suadanhmuc','/suanoidung'].indexOf(cmd)>=0){familyEditById_(msg,cmd,text);return true;}
  if(cmd==='/whoami'){if(!familyGroupId_()&&(msg.chat.type==='group'||msg.chat.type==='supergroup'))setFamilyGroupId_(chatId);sendText(chatId,'User ID: <code>'+msg.from.id+'</code>\nGroup ID: <code>'+chatId+'</code>\nFamily group: <b>'+((String(familyGroupId_())===String(chatId))?'BOUND':'NOT BOUND')+'</b>');return true;}
  if(cmd==='/baocaongay'||cmd==='/baocaotuan'||cmd==='/baocaothang'||cmd==='/baocaonam'){var p={'/baocaongay':'day','/baocaotuan':'week','/baocaothang':'month','/baocaonam':'year'};sendText(chatId,familyReport_(p[cmd]));return true;}
  if(msg.reply_to_message&&familyEditReply_(msg,text))return true;
  if(cmd==='/today'){sendText(chatId,familySummary_('today'));return true;}
  if(cmd==='/month'){sendText(chatId,familySummary_('month'));return true;}
  if(cmd==='/mine'){sendText(chatId,familySummary_('month',msg.from.id));return true;}
  if(text.charAt(0)==='/')return true;
  try{var tx=parseFamilyTransaction_(text);if(!tx||!Number(tx.amount))return true;var saved=appendFamilyTransaction_(msg,tx);if(saved.duplicate)return true;
    var sent=sendText(chatId,'✓ <b>'+formatVnd_(tx.amount)+'</b> · '+escapeHtml_(tx.category||'Khác')+' · '+escapeHtml_(saved.payer)+'\n'+escapeHtml_(tx.description||text)+'\nMã GD: <code>#'+escapeHtml_(String(saved.id).slice(0,8))+'</code>');
    if(sent&&sent.result&&sent.result.message_id){var sh=familySheet_(),data=sh.getRange(2,13,sh.getLastRow()-1,1).getValues();for(var i=data.length-1;i>=0;i--){if(String(data[i][0])===String(saved.id)){sh.getRange(i+2,17).setValue(String(sent.result.message_id));break;}}}
    return true;
  }catch(e){Logger.log(e.stack||e);sendText(chatId,'Không xử lý được. Thử: <code>đi chợ 450k</code>');return true;}
}
function doPost(e){
  try{var u=JSON.parse(e.postData.contents);if(u.message)handleFamilyMessage_(u.message);if(u.callback_query)familyResetCallback_(u.callback_query);return ContentService.createTextOutput('ok');}
  catch(err){Logger.log(err.stack||err);try{var msg=u&&u.message;if(msg&&msg.chat&&msg.chat.id)sendText(msg.chat.id,'Lỗi xử lý: '+escapeHtml_(String(err.message||err).slice(0,180)));}catch(ignore){}return ContentService.createTextOutput('error');}
}

function doGet(e){
  try{
    if(e&&e.parameter&&e.parameter.diagnostic==='1'){
      var info=getWebhookInfo().result||{};
      return ContentService.createTextOutput(JSON.stringify({ok:true,mode:info.url?'webhook':'polling',pending:info.pending_update_count||0,lastError:info.last_error_message||'',groupConfigured:!!familyGroupId_(),pollTriggers:ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='pollFamilyTelegram_';}).length,commands:registerFamilyCommands_().result.length,lastPollStart:PropertiesService.getScriptProperties().getProperty('POLL_LAST_START')||'',lastPollSuccess:PropertiesService.getScriptProperties().getProperty('POLL_LAST_SUCCESS')||'',lastPollError:PropertiesService.getScriptProperties().getProperty('POLL_LAST_ERROR')||'',lastBatchSize:PropertiesService.getScriptProperties().getProperty('POLL_LAST_BATCH_SIZE')||''})).setMimeType(ContentService.MimeType.JSON);
    }
    if(e&&e.parameter&&e.parameter.bootstrap==='1'){
      var r=setupFamilyBot();
      return ContentService.createTextOutput(JSON.stringify({ok:true,webApp:getWebAppUrl(),telegram:r&&r.ok===true,mode:r&&r.mode||'',pollIntervalMinutes:r&&r.pollIntervalMinutes||0})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput('Poorman Telebot: OK');
  }catch(err){
    Logger.log(err.stack||err);
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err.message||err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
