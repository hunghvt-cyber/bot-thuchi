/** MB-only donation projection. No family ledger approval/write or raw notification publication. */
var DONATE_MB_ACCOUNT_='566766';
var DONATE_MB_PACKAGE_='com.mbmobile';
// Remains closed until an actual owner's MB notification format is verified.
var DONATE_MB_FORMAT_VERIFIED_=false;
var DONATE_SHEET_='HomepageDonations';
var DONATE_START_AT_=Date.parse('2026-10-25T20:00:00+07:00');
function donationFromMB_(event){
  if(!DONATE_MB_FORMAT_VERIFIED_||event.package_name!==DONATE_MB_PACKAGE_)return null;
  // The exact parser will be supplied from the owner's real MB notification sample.
  return null;
}
function donationSheet_(create){
  var ss=SpreadsheetApp.openById(getMainSpreadsheetId()),sheet=ss.getSheetByName(DONATE_SHEET_);
  if(!sheet&&create){sheet=ss.insertSheet(DONATE_SHEET_);sheet.appendRow(['Id','RecordJSON']);}
  if(sheet){var headers=sheet.getRange(1,1,1,2).getValues()[0];if(headers[0]!=='Id'||headers[1]!=='RecordJSON')throw Error('donation_schema');}
  return sheet;
}
function donationValid_(item){
 return item&&/^[a-f0-9]{64}$/.test(item.id||'')&&Number.isSafeInteger(item.amount)&&item.amount>0&&item.amount<=1000000000000&&
  Number.isFinite(Date.parse(item.received_at))&&typeof item.message==='string'&&item.message.length<=400&&typeof item.thanks==='string'&&item.thanks.length>0&&item.thanks.length<=300;
}
function donationRow_(sheet,id){
 if(sheet.getLastRow()<2)return null;
 var matches=sheet.getRange(2,1,sheet.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findAll();
 if(matches.length>1)throw Error('donation_duplicate_corrupt');
 if(!matches.length)return null;
 var row=matches[0].getRow(),item=JSON.parse(sheet.getRange(row,2).getValue());
 if(!donationValid_(item)||item.id!==id)throw Error('donation_corrupt');
 return {row:row,item:item};
}
function donationStore_(donation){
 if(!donationValid_(donation))throw Error('donation_invalid');
 return bankLock_(function(){
  var sheet=donationSheet_(true),existing=donationRow_(sheet,donation.id);
  if(existing){if(existing.item.amount!==donation.amount||existing.item.message!==donation.message)throw Error('donation_conflict');return {created:false,item:existing.item};}
  // JSON starts with {, so donor messages beginning = + - @ cannot execute Sheet formulas.
  sheet.appendRow([donation.id,JSON.stringify(donation)]);SpreadsheetApp.flush();
  var confirmed=donationRow_(sheet,donation.id);
  if(!confirmed||confirmed.item.amount!==donation.amount||confirmed.item.message!==donation.message)throw Error('donation_unconfirmed');
  return {created:true,item:confirmed.item};
 });
}
function donationThanks_(item){
 // Only amount and a style seed reach Gemini. Donor's free text is never interpreted as instructions.
 try{
  sharedGeminiQuota_('DONATE_THANKS',50,false);
  var text=String(sharedGemini_([{role:'user',parts:[{text:'Viết đúng một câu cảm ơn tiếng Việt dưới 180 ký tự, như một con mèo cam vô tri vừa được donate. Hài hước nhẹ nhàng, thân thiện, xưng em, gọi người cho là đại ca. Không xúc phạm, không hứa lợi ích tài chính, không suy tên người cho. Không markdown, không số tài khoản. Số tiền đã nhận: '+item.amount+' VND. Gợi ý phong cách số '+parseInt(item.id.slice(-2),16)+': pate, đè bàn phím, trực NAS, cá khô. Chỉ trả câu cảm ơn.'}]}],false)||'').replace(/\s+/g,' ').trim();
  if(!text||text.length>300||/[<>]/.test(text))throw Error('donation_thanks_invalid');
  return {text:text,source:'gemini'};
 }catch(ignore){return {text:item.thanks,source:'fallback'};}
}
function donationIngest_(event){
 var parsed=donationFromMB_(event);if(!parsed)return {matched:false};
 if(event.captured_at<DONATE_START_AT_)return {matched:false};
 var item={id:parsed.id,amount:parsed.amount,message:parsed.message,received_at:new Date(event.captured_at).toISOString(),ingested_at:new Date().toISOString(),
  thanks:'Cảm ơn đại ca đã tiếp tế pate! Em xin hứa bớt đè bàn phím… một chút.',thanks_source:'pending'};
 var result=donationStore_(item);
 if(result.created){
  var thanks=donationThanks_(result.item);
  try{bankLock_(function(){var sheet=donationSheet_(false),stored=donationRow_(sheet,item.id);if(!stored)return;
    stored.item.thanks=thanks.text;stored.item.thanks_source=thanks.source;
    sheet.getRange(stored.row,2).setValue(JSON.stringify(stored.item));SpreadsheetApp.flush();
  });}catch(ignore){/* The donation and fallback were durably committed before any Gemini request. */}
 }
 try{CacheService.getScriptCache().remove('HOMEPAGE_DONATION_FEED_V1');}catch(ignore){}
 return {matched:true,created:result.created,id:item.id};
}
function donationPublicFeed_(){
 // GET never creates a Sheet, calls Gemini, or reads the private Transactions ledger.
 var now=Date.now(),enabled=DONATE_MB_FORMAT_VERIFIED_,cache=CacheService.getScriptCache(),cached;
 try{cached=JSON.parse(cache.get('HOMEPAGE_DONATION_FEED_V1')||'null');}catch(ignore){}
 var all;
 if(cached&&Array.isArray(cached.items))all=cached.items;
 else{
  var sheet=donationSheet_(false);all=[];
  if(sheet&&sheet.getLastRow()>1){
   var rows=sheet.getRange(2,1,sheet.getLastRow()-1,2).getValues(),ids={};
   rows.forEach(function(row){var item=JSON.parse(row[1]);if(!donationValid_(item)||item.id!==row[0]||ids[item.id])throw Error('donation_corrupt');ids[item.id]=true;
    all.push({id:item.id,amount:item.amount,received_at:item.received_at,message:item.message,thanks:item.thanks});});
   all.sort(function(a,b){return Date.parse(b.received_at)-Date.parse(a.received_at)||b.id.localeCompare(a.id);});
   all=all.filter(function(item,index){return index<10||Date.parse(item.received_at)>=now-86400000;});
  }
  if(all.length>5000)throw Error('donation_feed_capacity');
  try{var value=JSON.stringify({items:all});if(value.length<80000)cache.put('HOMEPAGE_DONATION_FEED_V1',value,5);}catch(ignore){}
 }
 return {schema:1,bank:'MB',enabled:enabled,server_time:new Date(now).toISOString(),items:all.filter(function(item,index){return index<10||Date.parse(item.received_at)>=now-86400000;})};
}
function donationFeedResponse_(){
 try{return bankJson_(donationPublicFeed_());}
 catch(ignore){return bankJson_({error:'DONATION_FEED_UNAVAILABLE'});}
}
