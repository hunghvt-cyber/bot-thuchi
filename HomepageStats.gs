// Read-only private reporting API. No Telegram or ledger writes.
function homepageStats_(envelope) {
  function result(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
  try {
    var secret=PropertiesService.getScriptProperties().getProperty('HOMEPAGE_STATS_SECRET');
    if(!secret || secret.length<32 || typeof envelope.payload!=='string' || envelope.payload.length>1000) return result({ok:false});
    var expected=Utilities.computeHmacSha256Signature(envelope.payload,secret,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
    var received=String(envelope.signature||''),diff=expected.length^received.length;
    for(var j=0;j<expected.length;j++)diff|=expected.charCodeAt(j)^(received.charCodeAt(j)||0);
    if(diff)return result({ok:false});
    var request=JSON.parse(envelope.payload);
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(request.month) || typeof request.timestamp!=='number' || Math.abs(Date.now()-request.timestamp)>60000)return result({ok:false});
    // Reporting must never create a sheet or initialize ledger headers.
    var spreadsheet=familySpreadsheet_(),sheet=spreadsheet.getSheetByName('Transactions');
    if(!sheet)return result({ok:false});
    // Native date-only cells must keep their displayed calendar day across GAS/Sheet timezones.
    var range=sheet.getDataRange(),data=range.getValues(),display=range.getDisplayValues(),transactions=[];
    for(var i=1;i<data.length;i++) {
      var r=data[i],day=homepageLedgerDay_(Object.prototype.toString.call(r[1])==='[object Date]'?display[i][1]:r[1],spreadsheet.getSpreadsheetTimeZone()),amount=Number(r[7]);
      if(!day || String(r[15])==='DELETED' || !isFinite(amount) || amount<0 || ['ChiTieu','ThuNhap'].indexOf(r[4])<0)continue;
      if(day.slice(0,7)!==request.month)continue;
      transactions.push({day:day,amount:amount,type:String(r[4]),category:String(r[5]||'Khác'),payerId:String(r[2]),payer:String(r[3]),description:String(r[6]==null?'':r[6]).slice(0,2000)});
    }
    return result({ok:true,month:request.month,measuredAt:new Date().toISOString(),transactions:transactions});
  }catch(e){return result({ok:false});}
}

// Date is the ledger's calendar date, not the time the bot received the message.
function homepageLedgerDay_(value,timeZone) {
  var day;
  if(Object.prototype.toString.call(value)==='[object Date]') {
    if(isNaN(value.getTime()))return '';
    day=Utilities.formatDate(value,timeZone,'yyyy-MM-dd');
  }else {
    var text=String(value==null?'':value).trim(),m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    day=m?m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2):text;
  }
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(day))return '';
  var d=new Date(day+'T00:00:00Z');
  return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===day?day:'';
}
