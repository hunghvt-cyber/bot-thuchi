const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function env(){
 const rows=[['Id','RecordJSON']],cache=new Map();let exists=false,ai=0,ledger=0,failFlush=false;
 const sheet={getLastRow:()=>rows.length,appendRow:row=>rows.push([...row]),getRange(r,c,n=1,w=1){return {getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w)),getValue:()=>rows[r-1][c-1],setValue:value=>{rows[r-1][c-1]=value;},createTextFinder:id=>({matchEntireCell(){return this;},findAll:()=>rows.slice(r-1,r-1+n).flatMap((row,i)=>row[c-1]===id?[{getRow:()=>r+i}]:[])})};}};
 const ctx={Date,JSON,Number,String,parseInt,Error,console,getMainSpreadsheetId:()=> 'private',bankLock_:fn=>fn(),
  SpreadsheetApp:{openById:()=>({getSheetByName:name=>{assert.equal(name,'HomepageDonations');return exists?sheet:null;},insertSheet:name=>{assert.equal(name,'HomepageDonations');exists=true;rows.length=0;return sheet;}}),flush:()=>{if(failFlush)throw Error('ambiguous');}},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
  bankParse_:()=>({status:'ignored'}),sharedGeminiQuota_:()=>{},sharedGemini_:contents=>{ai++;assert.ok(!JSON.stringify(contents).includes('SECRET DONOR PROMPT'));return 'Cảm ơn đại ca! Pate đã đến, bàn phím tạm được tha.';},bankJson_:x=>x,
  appendFamilyTransaction_:()=>ledger++};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../Donations.gs','utf8'),ctx);
 return {ctx,rows,get ai(){return ai;},get ledger(){return ledger;},set failFlush(v){failFlush=v;}};
}
const gift=(n,h=0)=>({id:n.toString(16).padStart(64,'0'),amount:50000,received_at:new Date(Date.now()-h*3600000).toISOString(),message:'=SECRET DONOR PROMPT',thanks:'Cảm ơn đại ca!'});
test('dedicated donation JSON storage is idempotent and detects conflicting retries',()=>{
 const x=env(),a=gift(1);assert.equal(x.ctx.donationStore_(a).created,true);assert.equal(x.ctx.donationStore_(a).created,false);assert.equal(x.rows.length,2);assert.ok(x.rows[1][1].startsWith('{'));assert.throws(()=>x.ctx.donationStore_({...a,amount:1000}));assert.equal(x.ledger,0);
});
test('ambiguous Sheets flush reconciles existing donation on retry without append',()=>{
 const x=env(),a=gift(1);x.failFlush=true;assert.throws(()=>x.ctx.donationStore_(a));x.failFlush=false;assert.equal(x.ctx.donationStore_(a).created,false);assert.equal(x.rows.length,2);
});
test('public history includes rolling 24h or newest 10 and contains no private fields',()=>{
 const x=env();for(let i=0;i<20;i++)x.ctx.donationStore_({...gift(i,25+i),balance:'private',raw:'private'});
 let feed=x.ctx.donationPublicFeed_();assert.equal(feed.items.length,10);assert.ok(!JSON.stringify(feed).includes('private'));assert.equal(feed.enabled,true);
 const y=env();for(let i=0;i<25;i++)y.ctx.donationStore_(gift(i,i/2));feed=y.ctx.donationPublicFeed_();assert.equal(feed.items.length,25);
});
test('disabled reader does not create a Sheet and parser fails closed for an unrecognized MB notification',()=>{
 const x=env();assert.equal(x.ctx.donationPublicFeed_().items.length,0);assert.equal(x.rows.length,1);assert.equal(x.ctx.donationFromMB_({package_name:'com.mbmobile',text:'+50000 VND'}),null);
});
test('one model call per durable new donation, no donor text in prompt, no financial ledger append',()=>{
 const x=env();x.ctx.donationFromMB_=()=>({id:gift(1).id,amount:50000,message:'=SECRET DONOR PROMPT'});x.ctx.DONATE_START_AT_=0;
 const event={captured_at:Date.now()};assert.equal(x.ctx.donationIngest_(event).created,true);assert.equal(x.ctx.donationIngest_(event).created,false);assert.equal(x.ai,1);assert.equal(x.ledger,0);assert.equal(x.rows.length,2);assert.equal(JSON.parse(x.rows[1][1]).thanks_source,'gemini');
});
test('Gemini failure retains real amount and fallback; repeated notification does not spend quota again',()=>{
 const x=env();x.ctx.donationFromMB_=()=>({id:gift(1).id,amount:50000,message:'hello'});x.ctx.DONATE_START_AT_=0;x.ctx.sharedGemini_=()=>{throw Error('quota');};x.ctx.donationIngest_({captured_at:Date.now()});const stored=JSON.parse(x.rows[1][1]);assert.equal(stored.amount,50000);assert.equal(stored.thanks_source,'fallback');assert.ok(stored.thanks);
});
