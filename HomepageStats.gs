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
    var group=familyGroupId_();if(!group)return result({ok:false});
    var data=familySheet_().getDataRange().getValues(),transactions=[];
    for(var i=1;i<data.length;i++) {
      var r=data[i],d=new Date(r[0]),amount=Number(r[7]);
      if(isNaN(d.getTime()) || String(r[15])==='DELETED' || String(r[9])!==String(group) || !isFinite(amount) || amount<0 || ['ChiTieu','ThuNhap'].indexOf(r[4])<0)continue;
      var day=Utilities.formatDate(d,'Asia/Ho_Chi_Minh','yyyy-MM-dd');if(day.slice(0,7)!==request.month)continue;
      transactions.push({day:day,amount:amount,type:String(r[4]),category:String(r[5]||'Khác'),payerId:String(r[2]),payer:String(r[3])});
    }
    return result({ok:true,month:request.month,measuredAt:new Date().toISOString(),transactions:transactions});
  }catch(e){return result({ok:false});}
}
