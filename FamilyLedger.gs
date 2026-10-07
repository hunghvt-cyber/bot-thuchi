function parseMoneyLocal_(text) {
  var s=String(text||'').toLowerCase().replace(/,/g,'.');
  var re=/(\d+(?:\.\d+)?)\s*(triệu|tr|củ|nghìn|ngàn|k)\b/i, m=s.match(re);
  if (!m) return null;
  var n=parseFloat(m[1]), u=m[2];
  if (u==='triệu'||u==='tr'||u==='củ') n*=1000000; else n*=1000;
  return Math.round(n);
}

function guessCategoryLocal_(text) {
  var s=String(text).toLowerCase();
  if (/chợ|siêu thị|thực phẩm/.test(s)) return 'Đi chợ';
  if (/cafe|cà phê|ăn |cơm|phở|bún|nhậu|trà sữa/.test(s)) return 'Ăn uống';
  if (/xăng|grab|taxi|vé xe|gửi xe/.test(s)) return 'Đi lại';
  if (/điện|nước|internet|wifi|điện thoại/.test(s)) return 'Hóa đơn';
  if (/học|sách|học phí/.test(s)) return 'Giáo dục';
  if (/sữa|bỉm|đồ chơi|con /.test(s)) return 'Con cái';
  return 'Khác';
}

function parseExpenseWithGemini_(text) {
  var prompt='Bạn là bộ phân tích giao dịch gia đình Việt Nam. Trả JSON duy nhất với schema: amount(number), type("ChiTieu" hoặc "ThuNhap"), category, description. Danh mục hợp lệ: '+FAMILY_CATEGORIES.join(', ')+'. Hiểu k/nghìn/ngàn, tr/triệu/củ. Nếu không phải giao dịch hoặc không có số tiền rõ ràng, amount=0. Tin nhắn: '+JSON.stringify(String(text));
  var url=geminiApiUrl_('/v1beta/models/'+familyGeminiModel_()+':generateContent');
  var payload={contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:'application/json'}};
  var r=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',headers:geminiApiHeaders_(),payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300) throw new Error('Gemini HTTP '+r.getResponseCode()+': '+r.getContentText().slice(0,300));
  var j=JSON.parse(r.getContentText());
  return JSON.parse(j.candidates[0].content.parts[0].text);
}

function parseFamilyTransaction_(text) {
  var amount=parseMoneyLocal_(text);
  if(amount) return {amount:amount,type:/lương|thưởng|thu nhập|nhận tiền/i.test(text)?'ThuNhap':'ChiTieu',category:guessCategoryLocal_(text),description:String(text).trim()};
  return parseExpenseWithGemini_(text);
}

function appendFamilyTransaction_(msg, tx) {
  var sh=familySheet_(), now=new Date(), payer=((msg.from.first_name||'')+' '+(msg.from.last_name||'')).trim()||msg.from.username||String(msg.from.id);
  var id=Utilities.getUuid();
  sh.appendRow([now,Utilities.formatDate(now,'Asia/Ho_Chi_Minh','dd/MM/yyyy'),String(msg.from.id),payer,tx.type||'ChiTieu',tx.category||'Khác',tx.description||msg.text,Number(tx.amount), 'VND',String(msg.chat.id),String(msg.message_id),'telegram',id]);
  return {id:id,payer:payer};
}

function familySummary_(period, payerId) {
  var sh=familySheet_(), data=sh.getDataRange().getValues(), now=new Date(), total=0, cats={};
  for(var i=1;i<data.length;i++){
    var d=new Date(data[i][0]); if(isNaN(d.getTime())) continue;
    if(period==='today' && Utilities.formatDate(d,'Asia/Ho_Chi_Minh','yyyyMMdd')!==Utilities.formatDate(now,'Asia/Ho_Chi_Minh','yyyyMMdd')) continue;
    if(period==='month' && (d.getMonth()!==now.getMonth()||d.getFullYear()!==now.getFullYear())) continue;
    if(payerId && String(data[i][2])!==String(payerId)) continue;
    if(data[i][4]!=='ChiTieu') continue;
    var a=Number(data[i][7])||0; total+=a; cats[data[i][5]]=(cats[data[i][5]]||0)+a;
  }
  var lines=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]}).map(function(k){return '• '+k+': '+formatVnd_(cats[k]);});
  return '<b>'+ (period==='today'?'Hôm nay':'Tháng này') +': '+formatVnd_(total)+'</b>'+(lines.length?'\n'+lines.join('\n'):'\nChưa có chi tiêu.');
}

function formatVnd_(n){return Number(n||0).toLocaleString('vi-VN')+'đ';}
