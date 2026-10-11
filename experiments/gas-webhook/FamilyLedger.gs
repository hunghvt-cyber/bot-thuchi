function parseMoneyLocal_(text) {
  var s = String(text || '').toLowerCase().replace(/,/g, '.').trim();
  var m;

  // 1.5tr / 1,5tr / 2.25 triệu
  m = s.match(/(?:^|[^\d.])(\d+)\.(\d+)\s*(?:tr|triệu|củ)(?=$|[^\w])/i);
  if (m) return Math.round(Number(m[1] + '.' + m[2]) * 1000000);

  // 2tr5 = 2.5m; 1tr350 = 1.35m
  m = s.match(/(?:^|[^\d])(\d+)\s*(?:tr|triệu|củ)\s*(\d{1,3})?(?=$|[^\w])/i);
  if (m) {
    var amount = Number(m[1]) * 1000000;
    if (m[2]) amount += Number(m[2]) * Math.pow(10, 6 - m[2].length);
    return amount;
  }

  // 45k / 45 nghìn / 1.5k
  m = s.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*(?:nghìn|ngàn|k)(?=$|[^\w])/i);
  if (m) return Math.round(Number(m[1]) * 1000);

  // Household shorthand: a bare 2-4 digit amount means thousands: 630 => 630,000.
  // Word boundaries allow "cafe 2 đứa 85" to select 85 while ignoring the one-digit headcount.
  m = s.match(/\b(\d{2,4})\b/);
  if (m) return Number(m[1]) * 1000;

  return null;
}
function guessCategoryLocal_(text) {
  var s=String(text).toLowerCase();
  if(/(?:lãi|lai vay|tiền lãi|trả lãi|đóng lãi|lãi suất|vay|mượn|cho vay|trả nợ|thu nợ|gốc vay)/.test(s)) return 'Vay mượn';
  if(/chợ|siêu thị|thực phẩm/.test(s)) return 'Đi chợ';
  if(/cafe|coffee|cà phê|ăn|cơm|phở|bún|mì tôm|mì gói|mì ăn liền|hủ tiếu|bánh mì|nhậu|trà sữa/.test(s)) return 'Ăn uống';
  if(/xăng|grab|taxi|vé xe|gửi xe/.test(s)) return 'Đi lại';
  if(/điện|nước|internet|wifi|điện thoại/.test(s)) return 'Hóa đơn';
  if(/học|sách|học phí/.test(s)) return 'Giáo dục';
  if(/sữa|bỉm|đồ chơi|con\b/.test(s)) return 'Con cái';
  if(/thuốc|khám|bệnh viện|y tế/.test(s)) return 'Sức khỏe';
  return 'Khác';
}
function geminiParse_(text) {
  var key=getGeminiApiKey();
  if(!key) throw new Error('Thiếu GEMINI_API_KEY');
  var prompt='Phân tích tin nhắn giao dịch gia đình Việt Nam. Chỉ trả JSON: {"amount":number,"type":"ChiTieu|ThuNhap","category":"...","description":"..."}. Danh mục: '+FAMILY_CATEGORIES.join(', ')+'. Hiểu 630 thường là 630000 khi là chi tiêu, 2tr5=2500000, 1tr350=1350000. Nếu không phải giao dịch amount=0. Tin nhắn: '+JSON.stringify(String(text));
  var url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(getGeminiModel())+':generateContent?key='+encodeURIComponent(key);
  var payload={contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:'application/json'}};
  var r=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300) throw new Error('Gemini HTTP '+r.getResponseCode()+': '+r.getContentText().slice(0,300));
  var j=JSON.parse(r.getContentText()), raw=j.candidates&&j.candidates[0]&&j.candidates[0].content.parts[0].text;
  return JSON.parse(raw);
}
function parseFamilyTransaction_(text) {
  var amount=parseMoneyLocal_(text);
  if(amount) return {amount:amount,type:/lương|thưởng|thu nhập|nhận tiền|được trả/i.test(text)?'ThuNhap':'ChiTieu',category:guessCategoryLocal_(text),description:String(text).trim()};
  return geminiParse_(text);
}
function telegramDedupeKey_(msg){ return 'telegram:'+String(msg.chat.id)+':'+String(msg.message_id); }
function isDuplicate_(key){
  var sh=familySheet_(), last=sh.getLastRow(); if(last<2) return false;
  return sh.getRange(2,14,last-1,1).getDisplayValues().some(function(r){return r[0]===key;});
}
function appendFamilyTransaction_(msg,tx,alreadyLocked) {
  // Atomic across concurrent webhook invocations. Do not acquire this lock in doPost.
  var lock=LockService.getScriptLock();
  if(!alreadyLocked&&!lock.tryLock(20000))throw new Error('Ledger busy; retry transaction');
  try{
    var sh=familySheet_(),key=telegramDedupeKey_(msg);
    if(isDuplicate_(key))return {duplicate:true};
    var now=new Date(),payer=((msg.from.first_name||'')+' '+(msg.from.last_name||'')).trim()||msg.from.username||String(msg.from.id),id=Utilities.getUuid();
    sh.appendRow([now,Utilities.formatDate(now,'Asia/Ho_Chi_Minh','dd/MM/yyyy'),String(msg.from.id),payer,tx.type||'ChiTieu',tx.category||'Khác',tx.description||msg.text,Number(tx.amount),'VND',String(msg.chat.id),String(msg.message_id),'telegram',id,key,String(msg.text||'')]);
    SpreadsheetApp.flush();
    return {id:id,payer:payer,duplicate:false};
  }finally{if(!alreadyLocked)lock.releaseLock();}
}
function familySummary_(period,payerId){
  var data=familySheet_().getDataRange().getValues(),now=new Date(),total=0,cats={};
  for(var i=1;i<data.length;i++){var d=new Date(data[i][0]);if(isNaN(d.getTime()))continue;
    if(period==='today'&&Utilities.formatDate(d,'Asia/Ho_Chi_Minh','yyyyMMdd')!==Utilities.formatDate(now,'Asia/Ho_Chi_Minh','yyyyMMdd'))continue;
    if(period==='month'&&(d.getMonth()!==now.getMonth()||d.getFullYear()!==now.getFullYear()))continue;
    if(String(data[i][15])==='DELETED')continue;
    if(payerId&&String(data[i][2])!==String(payerId))continue;if(data[i][4]!=='ChiTieu')continue;
    var a=Number(data[i][7])||0;total+=a;cats[data[i][5]]=(cats[data[i][5]]||0)+a;}
  var lines=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]}).map(function(k){return '• '+escapeHtml_(k)+': '+formatVnd_(cats[k]);});
  return '<b>'+(period==='today'?'Hôm nay':'Tháng này')+': '+formatVnd_(total)+'</b>'+(lines.length?'\n'+lines.join('\n'):'\nChưa có chi tiêu.');
}
function formatVnd_(n){return Math.round(Number(n||0)).toLocaleString('vi-VN')+'đ';}
function escapeHtml_(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}


