/** Client-side copy buttons; only the submitted command reaches GAS. */
function bankCopyKeyboard_(state){
  var ref='#b'+state.id;
  function copy(label,command){return {text:label,copy_text:{text:command+' '+ref+' '}};}
  var rows=[[copy('Sửa tiền','/suatien'),copy('Nội dung','/suanoidung')],
    [copy('Danh mục','/suadanhmuc'),copy('Thu / Chi','/sualoai')]];
  if(!state.recorded)rows.push([{text:'Duyệt',callback_data:'bank:approve:'+state.id},{text:'Xóa nháp',callback_data:'bank:delete:'+state.id}]);
  return {inline_keyboard:rows};
}
function bankApplyCorrection_(tx,field,value){
  value=String(value||'').trim();if(!value)return 'Thiếu giá trị mới.';
  if(field==='suatien'){
    var plain=value.toLowerCase().replace(/\s*(?:vnd|đ|₫)$/iu,'').trim();
    var amount=/^\d+$/.test(plain)?Number(plain):/^\d{1,3}(?:[.,]\d{3})+$/.test(plain)?bankMoney_(plain,plain.indexOf(',')>=0?',':'.'):/^\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|tr|triệu|củ)(?:\d{1,3})?$/u.test(plain)?parseMoneyLocal_(plain):null;
    if(!Number.isSafeInteger(amount)||amount<=0||amount>1e12)return 'Số tiền không hợp lệ. Ví dụ: 50k hoặc 50.000.';tx.amount=amount;
  }else if(field==='suanoidung'){
    if(value.length>400)return 'Nội dung tối đa 400 ký tự.';tx.description=value;
  }else if(field==='suadanhmuc'){
    var cat=FAMILY_CATEGORIES.filter(function(c){return c.toLowerCase()===value.toLowerCase();})[0];
    if(!cat)return 'Chọn danh mục: '+FAMILY_CATEGORIES.join(' / ');tx.category=cat;
  }else if(field==='sualoai'){
    if(!/^(thu|chi)$/iu.test(value))return 'Nhập Thu hoặc Chi.';tx.direction=/^thu$/iu.test(value)?'Thu':'Chi';
  }else return 'Lệnh không hợp lệ.';
  return '';
}
function handleBankCopyCommand_(msg){
  var text=String(msg&&msg.text||'').trim(),m=text.match(/^\/(suatien|suanoidung|suadanhmuc|sualoai)(?:@PoormanTest0219_bot)?\s+#b([a-f0-9]{12})(?:\s+([^]+))?$/i);
  var refresh=/^\/bankbuttons(?:@PoormanTest0219_bot)?$/i.test(text);
  if(!m&&!refresh)return false;
  var p=PropertiesService.getScriptProperties(),owner=p.getProperty('BANK_RELAY_OWNER_ID'),group=p.getProperty('FAMILY_GROUP_ID');
  function note(t){telegramApi_('sendMessage',{chat_id:String(msg.chat.id),reply_to_message_id:msg.message_id,text:t});}
  // Reserved bank references are always consumed, including failures: never natural-language ledger intake.
  if(String(msg.from&&msg.from.id)!==owner||String(msg.chat&&msg.chat.id)!==group)return true;
  var key,state;
  try{
    var all=p.getProperties();
    if(refresh){
      var recent=Object.keys(all).filter(function(k){return /^BANK_EVT_/.test(k);}).map(function(k){try{return JSON.parse(all[k]);}catch(ignore){return null;}}).filter(function(s){return s&&s.tx&&s.message_id&&!s.deleted&&s.group===group&&s.owner===owner&&bankLogExpires_(s)>Date.now()&&(s.recorded||s.expires>Date.now());}).sort(function(a,b){return b.created-a.created;})[0];
      if(!recent){note('Chưa có tin ngân hàng còn hạn để đổi nút.');return true;}
      try{telegramApi_('editMessageReplyMarkup',{chat_id:group,message_id:recent.message_id,reply_markup:bankCopyKeyboard_(recent)});}catch(err){if(!/message is not modified/i.test(String(err.message||'')))throw err;}
      telegramApi_('sendMessage',{chat_id:group,reply_to_message_id:recent.message_id,text:'Đã đổi sang nút sao chép: Bấm → Dán → nhập giá trị → Gửi.'});return true;
    }
    var matches=Object.keys(all).filter(function(k){if(!/^BANK_EVT_/.test(k))return false;try{var s=JSON.parse(all[k]);return s.id===m[2].toLowerCase()&&s.owner===owner&&s.group===group;}catch(ignore){return false;}});
    if(matches.length!==1){note('Không tìm thấy mã ngân hàng duy nhất; nháp/log có thể đã hết hạn.');return true;}
    key=matches[0];state=JSON.parse(all[key]);
    if(bankLogExpires_(state)<=Date.now()){note('Mã ngân hàng đã hết hạn 7 ngày. Dùng mã giao dịch trong /giaodich để sửa sổ.');return true;}
    var field=m[1].toLowerCase(),value=String(m[3]||'').trim();
    if(!value){note('Thêm giá trị sau lệnh rồi gửi. Ví dụ: /'+field+' #b'+state.id+' '+({suatien:'50k',suanoidung:'Mua đồ ăn',suadanhmuc:'Đi chợ',sualoai:'Chi'}[field])+(field==='suadanhmuc'?'\n'+FAMILY_CATEGORIES.join(' / '):''));return true;}
    if(!state.recorded){
      var names={suatien:'tiền',suanoidung:'nội dung',suadanhmuc:'danh mục',sualoai:'loại'};
      return handleBankDraftReply_({message_id:msg.message_id,chat:msg.chat,from:msg.from,text:'sửa '+names[field]+' '+value,
        reply_to_message:{message_id:state.message_id,text:bankDraftText_(state)}});
    }
    // Already booked: change the existing row, never append another transaction.
    var result=bankLock_(function(){
      var cfg=bankConfig_();state=JSON.parse(p.getProperty(key)||'null');
      if(!state||!state.recorded||state.owner!==cfg.owner||state.group!==cfg.group||bankLogExpires_(state)<=Date.now())return 'Giao dịch không còn khả dụng.';
      if((state.command_ids||[]).concat(state.edit_ids||[]).indexOf(String(msg.message_id))>=0)return 'duplicate';
      var previousEdit=Math.max.apply(null,(state.edit_ids||[]).map(Number).concat([0]));if(Number(msg.message_id)<=previousEdit)return 'duplicate';
      if(state.last_command_id&&Number(msg.message_id)<=state.last_command_id)return 'duplicate';
      var sh=familySheet_(),last=sh.getLastRow(),rows=last>1?sh.getRange(2,1,last-1,18).getValues():[],found,index;
      for(var i=0;i<rows.length;i++)if(String(rows[i][12])===state.ledger_id&&String(rows[i][9])===group&&String(rows[i][2])===owner){if(found)return 'Mã giao dịch không duy nhất.';found=rows[i];index=i+2;}
      if(!found)return 'Không tìm thấy giao dịch trong sổ.';
      if(String(found[15])==='DELETED')return 'Giao dịch đã xóa; khôi phục trước khi sửa.';
      var tx={source:state.tx.source,amount:Number(found[7]),direction:found[4]==='ThuNhap'?'Thu':'Chi',category:String(found[5]),description:String(found[6])};
      var before=bankLearnSnapshot_(tx),error=bankApplyCorrection_(tx,field,value);if(error)return error;
      var column={suatien:8,suanoidung:7,suadanhmuc:6,sualoai:5}[field],newValue={suatien:tx.amount,suanoidung:bankCell_(tx.description),suadanhmuc:tx.category,sualoai:tx.direction==='Thu'?'ThuNhap':'ChiTieu'}[field];
      if(String(found[column-1])!==String(newValue)){
        sh.getRange(index,column).setValue(newValue);sh.getRange(index,18).setValue(new Date());SpreadsheetApp.flush();
        familyAuditSheet_().appendRow([new Date(),owner,state.ledger_id,'bank_copy_'+field,JSON.stringify(before),JSON.stringify(bankLearnSnapshot_(tx))]);
      }
      bankLearnChange_(Object.assign(state,{tx:Object.assign(state.tx,tx)}),before,'ledger_command');
      state.command_ids=(state.command_ids||[]).concat(String(msg.message_id)).slice(-20);state.last_command_id=Number(msg.message_id);bankLearnFit_(state);p.setProperty(key,JSON.stringify(state));return '';
    });
    if(result==='duplicate')return true;
    if(result){note(result);return true;}
    var sent=telegramApi_('sendMessage',{chat_id:group,reply_to_message_id:msg.message_id,text:bankApprovedText_(state,'✅ Đã cập nhật Sheets'),reply_markup:bankCopyKeyboard_(state)});
    if(sent.result&&sent.result.message_id)try{bankBindConfirmation_(state,sent.result.message_id);}catch(err){bankLearnStoredError_(key,'copy_confirmation_binding',err);}
    try{telegramApi_('editMessageText',{chat_id:group,message_id:state.message_id,text:bankApprovedText_(state),reply_markup:bankCopyKeyboard_(state)});}catch(err){if(!/message is not modified/i.test(String(err.message||'')))bankLearnStoredError_(key,'copy_confirmation_refresh',err);}
  }catch(err){if(key)bankLearnStoredError_(key,'copy_command',err);try{note('Chưa xác minh hoàn tất lệnh sửa. Kiểm tra sổ trước khi thử lại; lệnh sửa không tạo thêm giao dịch.');}catch(ignore){}}
  return true;
}
