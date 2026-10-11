const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
test('all Apps Script modules are included in clasp deployment',()=>{
 const allow=fs.readFileSync(__dirname+'/../.claspignore','utf8').split(/\r?\n/);
 for(const file of fs.readdirSync(__dirname+'/..').filter(f=>f.endsWith('.gs')))assert.ok(allow.includes('!'+file),'Module excluded: '+file);
});
function context(){
 const props=new Map(),cache=new Map(),sent=[],calls=[],rows=[];
 let releases=0;
 const c={console,Date,Number,JSON,isFinite,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>releases++})},Utilities:{Charset:{UTF_8:'utf8'},formatDate:()=>new Date().toISOString().slice(0,10),computeHmacSha256Signature:(p,s)=>[...crypto.createHmac('sha256',s).update(p).digest()],getUuid:()=> '12345678-1234-1234-1234-123456789012',base64Encode:()=> 'aW1hZ2U='},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({text:s,setMimeType(){return this;}})},getBotToken:()=> 'test',getGeminiApiKey:()=> 'test',getGeminiModel:()=> 'configured-model',getScriptProp_:k=>props.get(k),FAMILY_CATEGORIES:['Đi chợ','Khác','Thu nhập'],familyGroupId_:()=> '-100',telegramDedupeKey_:m=>'telegram:'+m.chat.id+':'+m.message_id,isDuplicate_:key=>rows.some(r=>r.key===key),escapeHtml_:s=>String(s).replace(/</g,'&lt;'),formatVnd_:n=>n+'đ',sendText:(chat,text,extra)=>{sent.push({chat,text,extra});return {result:{message_id:123}};},telegramApi_:(method,payload)=>{calls.push({method,payload});if(method==='getFile')return {result:{file_path:'photos/test.jpg',file_size:3}};return {ok:true};},appendFamilyTransaction_:(msg,tx)=>{const key=c.telegramDedupeKey_(msg);if(c.isDuplicate_(key))return {duplicate:true};rows.push({msg,tx,key});return {duplicate:false,id:'aaaaaaaa-1234',payer:'Owner'};},familyTxnById_:()=>null,UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getBlob:()=>({getBytes:()=>[1,2,3]}),getContentText:()=>JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'hello'}]}}]})})}};
 vm.createContext(c);for(const file of ['HomepageStats.gs','GeminiShared.gs','ReceiptScan.gs'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
 return {c,props,cache,sent,calls,rows,releases:()=>releases};
}
test('signed chat rejects tampering and oversized/out-of-order turns before Gemini',()=>{
 const {c,props}=context();props.set('HOMEPAGE_STATS_SECRET','x'.repeat(32));let called=0;c.sharedGemini_=()=>{called++;return 'ok';};
 function request(messages,action='homepage_chat'){const payload=JSON.stringify({action,messages,timestamp:Date.now()});return {payload,signature:crypto.createHmac('sha256','x'.repeat(32)).update(payload).digest('hex')};}
 const envelope=request([{role:'user',text:'x'}]);assert.equal(JSON.parse(c.homepageChat_(envelope).text).ok,true);
 envelope.payload+=' ';assert.equal(JSON.parse(c.homepageChat_(envelope).text).ok,false);
 assert.equal(JSON.parse(c.homepageChat_(request([{role:'model',text:'x'}])).text).ok,false);
 assert.equal(JSON.parse(c.homepageChat_(request([{role:'user',text:'x'}],'homepage_stats')).text).ok,false);assert.equal(called,1);
});
test('quota does not release the polling lock; ceilings stop extra requests',()=>{
 const x=context();x.c.sharedGeminiQuota_('RECEIPT',1,true);assert.equal(x.releases(),0);assert.throws(()=>x.c.sharedGeminiQuota_('RECEIPT',1,true));assert.equal(x.releases(),0);
});
test('receipt validation rejects ambiguous, non-VND, fractional, and invalid totals',()=>{
 const {c}=context(),valid={isReceipt:true,currency:'VND',amount:85000,description:'Shop',category:'Đi chợ',date:'2026-10-09'};
 assert.equal(c.normalizeReceipt_(valid).date,'2026-10-09');
 for(const changed of [{isReceipt:false},{currency:'OTHER'},{amount:null},{amount:'85000'},{amount:1.5},{amount:-1},{amount:1e12}])assert.throws(()=>c.normalizeReceipt_({...valid,...changed}));
 assert.equal(c.normalizeReceipt_({...valid,date:'2026-02-30'}).date,'');
});
test('photo scan creates a draft only; wrong actor cannot confirm; repeated confirm cannot duplicate',()=>{
 const {c,sent,cache,rows}=context();c.sharedGemini_=()=>JSON.stringify({isReceipt:true,currency:'VND',amount:85000,category:'Đi chợ',description:'Shop',date:'2026-10-09'});
 const msg={chat:{id:'-100'},from:{id:7,first_name:'Owner'},message_id:4,photo:[{file_id:'test',file_size:3}]};c.handleReceiptPhoto_(msg,true);assert.equal(rows.length,0);assert.equal(sent.length,1);
 assert.ok(sent[0].extra,JSON.stringify(sent));const data=sent[0].extra.reply_markup.inline_keyboard[0][0].callback_data;
 const cb={id:'cb',message:{chat:{id:'-100'}},from:{id:8},data};c.receiptCallback_(cb,true);assert.equal(rows.length,0);
 cb.from.id=7;c.receiptCallback_(cb,true);c.receiptCallback_(cb,true);assert.equal(rows.length,1);assert.equal(rows[0].msg.message_id,4);assert.equal(rows[0].tx.amount,85000);assert.equal(rows[0].tx.date,'2026-10-09');
});
test('unbound/wrong group, unsupported file, expiry and cancellation do not write',()=>{
 const {c,rows,cache}=context();const cb={id:'cb',message:{chat:{id:'-100'}},from:{id:7},data:'bill:yes:12345678901234567890'};
 const key='RECEIPT_12345678901234567890';cache.set(key,JSON.stringify({chatId:'-100',userId:'7',expires:Date.now()-1}));c.receiptCallback_(cb,true);assert.equal(rows.length,0);
 cache.set(key,JSON.stringify({chatId:'-100',userId:'7',expires:Date.now()+60000}));cb.data='bill:no:12345678901234567890';c.receiptCallback_(cb,true);assert.equal(cache.has(key),false);assert.equal(rows.length,0);
 c.familyGroupId_=()=>'';assert.equal(c.handleReceiptPhoto_({chat:{id:'-100'},photo:[{file_id:'test'}]},true),true);assert.equal(rows.length,0);
});
test('group router scans an own photo supplied inside a /scan reply and preserves topic',()=>{
 const {c,sent,rows}=context();c.familyRememberUserMessage_=()=>{};
 c.sharedGemini_=()=>JSON.stringify({isReceipt:true,currency:'VND',amount:85000,category:'Đi chợ',description:'Shop'});
 vm.runInContext(fs.readFileSync(__dirname+'/../FamilyRouter.gs','utf8'),c);
 const msg={chat:{id:'-100'},from:{id:7},message_id:9,message_thread_id:42,text:'/scan@expense_bot',reply_to_message:{from:{id:7},message_id:4,photo:[{file_id:'test'}]}};
 c.handleFamilyMessage_(msg,true);
 assert.equal(sent.length,1);assert.match(sent[0].text,/ĐÃ ĐỌC BILL/);assert.equal(sent[0].extra.message_thread_id,42);assert.equal(rows.length,0);
 const data=sent[0].extra.reply_markup.inline_keyboard[0][0].callback_data;
 c.receiptCallback_({id:'cb',message:{chat:{id:'-100'}},from:{id:7},data},true);
 assert.equal(rows[0].msg.message_id,4);assert.equal(sent[1].extra.message_thread_id,42);
});
test('/scan gives guidance without an image and rejects another person’s bill',()=>{
 const {c,sent,rows}=context();let scans=0;c.handleReceiptPhoto_=()=>{scans++;return true;};
 const msg={chat:{id:'-100'},from:{id:7},message_thread_id:42};
 assert.equal(c.receiptScanCommand_(msg,'/scan'),true);assert.match(sent[0].text,/Reply/);assert.equal(sent[0].extra.message_thread_id,42);
 msg.reply_to_message={from:{id:8},photo:[{file_id:'test'}]};c.receiptScanCommand_(msg,'/scan');assert.equal(scans,0);assert.equal(rows.length,0);
 assert.equal(c.receiptScanCommand_(msg,'ok'),false);
});