function familyAuditSheet_(){
  var ss=familySpreadsheet_(),sh=ss.getSheetByName('AuditLog')||ss.insertSheet('AuditLog');
  if(!sh.getLastRow())sh.appendRow(['Timestamp','ActorId','TransactionId','Action','Before','After']);
  return sh;
}
function familyFindReplyRow_(msg){
  var ref=msg.reply_to_message;
  if(!ref)return null;
  var sh=familySheet_(),data=sh.getDataRange().getValues();
  for(var i=data.length-1;i>=1;i--){
    if(String(data[i][9])!==String(msg.chat.id))continue;
    if(String(data[i][10])===String(ref.message_id)||String(data[i][16])===String(ref.message_id))
      return {sheet:sh,row:i+1,values:data[i]};
  }
  return null;
}
function familyEditReply_(msg,text){
  var action=String(text).trim(),low=action.toLowerCase();
  var match=low.match(/^sửa\s+(danh mục|tiền|số tiền|nội dung)\s+(.+)$/i);
  var remove=/^(xóa|xoá)$/i.test(action),restore=/^khôi phục$/i.test(action);
  if(!match&&!remove&&!restore)return false;
  var found=familyFindReplyRow_(msg);
  if(!found){sendText(msg.chat.id,'Hãy Reply vào tin nhắn giao dịch của bot hoặc tin nhắn chi tiêu gốc.');return true;}
  var sh=found.sheet,row=found.row,v=found.values;
  if(String(v[2])!==String(msg.from.id)){sendText(msg.chat.id,'Chỉ người tạo giao dịch được sửa hoặc xóa.');return true;}
  var status=String(v[15]||'ACTIVE');
  if(status==='DELETED'&&!restore){sendText(msg.chat.id,'Giao dịch đã xóa. Reply <code>khôi phục</code> để phục hồi.');return true;}
  if(status!=='DELETED'&&restore){sendText(msg.chat.id,'Giao dịch chưa bị xóa.');return true;}
  var before=JSON.stringify({category:v[5],description:v[6],amount:v[7],status:status});
  var label='';
  if(remove){sh.getRange(row,16).setValue('DELETED');label='Đã xóa giao dịch (có thể khôi phục)';}
  else if(restore){sh.getRange(row,16).setValue('ACTIVE');label='Đã khôi phục giao dịch';}
  else if(match){
    var field=match[1],value=action.match(/^sửa\s+(?:danh mục|tiền|số tiền|nội dung)\s+(.+)$/i)[1].trim();
    if(field==='danh mục'){
      var cat=FAMILY_CATEGORIES.filter(function(x){return x.toLowerCase()===value.toLowerCase();})[0];
      if(!cat){sendText(msg.chat.id,'Danh mục không hợp lệ. Chọn: '+FAMILY_CATEGORIES.map(escapeHtml_).join(', '));return true;}
      sh.getRange(row,6).setValue(cat);label='Đã đổi danh mục thành '+cat;
    }else if(field==='tiền'||field==='số tiền'){
      var amount=parseMoneyLocal_(value);
      if(!amount||amount<=0){sendText(msg.chat.id,'Số tiền không hợp lệ. Ví dụ: <code>sửa tiền 15k</code>');return true;}
      sh.getRange(row,8).setValue(amount);label='Đã đổi số tiền thành '+formatVnd_(amount);
    }else{
      sh.getRange(row,7).setValue(value);label='Đã đổi nội dung';
    }
  }
  sh.getRange(row,18).setValue(new Date());
  var after=JSON.stringify({category:sh.getRange(row,6).getValue(),description:sh.getRange(row,7).getValue(),amount:sh.getRange(row,8).getValue(),status:sh.getRange(row,16).getValue()});
  familyAuditSheet_().appendRow([new Date(),String(msg.from.id),String(v[12]),action,before,after]);
  sendText(msg.chat.id,'✓ '+escapeHtml_(label)+'\n#'+escapeHtml_(String(v[12]).slice(0,8)));
  return true;
}
function familyReport_(period){
  var data=familySheet_().getDataRange().getValues(),now=new Date(),total=0,income=0,cats={},payers={},count=0;
  var tz='Asia/Ho_Chi_Minh',today=Utilities.formatDate(now,tz,'yyyy-MM-dd');
  var todayDate=new Date(today+'T00:00:00+07:00');
  var weekday=(todayDate.getDay()+6)%7;
  var weekStart=new Date(todayDate.getTime()-weekday*86400000);
  for(var i=1;i<data.length;i++){
    var r=data[i],d=new Date(r[0]);if(isNaN(d.getTime())||String(r[15])==='DELETED')continue;
    if(period==='day'&&Utilities.formatDate(d,tz,'yyyy-MM-dd')!==today)continue;
    if(period==='week'&&(d<weekStart||d>=new Date(weekStart.getTime()+7*86400000)))continue;
    if(period==='month'&&(d.getFullYear()!==now.getFullYear()||d.getMonth()!==now.getMonth()))continue;
    if(period==='year'&&d.getFullYear()!==now.getFullYear())continue;
    var amount=Number(r[7])||0;
    if(r[4]==='ThuNhap'){income+=amount;continue;}
    if(r[4]!=='ChiTieu')continue;
    count++;total+=amount;
    cats[r[5]]=(cats[r[5]]||0)+amount;
    payers[r[3]]=(payers[r[3]]||0)+amount;
  }
  var labels={day:'BÁO CÁO NGÀY',week:'BÁO CÁO TUẦN',month:'BÁO CÁO THÁNG',year:'BÁO CÁO NĂM'};
  function rank(o){return Object.keys(o).sort(function(a,b){return o[b]-o[a]}).map(function(k){return '• '+escapeHtml_(k)+': '+formatVnd_(o[k]);}).join('\n')||'Chưa có';}
  return '<b>'+labels[period]+'</b>\nChi tiêu: <b>'+formatVnd_(total)+'</b> ('+count+' giao dịch)\nThu nhập: '+formatVnd_(income)+'\nChênh lệch: '+formatVnd_(income-total)+'\n\n<b>Theo danh mục</b>\n'+rank(cats)+'\n\n<b>Theo người chi</b>\n'+rank(payers);
}

