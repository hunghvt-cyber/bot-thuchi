function parseMoneyLocal_(text) {
  var s=String(text||'').toLowerCase().replace(/,/g,'.');
  var m=s.match(/(\d+)\s*(?:tr|triệu|củ)\s*(\d{1,3})?(?!\w)/i);
  if(m) return Number(m[1])*1000000+(m[2]?Number(m[2])*Math.pow(10,6-m[2].length):0);
  m=s.match(/(\d+(?:\.\d+)?)\s*(nghìn|ngàn|k)\b/i);
  if(m) return Math.round(parseFloat(m[1])*1000);
  m=s.match(/(?:^|\s)(\d{2,4})(?:\s|$)/);
  if(m) return Number(m[1])<10000 ? Number(m[1])*1000 : Number(m[1]);
  return null;
}
function guessCategoryLocal_(text) {
  var s=String(text).toLowerCase();
  if(/chợ|siêu thị|thực phẩm/.test(s)) return 'Đi chợ';
  if(/cafe|coffee|cà phê|ăn|cơm|phở|bún|nhậu|trà sữa/.test(s)) return 'Ăn uống';
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
function appendFamilyTransaction_(msg,tx) {
  var sh=familySheet_(), key=telegramDedupeKey_(msg);
  if(isDuplicate_(key)) return {duplicate:true};
  var now=new Date(), payer=((msg.from.first_name||'')+' '+(msg.from.last_name||'')).trim()||msg.from.username||String(msg.from.id), id=Utilities.getUuid();
  sh.appendRow([now,Utilities.formatDate(now,'Asia/Ho_Chi_Minh','dd/MM/yyyy'),String(msg.from.id),payer,tx.type||'ChiTieu',tx.category||'Khác',tx.description||msg.text,Number(tx.amount),'VND',String(msg.chat.id),String(msg.message_id),'telegram',id,key,String(msg.text||'')]);
  return {id:id,payer:payer,duplicate:false};
}
function familySummary_(period,payerId){
  var data=familySheet_().getDataRange().getValues(),now=new Date(),total=0,cats={};
  for(var i=1;i<data.length;i++){var d=new Date(data[i][0]);if(isNaN(d.getTime()))continue;
    if(period==='today'&&Utilities.formatDate(d,'Asia/Ho_Chi_Minh','yyyyMMdd')!==Utilities.formatDate(now,'Asia/Ho_Chi_Minh','yyyyMMdd'))continue;
    if(period==='month'&&(d.getMonth()!==now.getMonth()||d.getFullYear()!==now.getFullYear()))continue;
    if(payerId&&String(data[i][2])!==String(payerId))continue;if(data[i][4]!=='ChiTieu')continue;
    var a=Number(data[i][7])||0;total+=a;cats[data[i][5]]=(cats[data[i][5]]||0)+a;}
  var lines=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]}).map(function(k){return '• '+escapeHtml_(k)+': '+formatVnd_(cats[k]);});
  return '<b>'+(period==='today'?'Hôm nay':'Tháng này')+': '+formatVnd_(total)+'</b>'+(lines.length?'\n'+lines.join('\n'):'\nChưa có chi tiêu.');
}
function formatVnd_(n){return Math.round(Number(n||0)).toLocaleString('vi-VN')+'đ';}
function escapeHtml_(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
