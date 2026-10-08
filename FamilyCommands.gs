
function familyAdmin_(msg){
  if(msg.chat.type==='private')return false;
  var member=telegramApi_('getChatMember',{chat_id:String(msg.chat.id),user_id:msg.from.id}).result;
  return member&&(member.status==='creator'||member.status==='administrator');
}
function familyTxnById_(chatId,id){
  var sh=familySheet_(),rows=sh.getDataRange().getValues(),needle=String(id||'').replace(/^#/,'').toLowerCase(),found=null;
  if(needle.length<6)return null;
  for(var i=1;i<rows.length;i++){
    if(String(rows[i][9])!==String(chatId))continue;
    if(String(rows[i][12]).toLowerCase().indexOf(needle)===0){
      if(found)return {ambiguous:true};
      found={sheet:sh,row:i+1,values:rows[i]};
    }
  }
  return found;
}
function familyListTransactions_(msg){
  var rows=familySheet_().getDataRange().getValues(),items=[];
  for(var i=rows.length-1;i>=1&&items.length<12;i--){
    var r=rows[i];
    if(String(r[9])!==String(msg.chat.id))continue;
    if(String(r[2])!==String(msg.from.id)&&!familyAdmin_(msg))continue;
    items.push((String(r[15])==='DELETED'?'[ĐÃ XÓA] ':'')+'<code>#'+escapeHtml_(String(r[12]).slice(0,8))+'</code> · '+formatVnd_(r[7])+' · '+escapeHtml_(String(r[5]))+' · '+escapeHtml_(String(r[6]).slice(0,45)));
  }
  sendText(msg.chat.id,'<b>12 giao dịch gần nhất</b>\n'+(items.join('\n')||'Chưa có giao dịch.')+'\n\nXóa: <code>/xoa #mã</code>\nKhôi phục: <code>/khoiphuc #mã</code>\nSửa: <code>/suatien #mã 15k</code> hoặc <code>/suadanhmuc #mã Ăn uống</code>');
}
function familyEditById_(msg,cmd,text){
  var parts=text.match(/^\/\S+\s+(#?[a-f0-9-]{6,36})(?:\s+([\s\S]+))?$/i);
  if(!parts){sendText(msg.chat.id,'Sai cú pháp. Gửi /giaodich để xem mã và ví dụ.');return;}
  var found=familyTxnById_(msg.chat.id,parts[1]);
  if(!found||found.ambiguous){sendText(msg.chat.id,'Không tìm thấy mã giao dịch duy nhất. Gửi /giaodich để xem mã.');return;}
  var r=found.values,sh=found.sheet,row=found.row,actor=String(msg.from.id);
  if(String(r[2])!==actor&&!familyAdmin_(msg)){sendText(msg.chat.id,'Chỉ người tạo giao dịch hoặc quản trị viên được thao tác.');return;}
  var status=String(r[15]||'ACTIVE'),before=JSON.stringify({category:r[5],description:r[6],amount:r[7],status:status});
  var value=String(parts[2]||'').trim(),label='';
  if(cmd==='/xoa'){
    if(status==='DELETED'){sendText(msg.chat.id,'Giao dịch đã xóa. Dùng /khoiphuc #mã.');return;}
    sh.getRange(row,16).setValue('DELETED');label='Đã xóa';
  }else if(cmd==='/khoiphuc'){
    if(status!=='DELETED'){sendText(msg.chat.id,'Giao dịch đang hoạt động.');return;}
    sh.getRange(row,16).setValue('ACTIVE');label='Đã khôi phục';
  }else{
    if(status==='DELETED'){sendText(msg.chat.id,'Hãy khôi phục giao dịch trước khi sửa.');return;}
    if(!value){sendText(msg.chat.id,'Thiếu giá trị mới. Gửi /help để xem ví dụ.');return;}
    if(cmd==='/suatien'){
      var amount=parseMoneyLocal_(value);
      if(!amount||amount<=0){sendText(msg.chat.id,'Số tiền không hợp lệ.');return;}
      sh.getRange(row,8).setValue(amount);label='Đã sửa tiền: '+formatVnd_(amount);
    }else if(cmd==='/suadanhmuc'){
      var category=FAMILY_CATEGORIES.filter(function(c){return c.toLowerCase()===value.toLowerCase();})[0];
      if(!category){sendText(msg.chat.id,'Danh mục hợp lệ: '+FAMILY_CATEGORIES.map(escapeHtml_).join(', '));return;}
      sh.getRange(row,6).setValue(category);label='Đã sửa danh mục: '+category;
    }else if(cmd==='/suanoidung'){
      sh.getRange(row,7).setValue(value);label='Đã sửa nội dung';
    }
  }
  sh.getRange(row,18).setValue(new Date());
  var after=JSON.stringify({category:sh.getRange(row,6).getValue(),description:sh.getRange(row,7).getValue(),amount:sh.getRange(row,8).getValue(),status:sh.getRange(row,16).getValue()});
  familyAuditSheet_().appendRow([new Date(),actor,String(r[12]),text,before,after]);
  sendText(msg.chat.id,'✓ '+escapeHtml_(label)+' <code>#'+escapeHtml_(String(r[12]).slice(0,8))+'</code>');
}
function familyClearMessages_(msg){
  if(!familyAdmin_(msg)){sendText(msg.chat.id,'Chỉ quản trị viên nhóm được dùng /clear.');return;}
  var chatId=String(msg.chat.id),rows=familySheet_().getDataRange().getValues(),ids={},count=0,failed=0;
  // Telegram only allows deletion of most messages younger than 48 hours.
  var cutoff=Date.now()-47*60*60*1000;
  for(var i=1;i<rows.length;i++){
    var r=rows[i],date=new Date(r[0]);
    if(String(r[9])===chatId&&r[16]&&date.getTime()>=cutoff)ids[String(r[16])]=true;
  }
  var stored=PropertiesService.getScriptProperties().getProperty('BOT_MSG_IDS_'+chatId);
  if(stored){try{JSON.parse(stored).forEach(function(x){if(x.time>=cutoff)ids[String(x.id)]=true;});}catch(ignore){}}
  var keys=Object.keys(ids).slice(-150);
  keys.forEach(function(id){
    try{telegramApi_('deleteMessage',{chat_id:chatId,message_id:Number(id)});count++;}
    catch(e){failed++;Logger.log('deleteMessage '+id+': '+e);}
  });
  try{telegramApi_('deleteMessage',{chat_id:chatId,message_id:msg.message_id});}catch(ignore){}
  PropertiesService.getScriptProperties().deleteProperty('BOT_MSG_IDS_'+chatId);
  sendText(chatId,'Đã dọn '+count+' tin nhắn bot. '+(failed?'Không xóa được '+failed+' tin (quá 48 giờ hoặc thiếu quyền). ':'')+'Giao dịch trong Sheets không bị ảnh hưởng. Dùng /giaodich để xem mã giao dịch.');
}
function familyResetTests_(msg,text){
  if(!familyAdmin_(msg)){sendText(msg.chat.id,'Chỉ quản trị viên nhóm được xóa dữ liệu thử nghiệm.');return;}
  var props=PropertiesService.getScriptProperties(),key='RESET_TESTS_'+msg.chat.id+'_'+msg.from.id;
  var sh=familySheet_(),rows=sh.getDataRange().getValues(),n=0;
  for(var i=1;i<rows.length;i++)if(String(rows[i][9])===String(msg.chat.id)&&String(rows[i][15])!=='DELETED')n++;
  if(text.trim()==='/resettests'){
    props.setProperty(key,JSON.stringify({expires:Date.now()+300000,maxRow:rows.length}));
    sendText(msg.chat.id,'Có '+n+' giao dịch đang hoạt động trong nhóm. Để xóa mềm các giao dịch cũ, gửi <code>/resettests XACNHAN</code> trong 5 phút. Hành động này KHÔNG xóa tin nhắn Telegram; có thể khôi phục từng giao dịch bằng mã.');
    return;
  }
  var state;try{state=JSON.parse(props.getProperty(key)||'null');}catch(e){}
  props.deleteProperty(key);
  if(!state||Date.now()>state.expires){sendText(msg.chat.id,'Yêu cầu xác nhận hết hạn. Gửi /resettests trước.');return;}
  var changed=0,log=familyAuditSheet_();
  for(var j=2;j<=Math.min(state.maxRow,sh.getLastRow());j++){
    var row=sh.getRange(j,1,1,18).getValues()[0];
    if(String(row[9])!==String(msg.chat.id)||String(row[15])==='DELETED')continue;
    sh.getRange(j,16).setValue('DELETED');
    sh.getRange(j,18).setValue(new Date());
    log.appendRow([new Date(),String(msg.from.id),String(row[12]),'resettests',JSON.stringify({status:row[15]||'ACTIVE'}),JSON.stringify({status:'DELETED'})]);
    changed++;
  }
  sendText(msg.chat.id,'Đã loại '+changed+' giao dịch thử nghiệm khỏi báo cáo. Dữ liệu được giữ để khôi phục khi cần.');
}
function familyRememberBotMessage_(chatId,messageId){
  if(!messageId)return;
  var props=PropertiesService.getScriptProperties(),key='BOT_MSG_IDS_'+chatId,items=[];
  try{items=JSON.parse(props.getProperty(key)||'[]');}catch(ignore){}
  var cutoff=Date.now()-47*60*60*1000;
  items=items.filter(function(x){return x.time>=cutoff;}).slice(-140);
  items.push({id:messageId,time:Date.now()});
  props.setProperty(key,JSON.stringify(items));
}