/**
 * One-time migration of two identified interest payments.
 * Matches description and exact amount, not category alone; idempotent.
 */
function migrateTwoInterestPayments(){
  var sh=familySheet_(), last=sh.getLastRow();
  if(last<2)throw new Error('Transactions is empty');
  var rows=sh.getRange(2,1,last-1,18).getValues();
  var targets=[
    {amount:3550000,pattern:/lãi\s+vay\s+noxh/i,label:'Lãi vay NOXH'},
    {amount:2400000,pattern:/lãi\s+(?:thẻ\s+)?nam\s*á|nam\s*á.*lãi/i,label:'Lãi thẻ Nam Á'}
  ];
  var changes=[],already=[];
  targets.forEach(function(target){
    var matches=[];
    rows.forEach(function(row,i){
      var description=String(row[6]||'')+' '+String(row[14]||'');
      if(Number(row[7])!==target.amount||!target.pattern.test(description))return;
      if(String(row[4])!=='ChiTieu'||String(row[15])==='DELETED')return;
      if(['Khác','Vay mượn'].indexOf(String(row[5]).trim())<0)return;
      matches.push({row:i+2,category:String(row[5]),description:String(row[6]),amount:row[7]});
    });
    if(matches.length!==1)throw new Error(target.label+': expected exactly 1 match, found '+matches.length+'. No changes made.');
    if(matches[0].category==='Khác')changes.push(matches[0]);
    else already.push(matches[0]);
  });
  console.log('To update: '+JSON.stringify(changes)+'; already migrated: '+JSON.stringify(already));
  changes.forEach(function(item){sh.getRange(item.row,6).setValue('Vay mượn');});
  SpreadsheetApp.flush();
  console.log('Updated '+changes.length+' interest payments to Vay mượn; '+already.length+' already correct.');
}

