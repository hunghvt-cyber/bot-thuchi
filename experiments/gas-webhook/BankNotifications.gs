/** Pure parser. Only these packages may enter the bank relay. No Sheets/Gemini. */
var BANK_PACKAGES_={'com.vnpay.bidv':'BIDV','com.vib.myvib2':'VIB','com.bachhoaxanh':'BHX','com.VCB':'VCB','com.mbmobile':'MB'};
function bankDate_(value){
  var m=String(value).match(/^(?:(\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{4})|(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2}))$/);
  if(!m)return null;
  var d=m[3]||m[6],mo=m[4]||m[7],y=m[5]||m[8],h=m[1]||m[9],mi=m[2]||m[10],s=m[11]||'00';
  var iso=y+'-'+mo+'-'+d+'T'+h+':'+mi+':'+s+'+07:00',dt=new Date(iso);
  if(!isFinite(dt.getTime())||new Date(dt.getTime()+7*3600000).toISOString().slice(0,19)!==iso.slice(0,19))return null;
  return {text:value,iso:iso,precision:m[11]?'second':'minute'};
}
function bankMoney_(value,separator){
  var s=String(value),sep=separator||',';
  var pattern=sep===','?/^(?:[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/:/^(?:[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)$/;
  if(!pattern.test(s))return null;
  var n=Number(s.split(sep).join(''));return Number.isSafeInteger(n)&&n>0&&n<=1000000000000?n:null;
}
function bankParse_(event){
  var source=BANK_PACKAGES_[event.package_name];
  if(!source)return {status:'ignored',reason:'unsupported_package'};
  var title=String(event.title||'').trim(),body=String(event.text||event.big_text||'').replace(/\r\n/g,'\n').trim(),m,tx;
  function result(direction,amount,date,account,description,reference,category){
    var time=date?bankDate_(date):null;
    if(!amount||(date&&!time))return {status:'review',reason:'invalid_amount_or_time',source:source};
    return {status:'recognized',source:source,direction:direction,amount:amount,currency:'VND',
      account_suffix:String(account||'').replace(/\D/g,'').slice(-4),description:description||direction,
      reference:String(reference||'').trim().slice(0,128),category:category||'Khác',
      transaction_time:time?time.text:'',transaction_iso:time?time.iso:'',time_precision:time?time.precision:'receipt_only'};
  }
  if(source==='VCB'&&title==='Thông báo VCB'){
    // VCB calls the whole alert “Số dư TK”, but the first SIGNED amount is the transaction.
    m=body.match(/^Số dư TK VCB\s+(\d+)\s+([+-])([\d,]+)\s*VND\s+lúc\s+(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}:\d{2})\.\s*Số dư\s+[\d,]+\s*VND\.\s*Ref\s+([^]+)$/iu);
    if(m){var vcbRef=m[8].trim(),vcbId=(vcbRef.match(/^([A-Za-z0-9]+(?:\.[0-9]+){2})(?:\.|$)/)||[])[1]||'';
      return result(m[2]==='+'?'Thu':'Chi',bankMoney_(m[3]),m[4]+'/'+m[5]+'/'+m[6]+' '+m[7],m[1],vcbRef.slice(0,400),vcbId);}
  }
  if(source==='MB'&&title==='Thông báo biến động số dư'){
    m=body.match(/^TK\s+([0-9xX*•]+)\s*\|\s*GD:\s*([+-])([\d,]+)\s*VND\s+(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?\s*\|\s*SD:\s*[\d,]+\s*VND(?:\s*\|\s*(?:TU|DEN):\s*[^|]+)?\s*\|\s*ND:\s*([^]+)$/iu);
    if(m){var mbDescription=m[9].trim(),mbRef=(mbDescription.match(/^([A-Za-z0-9]+(?:\.[0-9]+){2})(?:\.|$)/)||[])[1]||'';
      var mb=result(m[2]==='+'?'Thu':'Chi',bankMoney_(m[3]),m[4]+'/'+m[5]+'/20'+m[6]+' '+m[7]+':'+(m[8]||'00'),m[1],mbDescription.slice(0,400),mbRef);
      if(mb.status==='recognized'){mb.account_hint=m[1];mb.notification_description=mbDescription;mb.time_precision=m[8]?'second':'minute';}return mb;}
  }
  if(source==='VIB'&&title==='Thông báo giao dịch'){
    m=body.match(/^(Tài khoản|Thẻ tín dụng)\s+([•*xX\s]*\d{4}),\s*phát sinh\s+([+-])([\d,]+)\s*₫\s+vào lúc\s+(\d{2}:\d{2} \d{2}\/\d{2}\/\d{4})\.\s*(Số dư|Hạn mức khả dụng):\s*[\d,]+\s*₫(?:\s*\(đã bao gồm hạn mức dự phòng nếu có đăng ký\))?$/iu);
    if(m&&((m[1]==='Tài khoản'&&m[6]==='Số dư')||(m[1]==='Thẻ tín dụng'&&m[6]==='Hạn mức khả dụng')))
      return result(m[3]==='+'?'Thu':'Chi',bankMoney_(m[4]),m[5],m[2]);
  }
  if(source==='BIDV'&&title==='Thông báo BIDV'){
    if(/^BIDV thông báo:\s*Sao kê thẻ|^Thẻ .+đã (?:kích hoạt|khóa|mở khóa)/iu.test(body))return {status:'ignored',reason:'statement_or_card_status'};
    m=body.match(/^Thẻ\s+([\dxX*•]+),\s*số tiền\s+([\d,]+)\s+VND,\s*hạn mức khả dụng tạm tính:\s*[\d,]+\s+VND;\s*([^;\r\n]+);\s*(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})$/iu);
    if(m)return result('Chi',bankMoney_(m[2]),m[4],m[1],/^Grab\*/iu.test(m[3].trim())?'Grab':'Chi',m[3]);
    // BIDV current-account notifications: signed amount, full multiline labels.
    m=body.match(/^Thời gian giao dịch:\s*(\d{2}:\d{2} \d{2}\/\d{2}\/\d{4})\nTài khoản thanh toán:\s*(\d+)\nSố tiền GD:\s*([+-])([\d,]+)\s+VND(?:\nSố dư cuối:\s*[+-]?[\d,]+\s+VND)?\nNội dung giao dịch:\s*([^\n]+)(?:\nMã giao dịch:\s*([^\n]+))?$/iu);
    if(m)return result(m[3]==='+'?'Thu':'Chi',bankMoney_(m[4]),m[1],m[2],m[5].trim().slice(0,400),m[6]);
  }
  if(source==='BHX'){
    m=title.match(/^Hóa đơn\s+([\d.]+)đ\s+tại Bách Hóa XANH$/iu);
    var order=body.match(/^Bấm để xem chi tiết đơn hàng\s+(OV\d+)\b[^]*tại cửa hàng Bách Hóa XANH$/iu);
    if(m&&order)return result('Chi',bankMoney_(m[1],'.'),null,'','Bách Hóa XANH',order[1],'Đi chợ');
  }
  // Unknown transaction-shaped messages are review drafts, never auto-ledger writes.
  if((source==='VCB'&&title==='Thông báo VCB')||(source==='MB'&&title==='Thông báo biến động số dư')||(source==='BIDV'&&title==='Thông báo BIDV')||(source==='VIB'&&title==='Thông báo giao dịch')||
     (source==='BHX'&&/^Hóa đơn /iu.test(title)))return {status:'review',source:source,reason:'unknown_transaction_format'};
  return {status:'ignored',reason:'not_transaction_title'};
}
