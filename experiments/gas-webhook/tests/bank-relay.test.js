const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const root=__dirname+'/../';
function env(options={}){
 const values={BANK_RELAY_ENABLED:'YES',BANK_RELAY_MODE:'PREVIEW',BANK_RELAY_KEY:'a'.repeat(64),BANK_RELAY_OWNER_ID:'12345',BANK_RELAY_VERIFIED:'YES',FAMILY_GROUP_ID:'-10012345',ENABLE_FAMILY_WEBHOOK:'YES',RECEIPT_WEBHOOK_SECRET:'telegram-secret',...options.props};
 const calls=[],batches=[],cache=new Map(),stats={locks:0,writes:0};let locked=false,seq=100;
 const props={getProperty:k=>values[k]??null,setProperty:(k,v)=>{stats.writes++;values[k]=v;return props;},deleteProperty:k=>delete values[k],getProperties:()=>({...values})};
 const ctx={Date,JSON,Number,String,Error,console,
  PropertiesService:{getScriptProperties:()=>props},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v)})},
  LockService:{getScriptLock:()=>{stats.locks++;return {tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>locked=false};}},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],getUuid:()=>crypto.randomUUID()},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({text:s,setMimeType(){return this;}})},
  HtmlService:{createHtmlOutput:s=>({html:s})},
  getScriptProp_:k=>values[k]||'',receiptWebhookKeyMatches_:(a,b)=>a===b,
  FAMILY_CATEGORIES:['Khác','Đi chợ','Đi lại','Thu nhập','Vay mượn'],
  parseMoneyLocal_:s=>/^\d+k$/.test(s)?parseInt(s)*1000:null,
  telegramApi_:(method,payload)=>{calls.push({method,payload});if(options.onTelegram)options.onTelegram(method,payload,ctx);return {ok:true,result:{message_id:++seq}};},
  SpreadsheetApp:new Proxy({}, {get(){throw Error('UNEXPECTED_SHEETS_ACCESS');}}),
  handleFamilyMessage_:()=>{throw Error('UNEXPECTED_LEDGER_ROUTING');},
  familyResetCallback_:()=>{throw Error('UNEXPECTED_CALLBACK');},
  getMainSpreadsheetId:()=>{throw Error('UNEXPECTED_SPREADSHEET_ID');},getFamilyGroupId:()=>values.FAMILY_GROUP_ID
 };
 ctx.telegramCallbackUi_=(callbackId,method,payload)=>{batches.push({callbackId,method,payload});if(options.onBatch)options.onBatch(method,payload);try{ctx.telegramApi_('answerCallbackQuery',{callback_query_id:callbackId});}catch(ignore){}return ctx.telegramApi_(method,payload);};
 vm.createContext(ctx);
 for(const f of ['BankNotifications.gs','BankAssist.gs','BankRelay.gs','BankCommit.gs','BankLearning.gs','Code.gs'])vm.runInContext(fs.readFileSync(root+f,'utf8'),ctx,{filename:f});
 // Earlier focused draft-edit tests isolate parsing/display from the new commit policy.
 if(!options.autoApprove)ctx.bankAutoCommitAfterEdit_=()=>false;
 return {ctx,values,calls,props,batches,cache,stats};
}
function sample(pkg='com.vib.myvib2',title='Thông báo giao dịch',text='Tài khoản •••• 1111, phát sinh -40,000 ₫ vào lúc 11:48 22/10/2026. Số dư: 5,581,643 ₫'){return {package_name:pkg,title,text};}
function fee(sign='-'){return sample('com.vnpay.bidv','Thông báo BIDV','Thời gian giao dịch: 05:24 23/10/2026\nTài khoản thanh toán: 1111222233\nSố tiền GD: '+sign+'5,500 VND\nNội dung giao dịch: THU PHI QLTK T10/2026');}
function request(e=sample(),opts={}){
 return {pathInfo:'macrodroid',postData:{contents:['BANK-NOTIFY-1',opts.key||'a'.repeat(64),'s25-ultra',opts.at||Date.now(),e.package_name,e.title,e.text].join('\n')}};
}
function post(x,e=request()){return JSON.parse(x.ctx.doPost(e).text);}
test('query intake route preserves authentication and never falls into Telegram ledger',()=>{
 const x=env(),e=request();delete e.pathInfo;e.parameter={intake:'macrodroid'};
 assert.equal(post(x,e).status,'sent');assert.equal(post(x,e).status,'duplicate_sent');
 const y=env(),bad=request(sample(),{key:'bad'});delete bad.pathInfo;bad.parameter={intake:'macrodroid'};
 assert.equal(post(y,bad).status,'unauthorized');assert.equal(y.calls.length,0);
});
function draft(x){const k=Object.keys(x.values).find(k=>k.startsWith('BANK_EVT_'));return {key:k,state:JSON.parse(x.values[k])};}
function reply(x,text='sửa tiền 50k',owner=12345,id=800){
 const s=draft(x).state;
 return {message_id:id,chat:{id:Number(s.group)},from:{id:owner},text,reply_to_message:{message_id:s.message_id,text:x.ctx.bankDraftText_(s)}};
}
test('BIDV fee signed direction, original content and actual date',()=>{const x=env(),t=x.ctx.bankParse_(fee());assert.equal(t.status,'recognized');assert.equal(t.amount,5500);assert.equal(t.direction,'Chi');assert.equal(t.description,'THU PHI QLTK T10/2026');assert.equal(t.account_suffix,'2233');assert.equal(t.transaction_iso,'2026-10-23T05:24:00+07:00');assert.equal(x.ctx.bankParse_(fee('+')).direction,'Thu');});
test('VIB account and credit both signs',()=>{const x=env();for(const kind of ['Tài khoản','Thẻ tín dụng'])for(const sign of ['+','-']){const t=x.ctx.bankParse_(sample(undefined,undefined,kind+' •••• 1111, phát sinh '+sign+'70,000 ₫ vào lúc 12:06 20/10/2026. '+(kind==='Tài khoản'?'Số dư':'Hạn mức khả dụng')+': 217,772,359 ₫'+(kind==='Thẻ tín dụng'?' (đã bao gồm hạn mức dự phòng nếu có đăng ký)':'')));assert.equal(t.amount,70000);assert.equal(t.description,sign==='+'?'Thu':'Chi');}});
test('BIDV account variants with final balance and transaction code',()=>{const x=env();for(const withCode of [false,true]){const e=fee();e.text=e.text.replace('\nNội dung giao dịch:','\nSố dư cuối: 55,000 VND\nNội dung giao dịch:')+(withCode?'\nMã giao dịch: TEST-bank-1':'');const t=x.ctx.bankParse_(e);assert.equal(t.status,'recognized');assert.equal(t.amount,5500);assert.equal(t.description,'THU PHI QLTK T10/2026');assert.equal(t.reference,withCode?'TEST-bank-1':'');}});
test('BIDV card merchant/time, not limit',()=>{const x=env(),t=x.ctx.bankParse_(sample('com.vnpay.bidv','Thông báo BIDV','Thẻ 0000xx1111, số tiền 15,000 VND, hạn mức khả dụng tạm tính: 189,465,988 VND; Grab* REF-1 ; 19/10/2026 11:00:29'));assert.equal(t.amount,15000);assert.equal(t.description,'Grab');assert.equal(t.transaction_time,'19/10/2026 11:00:29');});
test('BHX package and invoice including order',()=>{const x=env(),t=x.ctx.bankParse_(sample('com.bachhoaxanh','Hóa đơn 163.928đ tại Bách Hóa XANH','Bấm để xem chi tiết đơn hàng OV000000001 của Chị tại cửa hàng Bách Hóa XANH'));assert.equal(t.amount,163928);assert.equal(t.time_precision,'receipt_only');assert.equal(t.category,'Đi chợ');assert.equal(x.ctx.bankParse_(sample('wrong.app','Hóa đơn 163.928đ tại Bách Hóa XANH','...')).status,'ignored');});
test('ads/statements/activation no Telegram draft',()=>{for(const e of [sample('com.vnpay.bidv','Gửi 70 triệu, thêm lãi thêm quà','555 triệu ưu đãi'),sample('com.vnpay.bidv','Thông báo BIDV','BIDV thông báo: Sao kê thẻ JCB 0000xx1111 kỳ 20/10: Dư nợ 181,000 VND'),sample('com.vnpay.bidv','Thông báo BIDV','Thẻ 0000xx1111 của Quý khách đã kích hoạt thành công')]){const x=env();assert.equal(post(x,request(e)).status,'ignored');assert.equal(x.calls.length,0);}});
test('calendar invalid and malformed money cannot be auto recognized',()=>{const x=env();assert.equal(x.ctx.bankDate_('05:24 31/02/2026'),null);assert.equal(x.ctx.bankDate_('29:24 23/10/2026'),null);assert.equal(x.ctx.bankMoney_('4,45,000'),null);assert.equal(x.ctx.bankParse_(sample(undefined,undefined,sample().text.replace('40,000','4,00'))).status,'review');});
test('unknown transaction creates editable review, no blind amount extraction',()=>{const x=env(),r=post(x,request(sample(undefined,undefined,'Mẫu giao dịch mới 999999')));assert.equal(r.status,'sent');assert.equal(draft(x).state.tx.status,'review');assert.match(x.calls[0].payload.text,/Chưa rõ số tiền/);});
test('relay succeeds with no Sheets access, original text visible',()=>{const x=env(),r=post(x);assert.equal(r.status,'sent');assert.match(x.calls[0].payload.text,/Chưa ghi Sheets/);assert.match(x.calls[0].payload.text,/Chi 40\.000đ/);assert.equal(draft(x).state.original,sample().title+'\n'+sample().text);assert.equal(x.calls[0].payload.chat_id,'-10012345');assert.ok(!JSON.stringify(x.calls).includes('a'.repeat(64)));});
test('fail closed disabled, missing verification, wrong key or mode',()=>{for(const props of [{BANK_RELAY_ENABLED:'NO'},{BANK_RELAY_VERIFIED:'NO'},{BANK_RELAY_MODE:'WRITE'},{BANK_RELAY_OWNER_ID:''},{BANK_RELAY_KEY:''}]){const x=env({props});assert.equal(post(x).ok,false);assert.equal(x.calls.length,0);}const x=env();assert.equal(post(x,request(sample(),{key:'bad'})).status,'unauthorized');assert.equal(x.calls.length,0);});
test('fixed request replay deduped; claim is before Telegram call',()=>{let second;const e=request();const x=env({onTelegram:m=>{if(m==='sendMessage'&&!second)second=post(x,e);}});assert.equal(post(x,e).status,'sent');assert.equal(second.status,'pending');assert.equal(post(x,e).status,'duplicate_sent');assert.equal(x.calls.filter(c=>c.method==='sendMessage').length,1);});
test('same amount different receipt events remain separate',()=>{const x=env();assert.equal(post(x,request(sample(),{at:Date.now()-2})).status,'sent');assert.equal(post(x,request(sample(),{at:Date.now()-1})).status,'sent');assert.equal(x.calls.length,2);});
test('same receipt timestamp with different full content remains separate',()=>{const x=env(),at=Date.now();assert.equal(post(x,request(sample(),{at})).status,'sent');assert.equal(post(x,request(sample(undefined,undefined,sample().text.replace('5,581,643','5,541,643')),{at})).status,'sent');assert.equal(x.calls.length,2);});
test('ambiguous Telegram timeout never blindly resends',()=>{const x=env({onTelegram:()=>{throw Error('timeout');}}),e=request();assert.equal(post(x,e).status,'uncertain');assert.equal(post(x,e).status,'uncertain');assert.equal(x.calls.length,1);});
test('expired request rejected even after dedupe property pruned',()=>{const x=env();assert.equal(post(x,request(sample(),{at:Date.now()-48*3600000-1})).status,'expired_or_future');assert.equal(x.calls.length,0);});
test('capacity guard preserves existing keys instead of evicting recent events',()=>{const x=env();x.values.OTHER='x'.repeat(160000);assert.equal(post(x).status,'bank_capacity');assert.equal(x.calls.length,0);assert.ok(x.values.OTHER);});
test('explicit prepare generates private intake key idempotently without enabling relay',()=>{const x=env();delete x.values.BANK_RELAY_KEY;delete x.values.BANK_RELAY_ENABLED;const a=x.ctx.prepareBankRelayPreview(),key=x.values.BANK_RELAY_KEY;x.ctx.prepareBankRelayPreview();assert.match(key,/^[a-f0-9]{64}$/);assert.equal(x.values.BANK_RELAY_KEY,key);assert.equal(x.values.BANK_RELAY_ENABLED,'NO');assert.ok(!JSON.stringify(a).includes(key));assert.equal(x.calls.length,0);});
test('UTF8 multiline and quotes survive wire envelope',()=>{const x=env(),e=fee();e.text+=' "demo" \\ thử';const got=x.ctx.bankReadEnvelope_(request(e));assert.equal(got.text,e.text);assert.equal(x.ctx.bankParse_(got).amount,5500);});
test('draft owner replies edit amount/description/category/type on original message',()=>{const x=env();post(x);for(const [cmd,field,want] of [['sửa tiền 50k','amount',50000],['sửa nội dung Phí ngân hàng','description','Phí ngân hàng'],['sửa danh mục Vay mượn','category','Vay mượn'],['sửa loại thu','direction','Thu']]){const id=x.calls.length+800;const m=reply(x,cmd,12345,id);assert.equal(x.ctx.handleBankDraftReply_(m),true);assert.equal(draft(x).state.tx[field],want);}assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,4);});
test('raw integer edit means exact VND, not thousands shorthand',()=>{const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 5500'));assert.equal(draft(x).state.tx.amount,5500);});
test('unauthorized actor cannot edit or delete',()=>{const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'xóa',777));assert.ok(!draft(x).state.deleted);assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,0);});
test('delete and restore are draft-only operations',()=>{const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'xóa',12345,801));assert.equal(draft(x).state.deleted,true);x.ctx.handleBankDraftReply_(reply(x,'khôi phục',12345,802));assert.equal(draft(x).state.deleted,false);});
test('duplicate Telegram edit update is idempotent',()=>{const x=env();post(x);const m=reply(x);x.ctx.handleBankDraftReply_(m);x.ctx.handleBankDraftReply_(m);assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,1);});
test('bank draft replies bypass ledger and webhook history',()=>{const x=env();post(x);const m=reply(x);assert.equal(x.ctx.doPost({parameter:{key:'telegram-secret'},postData:{contents:JSON.stringify({message:m})}}).html,'OK');assert.equal(draft(x).state.tx.amount,50000);});
test('expired draft and reply to bank note never fall into ledger',()=>{const x=env();const msg={message_id:900,chat:{id:-10012345},from:{id:12345},text:'sửa tiền 50k',reply_to_message:{message_id:123,text:x.ctx.BANK_DRAFT_MARKER_+'\nExpired'}};assert.equal(x.ctx.doPost({parameter:{key:'telegram-secret'},postData:{contents:JSON.stringify({message:msg})}}).html,'OK');assert.equal(x.calls.length,1);});
test('Telegram secret validation still precedes draft edits',()=>{const x=env({props:{RECEIPT_WEBHOOK_SECRET:'telegram-secret'}});post(x);const m=reply(x);x.ctx.doPost({parameter:{key:'wrong'},postData:{contents:JSON.stringify({message:m})}});assert.equal(draft(x).state.tx.amount,40000);});

test('compact draft has one amount, no original balance, ID or instructions wall',()=>{
 const x=env();post(x);const text=x.calls[0].payload.text;
 assert.ok(text.startsWith('🧪 Nháp ngân hàng'));assert.match(text,/Chi 40\.000đ · VIB · Khác/);
 assert.ok(text.length<160);assert.ok(!/5,581,643|1111|BANK_DRAFT_V1|Mã nháp|Gốc/.test(text));
});
test('legacy draft accepts capitalized money edit and confirms final value',()=>{
 const x=env();post(x);const m=reply(x,'Sửa tiền 3k');m.reply_to_message.text='🧪 BANK_DRAFT_V1\nold verbose message';
 x.ctx.handleBankDraftReply_(m);assert.equal(draft(x).state.tx.amount,3000);
 assert.match(x.calls.find(c=>c.method==='editMessageText').payload.text,/Chi 3\.000đ/);
 assert.match(x.calls.at(-1).payload.text,/Đã sửa nháp: Chi 3\.000đ/);
});
test('grouped VND edits mean exact amount and ambiguous text is rejected',()=>{
 for(const value of ['3.000','3,000','3000đ','3.000 VND']){const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền '+value));assert.equal(draft(x).state.tx.amount,3000);}
 const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k hay 5k'));assert.equal(draft(x).state.tx.amount,40000);
});
test('already identical display skips Telegram edit and confirms success',()=>{
 const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 40000'));
 assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,0);
 assert.match(x.calls.at(-1).payload.text,/Đã sửa nháp: Chi 40\.000đ/);
});
test('Telegram not-modified result is success instead of a false failure note',()=>{
 const x=env({onTelegram:m=>{if(m==='editMessageText')throw Error('Telegram editMessageText HTTP 400: message is not modified');}});
 post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));
 assert.equal(draft(x).state.tx.amount,3000);assert.equal(draft(x).state.editing,false);
 assert.match(x.calls.at(-1).payload.text,/Đã sửa nháp: Chi 3\.000đ/);assert.ok(!draft(x).state.last_edit_error);
});
test('actual edit failure exposes saved amount without claiming display success or leaking error details',()=>{
 const x=env({onTelegram:m=>{if(m==='editMessageText')throw Error('Telegram editMessageText HTTP 429: private payload retry after 5');}});
 post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));
 assert.equal(draft(x).state.tx.amount,3000);assert.equal(draft(x).state.editing,false);
 assert.equal(draft(x).state.last_edit_error.kind,'rate_limited');assert.equal(draft(x).state.last_edit_error.http,429);
 assert.match(x.calls.at(-1).payload.text,/Đã lưu nháp: Chi 3\.000đ/);assert.match(x.calls.at(-1).payload.text,/Tin gốc chưa xác minh/);
 assert.ok(!x.calls.at(-1).payload.text.includes('private payload'));
});
function aiSample(){return sample('com.example.newbank','Biến động số dư','Giao dịch ghi nợ -25,000 VND. Số dư 99,000 VND');}
function aiResult(){return {kind:'transaction',amount:25000,amount_text:'25,000',amount_context:'Giao dịch ghi nợ -25,000 VND',direction:'Chi',direction_context:'ghi nợ -25,000 VND',currency:'VND',source:'Bank mới',description:'Không rõ mục đích',category:'Đi chợ'};}
function withAI(x,result=aiResult()){
 const usage=[];x.ctx.sharedGeminiQuota_=(kind,max,locked)=>usage.push({kind,max,locked});
 x.ctx.sharedGemini_=()=>JSON.stringify(result);return usage;
}
test('new phone-selected app uses Gemini with grounded amount; missing purpose stays Khác',()=>{
 const x=env(),usage=withAI(x);assert.equal(post(x,request(aiSample())).status,'sent');
 assert.equal(draft(x).state.tx.amount,25000);assert.equal(draft(x).state.tx.source,'Bank mới');
 assert.equal(draft(x).state.tx.description,'Không rõ mục đích');assert.equal(draft(x).state.tx.category,'Khác');
 assert.deepEqual(usage,[{kind:'BANK',max:50,locked:false}]);
 assert.match(x.calls[0].payload.text,/Chi 25\.000đ/);
});
test('known local format avoids Gemini and uses unknown-purpose default',()=>{
 const x=env(),usage=withAI(x);post(x);assert.equal(usage.length,0);assert.equal(draft(x).state.tx.description,'Không rõ mục đích');
});
test('Gemini malformed/ungrounded/balance/nonVND/directionless amounts become review, not guesses',()=>{
 for(const patch of [{amount:99000},{amount_context:'Số dư 99,000 VND',amount_text:'99,000',amount:99000},{amount_context:'made up25,000'},
 {currency:'USD'},{direction:'?'},{direction:'Thu'},{direction_context:'invented +25,000'},{amount_text:'5,000',amount:5000}]){
  const x=env();withAI(x,{...aiResult(),...patch});post(x,request(aiSample()));assert.equal(draft(x).state.tx.status,'review');assert.ok(!draft(x).state.tx.amount);
 }
 const x=env();withAI(x);x.ctx.sharedGemini_=()=>'{bad';assert.equal(post(x,request(aiSample())).status,'sent');assert.equal(draft(x).state.tx.status,'review');
});
test('authentication and dedupe precede Gemini including concurrent retry',()=>{
 const x=env(),e=request(aiSample()),usage=withAI(x);let duplicate;
 x.ctx.sharedGemini_=()=>{duplicate=post(x,e);return JSON.stringify(aiResult());};
 assert.equal(post(x,e).status,'sent');assert.equal(duplicate.status,'pending');assert.equal(post(x,e).status,'duplicate_sent');assert.equal(usage.length,1);
 const y=env(),none=withAI(y);assert.equal(post(y,request(aiSample(),{key:'wrong'})).status,'unauthorized');assert.equal(none.length,0);
});
test('AI nontransactions do not send; quota failure creates editable review without losing event',()=>{
 const x=env(),e=request(aiSample()),usage=withAI(x,{kind:'other'});assert.equal(post(x,e).status,'ignored');assert.equal(post(x,e).status,'ignored');assert.equal(x.calls.length,0);assert.equal(usage.length,1);
 const y=env();withAI(y);y.ctx.sharedGeminiQuota_=()=>{throw Error('quota');};post(y,request(aiSample()));assert.equal(draft(y).state.tx.status,'review');assert.equal(draft(y).state.status,'sent');
});
function callback(x,action='menu',index='',owner=12345,id='callback1'){
 const s=draft(x).state;return {id,from:{id:owner},data:'bank:'+action+':'+s.id+(index!==''?':'+index:''),
  message:{message_id:s.message_id,chat:{id:Number(s.group)},text:x.ctx.bankDraftText_(s)}};
}
test('category button lists all 14 existing categories, chooses one and preserves amount',()=>{
 const x=env();vm.runInContext(fs.readFileSync(root+'FamilyConfig.gs','utf8'),x.ctx);post(x);
 assert.equal(x.calls[0].payload.reply_markup.inline_keyboard[0][0].text,'Edit');
 x.ctx.handleBankDraftCallback_(callback(x));const menu=x.calls.filter(c=>c.method==='editMessageReplyMarkup').at(-1).payload.reply_markup.inline_keyboard;
 const choices=menu.flat().filter(c=>c.callback_data.startsWith('bank:catv:'));assert.equal(choices.length,14);
 assert.deepEqual(Array.from(choices,c=>c.text.replace(/^✓ /,'')).sort(),Array.from(x.ctx.FAMILY_CATEGORIES).sort());
 const i=x.ctx.FAMILY_CATEGORIES.indexOf('Con cái');const cb=callback(x,'cat',i,12345,'choose1');
 x.ctx.handleBankDraftCallback_(cb);assert.equal(draft(x).state.tx.category,'Con cái');assert.equal(draft(x).state.tx.amount,40000);
 assert.match(x.calls.filter(c=>c.method==='editMessageText').at(-1).payload.text,/Con cái/);
 const edits=x.calls.filter(c=>c.method==='editMessageText').length;x.ctx.handleBankDraftCallback_(cb);assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,edits);
});
test('category callbacks reject wrong owner/chat/token/expired/deleted and forged webhook secret',()=>{
 for(const variant of ['owner','chat','token','expired','deleted','index']){
  const x=env();post(x);const cb=callback(x,variant==='index'?'cat':'menu',variant==='index'?99:'');
  if(variant==='owner')cb.from.id=999;
  if(variant==='chat')cb.message.chat.id=-999;
  if(variant==='token')cb.data='bank:menu:aaaaaaaaaaaa';
  if(variant==='expired'||variant==='deleted'){const d=draft(x);d.state[variant==='expired'?'expires':'deleted']=variant==='expired'?0:true;x.props.setProperty(d.key,JSON.stringify(d.state));}
  x.ctx.handleBankDraftCallback_(cb);assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,0);
 }
 const x=env();post(x);x.ctx.doPost({parameter:{key:'wrong'},postData:{contents:JSON.stringify({callback_query:callback(x)})}});assert.equal(x.calls.length,1);
});
test('category callback routes before ledger and receipt handler; API failures release edit lock',()=>{
 const x=env({onTelegram:m=>{if(m==='editMessageText'||m==='editMessageReplyMarkup')throw Error('offline');}});post(x);
 assert.equal(x.ctx.doPost({parameter:{key:'telegram-secret'},postData:{contents:JSON.stringify({callback_query:callback(x)})}}).html,'OK');
 assert.ok(!draft(x).state.editing);assert.ok(x.calls.some(c=>c.method==='answerCallbackQuery'));
});
function inputReply(x,kind,value,owner=12345,id=9900){
 const key=Object.keys(x.values).find(k=>k.startsWith('BANK_MSG_')&&JSON.parse(x.values[k]).inputKind===kind);
 assert.ok(key);const prompt=x.calls.find(c=>c.method==='sendMessage'&&c.payload.reply_markup&&c.payload.reply_markup.force_reply);
 return {message_id:id,chat:{id:Number(draft(x).state.group)},from:{id:owner},text:value,
  reply_to_message:{message_id:Number(key.split('_').at(-1)),text:prompt.payload.text}};
}
test('draft action panel has money, content, category, direction and soft-delete buttons',()=>{
 const x=env();post(x);assert.deepEqual(Array.from(x.calls[0].payload.reply_markup.inline_keyboard.flat(),b=>b.text),['Edit','Duyệt']);
 x.ctx.handleBankDraftCallback_(callback(x,'edit'));
 const labels=x.calls.at(-1).payload.reply_markup.inline_keyboard.flat().map(b=>b.text);
 for(const label of ['Sửa tiền','Sửa nội dung','Đổi danh mục','Thu / Chi','Xóa nháp'])assert.ok(labels.includes(label));
 assert.ok(!x.calls[0].payload.text.includes('Reply để sửa'));
});
test('money button opens selective reply prompt; bare 3k edits original draft, not ledger',()=>{
 const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,'money'));
 const prompt=x.calls.find(c=>c.payload.reply_markup&&c.payload.reply_markup.force_reply);
 assert.equal(prompt.payload.reply_markup.selective,true);assert.match(prompt.payload.text,/tg:\/\/user\?id=12345/);
 const m=inputReply(x,'money','3k');assert.equal(x.ctx.doPost({parameter:{key:'telegram-secret'},postData:{contents:JSON.stringify({message:m})}}).html,'OK');
 assert.equal(draft(x).state.tx.amount,3000);assert.equal(x.calls.filter(c=>c.method==='editMessageText').at(-1).payload.message_id,draft(x).state.message_id);
 x.ctx.handleBankDraftReply_(m);assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,1);
});
test('content button accepts plain text and preserves angle brackets as text',()=>{
 const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,'description'));
 x.ctx.handleBankDraftReply_(inputReply(x,'description','Mua sách <cho bé>'));
 assert.equal(draft(x).state.tx.description,'Mua sách <cho bé>');assert.equal(draft(x).state.tx.amount,40000);
 assert.equal(x.calls.filter(c=>c.method==='editMessageText').at(-1).payload.parse_mode,undefined);
});
test('input prompt enforces owner, five-minute expiry, validation and cancellation without ledger fallthrough',()=>{
 for(const mode of ['owner','expired','invalid','cancel']){
  const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,'money'));
  const msg=inputReply(x,'money',mode==='invalid'?'không phải số':mode==='cancel'?'Hủy':'3k',mode==='owner'?999:12345);
  const key='BANK_MSG_'+msg.chat.id+'_'+msg.reply_to_message.message_id;
  const map=JSON.parse(x.values[key]);assert.ok(map.expires<=Date.now()+300000);
  if(mode==='expired'){map.expires=0;x.props.setProperty(key,JSON.stringify(map));}
  assert.equal(x.ctx.handleBankDraftReply_(msg),true);assert.equal(draft(x).state.tx.amount,40000);
  if(mode==='cancel')assert.equal(x.values[key],undefined);
 }
});
test('direction and soft-delete/restore buttons update only the owned draft',()=>{
 const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,'kind'));
 assert.deepEqual(Array.from(x.calls.filter(c=>c.method==='editMessageReplyMarkup').at(-1).payload.reply_markup.inline_keyboard[0],b=>b.text),['Thu','Chi']);
 x.ctx.handleBankDraftCallback_(callback(x,'income','',12345,'income1'));assert.equal(draft(x).state.tx.direction,'Thu');
 x.ctx.handleBankDraftCallback_(callback(x,'delete','',12345,'delete1'));assert.equal(draft(x).state.deleted,true);
 assert.equal(x.calls.filter(c=>c.method==='editMessageText').at(-1).payload.reply_markup.inline_keyboard[0][0].text,'Khôi phục nháp');
 x.ctx.handleBankDraftCallback_(callback(x,'restore','',12345,'restore1'));assert.equal(draft(x).state.deleted,false);assert.equal(draft(x).state.tx.amount,40000);
});
test('failed input prompt releases edit lock and duplicate callback cannot spawn another prompt',()=>{
 const x=env({onTelegram:(method,payload)=>{if(method==='sendMessage'&&payload.reply_markup&&payload.reply_markup.force_reply)throw Error('offline');}});
 post(x);const cb=callback(x,'money');x.ctx.handleBankDraftCallback_(cb);assert.equal(draft(x).state.editing,false);
 const count=x.calls.filter(c=>c.payload.reply_markup&&c.payload.reply_markup.force_reply).length;
 x.ctx.handleBankDraftCallback_(cb);assert.equal(x.calls.filter(c=>c.payload.reply_markup&&c.payload.reply_markup.force_reply).length,count);
});

test('valid button acknowledges once before message edits, keyboard updates or input prompts',()=>{
 for(const action of ['menu','kind','close','income','money','description','delete']){
  const x=env();post(x);const before=x.calls.length;x.ctx.handleBankDraftCallback_(callback(x,action));
  const calls=x.calls.slice(before);assert.equal(calls[0].method,'answerCallbackQuery');
  assert.equal(calls.filter(c=>c.method==='answerCallbackQuery').length,1);
  assert.ok(!draft(x).state.editing);
 }
});
test('menu navigation edits only keyboard, keeps actual transaction untouched',()=>{
 const x=env();post(x);const tx=JSON.stringify(draft(x).state.tx);
 for(const [i,action] of ['menu','kind','close'].entries())x.ctx.handleBankDraftCallback_(callback(x,action,'',12345,'navigate'+i));
 assert.equal(x.calls.filter(c=>c.method==='editMessageReplyMarkup').length,3);
 assert.equal(x.calls.filter(c=>c.method==='editMessageText').length,0);assert.equal(JSON.stringify(draft(x).state.tx),tx);
});
test('early acknowledgement never hides subsequent API failure and legacy text still refreshes',()=>{
 const x=env({onTelegram:m=>{if(m==='editMessageReplyMarkup')throw Error('offline');}});post(x);x.ctx.handleBankDraftCallback_(callback(x,'menu'));
 assert.match(x.calls.at(-1).payload.text,/Chưa mở được thao tác/);assert.ok(!draft(x).state.editing);
 const y=env();post(y);const cb=callback(y,'menu');cb.message.text='🧪 BANK_DRAFT_V1\nLegacy long notification';
 y.ctx.handleBankDraftCallback_(cb);assert.equal(y.calls.filter(c=>c.method==='editMessageText').length,1);
});
function ledger(x,options={}){
 const rows=[Array(18).fill('Header')];let writes=0;
 const sh={getLastRow:()=>rows.length,getRange:(r,c,n=1,w=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w)),setValue:v=>{rows[r-1][c-1]=v;}}),
 appendRow:row=>{writes++;rows.push(Array.from(row));if(options.onAppend)options.onAppend(row);}};
 x.ctx.familySheet_=()=>sh;x.ctx.SpreadsheetApp={flush:()=>{if(options.onFlush)options.onFlush();}};
 x.ctx.Utilities.formatDate=date=>new Date(date.getTime()+7*3600000).toISOString().slice(0,10).split('-').reverse().join('/');
 return {rows,writes:()=>writes,sh};
}
test('owner Duyệt writes edited exact VND/type/category once to existing 18-column schema',()=>{
 const x=env();post(x);const l=ledger(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));
 const cb=callback(x,'approve');cb.from.first_name='Hung';x.ctx.handleBankDraftCallback_(cb);
 assert.equal(l.writes(),1);const row=l.rows[1];assert.equal(row.length,18);assert.equal(row[7],3000);assert.equal(row[4],'ChiTieu');assert.equal(row[2],'12345');assert.equal(row[3],'Hung');
 assert.equal(row[9],'-10012345');assert.equal(row[10],String(draft(x).state.message_id));assert.equal(row[11],'bank');assert.equal(row[15],'ACTIVE');assert.match(row[13],/^bank:[a-f0-9]{64}$/);
 assert.equal(row[0].toISOString(),'2026-10-22T04:48:00.000Z');assert.equal(row[1],'22/10/2026');
 assert.equal(row[14],'Ngân hàng: VIB');assert.ok(!row[14].includes('Số dư'));
 assert.equal(draft(x).state.recorded,true);const display=x.calls.filter(c=>c.method==='editMessageText').at(-1).payload;
 assert.match(display.text,/✅ Đã ghi sổ\nChi 3\.000đ/);assert.equal(display.reply_markup.inline_keyboard.length,0);
 x.ctx.handleBankDraftCallback_(cb);x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'approve-again'));assert.equal(l.writes(),1);
});
test('income approval and receipt-only time use original captured time, not approval time',()=>{
 const x=env(),at=Date.now()-600000;post(x,request(sample('com.bachhoaxanh','Hóa đơn 109.000đ tại Bách Hóa XANH','Bấm để xem chi tiết đơn hàng OV000000002 của Chị tại cửa hàng Bách Hóa XANH'),{at}));
 const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,'income'));
 x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'approve1'));assert.equal(l.rows[1][4],'ThuNhap');assert.equal(l.rows[1][0].getTime(),at);
});
test('approval rejects missing amount/direction, deleted/expired, wrong owner/group and disabled intake',()=>{
 for(const mode of ['amount','direction','deleted','expired','owner','group','disabled']){
  const x=env();post(x);const l=ledger(x),d=draft(x),cb=callback(x,'approve');
  if(mode==='amount')delete d.state.tx.amount;if(mode==='direction')delete d.state.tx.direction;
  if(mode==='deleted')d.state.deleted=true;if(mode==='expired')d.state.expires=0;
  if(mode==='owner')cb.from.id=777;if(mode==='group')cb.message.chat.id=-999;if(mode==='disabled')x.values.BANK_RELAY_ENABLED='NO';
  x.props.setProperty(d.key,JSON.stringify(d.state));x.ctx.handleBankDraftCallback_(cb);assert.equal(l.writes(),0,mode);
 }
});
test('forged webhook cannot approve and intake never writes until an owner clicks Duyệt',()=>{
 const x=env(),l=ledger(x);post(x);assert.equal(l.writes(),0);
 x.ctx.handleBankDraftCallback_(callback(x,'edit'));assert.equal(l.writes(),0);
 x.ctx.doPost({parameter:{key:'wrong'},postData:{contents:JSON.stringify({callback_query:callback(x,'approve')})}});assert.equal(l.writes(),0);
 x.ctx.doPost({parameter:{key:'telegram-secret'},postData:{contents:JSON.stringify({callback_query:callback(x,'approve','',12345,'valid')})}});assert.equal(l.writes(),1);
});
test('concurrent approval is serialized by shared ScriptLock and acknowledges before append',()=>{
 const x=env();post(x);let nested=false;
 const l=ledger(x,{onAppend:()=>{assert.ok(x.calls.some(c=>c.method==='answerCallbackQuery'));nested=true;x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'parallel'));}});
 x.ctx.handleBankDraftCallback_(callback(x,'approve'));assert.equal(nested,true);assert.equal(l.writes(),1);assert.equal(draft(x).state.editing,false);
});
test('ambiguous flush failure after row write recovers by durable key without appending again',()=>{
 const x=env();post(x);let fail=true;const l=ledger(x,{onFlush:()=>{if(fail)throw Error('Sheets timeout after append');}});
 x.ctx.handleBankDraftCallback_(callback(x,'approve'));assert.equal(l.writes(),1);assert.ok(!draft(x).state.recorded);assert.equal(draft(x).state.editing,false);
 assert.match(x.calls.at(-1).payload.text,/Chưa xác minh ghi sổ/);fail=false;
 x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'retry'));assert.equal(l.writes(),1);assert.equal(draft(x).state.recorded,true);
});
test('lost temporary recorded flag and later soft-delete never produce another ledger row',()=>{
 const x=env();post(x);const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,'approve'));
 const d=draft(x);delete d.state.recorded;d.state.callback_ids=[];x.props.setProperty(d.key,JSON.stringify(d.state));l.rows[1][15]='DELETED';
 x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'retry'));assert.equal(l.writes(),1);assert.equal(l.rows[1][15],'DELETED');assert.match(x.calls.at(-1).payload.text,/Giao dịch đã xóa/);
});
test('failed Telegram edit after approval leaves one row and binds fallback confirmation for existing edits',()=>{
 const x=env({onTelegram:m=>{if(m==='editMessageText')throw Error('offline');}});post(x);const l=ledger(x);
 x.ctx.handleBankDraftCallback_(callback(x,'approve'));assert.equal(l.writes(),1);assert.equal(draft(x).state.recorded,true);
 const sent=x.calls.filter(c=>c.method==='sendMessage').at(-1);assert.match(sent.payload.text,/Đã ghi sổ/);assert.notEqual(l.rows[1][16],String(draft(x).state.message_id));
 x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'retry'));assert.equal(l.writes(),1);
});
test('old input prompt and draft command cannot mutate approved transaction',()=>{
 const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,'money'));const m=inputReply(x,'money','3k');
 const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'approve'));
 x.ctx.handleBankDraftReply_(m);x.ctx.handleBankDraftReply_(reply(x,'xóa'));
 assert.equal(draft(x).state.tx.amount,40000);assert.ok(!draft(x).state.deleted);assert.equal(l.rows[1][7],40000);assert.equal(l.rows[1][15],'ACTIVE');
});
test('two legitimate events with the same amount retain distinct ledger identities',()=>{
 const x=env(),l=ledger(x);post(x,request(sample(),{at:Date.now()-1}));x.ctx.handleBankDraftCallback_(callback(x,'approve'));
 const first=draft(x).key;delete x.values[first];post(x,request(sample(),{at:Date.now()}));x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'second'));
 assert.equal(l.writes(),2);assert.notEqual(l.rows[1][13],l.rows[2][13]);
});
test('expired editing lease recovers a killed approval without letting concurrent clicks write twice',()=>{
 const x=env();post(x);const l=ledger(x),d=draft(x);d.state.editing=true;d.state.editing_at=Date.now()-121000;x.props.setProperty(d.key,JSON.stringify(d.state));
 x.ctx.handleBankDraftCallback_(callback(x,'approve'));assert.equal(l.writes(),1);assert.equal(draft(x).state.editing,false);
});
test('new bank ledger strings cannot execute a spreadsheet formula',()=>{
 const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa nội dung =IMPORTXML("example","//a")'));
 const l=ledger(x),cb=callback(x,'approve');cb.from.first_name='=1+1';x.ctx.handleBankDraftCallback_(cb);
 assert.ok(l.rows[1][6].startsWith("'="));assert.ok(l.rows[1][3].startsWith("'="));
});
test('learning stores immutable initial result, raw provenance and ordered corrections without an extra Telegram call',()=>{
 const x=env();post(x);const d=draft(x),initial=JSON.stringify(d.state.learning.initial);assert.equal(x.calls.length,1);assert.equal(d.state.learning.initial.amount,40000);assert.equal(d.state.learning.initial.parser,'local');
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));
 x.ctx.handleBankDraftCallback_(callback(x,'income','',12345,'income'));
 const s=draft(x).state;assert.equal(JSON.stringify(s.learning.initial),initial);assert.equal(s.learning.history.length,2);
 assert.equal(s.learning.history[0].fields.amount.from,40000);assert.equal(s.learning.history[0].fields.amount.to,3000);
 assert.equal(s.learning.history[1].fields.direction.to,'Thu');assert.equal(s.original,sample().title+'\n'+sample().text);
});
test('Gemini baseline and parser failure notes are distinguished from local recognition and ignored ads',()=>{
 const x=env();withAI(x);post(x,request(aiSample()));assert.equal(draft(x).state.learning.initial.parser,'gemini');
 const y=env();withAI(y);y.ctx.sharedGemini_=()=>{throw Error('private GEMINI_API_KEY');};post(y,request(aiSample()));
 const l=draft(y).state.learning;assert.equal(l.initial.status,'review');assert.equal(l.errors[0].stage,'parser');assert.ok(!JSON.stringify(l).includes('GEMINI_API_KEY'));
 const z=env();post(z,request(sample('com.vnpay.bidv','Gửi 70 triệu, thêm lãi thêm quà','ưu đãi 555 triệu')));assert.equal(draft(z).state.status,'ignored');assert.equal(z.calls.length,0);assert.equal(z.ctx.bankLearnOutcome_(draft(z).state,Date.now()),'bỏ qua tự động');
});
test('approval log captures final accepted fields only once, including retry after an uncertain append',()=>{
 const x=env();post(x);const l=ledger(x,{onFlush:()=>{throw Error('private Spreadsheet URL');}});
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));x.ctx.handleBankDraftCallback_(callback(x,'approve'));
 assert.equal(l.writes(),1);assert.ok(!draft(x).state.learning.approved_at);assert.equal(draft(x).state.learning.errors[0].stage,'ledger_approval');
 x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'retry'));const a=draft(x).state.learning.approved_at;
 assert.ok(a);assert.equal(draft(x).state.learning.approved.amount,3000);x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'retry2'));
 assert.equal(draft(x).state.learning.approved_at,a);assert.equal(l.writes(),1);assert.equal(draft(x).state.learning.history.length,1);
});
test('delete/restore are actions without inferred rejection reason; abandoned drafts never count as model errors',()=>{
 const x=env();post(x);const original=draft(x).state,expires=original.expires;
 assert.equal(x.ctx.bankLearnOutcome_(original,Date.now()),'chưa duyệt');assert.equal(x.ctx.bankLearnOutcome_(original,expires+1),'hết hạn, chưa duyệt');
 x.ctx.handleBankDraftCallback_(callback(x,'delete'));assert.equal(x.ctx.bankLearnOutcome_(draft(x).state,Date.now()),'đã xóa nháp');
 x.ctx.handleBankDraftCallback_(callback(x,'restore','',12345,'restore'));const s=draft(x).state;
 assert.equal(s.learning.history.length,2);assert.equal(s.learning.errors.length,0);assert.equal(s.expires,expires);
});
test('menus, unauthorized requests and replayed updates cannot manufacture learning edits',()=>{
 const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,'edit'));x.ctx.handleBankDraftCallback_(callback(x,'income','',999,'wrong'));
 assert.equal(draft(x).state.learning.history.length,0);
 const m=reply(x,'sửa tiền 3k');x.ctx.handleBankDraftReply_(m);x.ctx.handleBankDraftReply_(m);
 assert.equal(draft(x).state.learning.history.length,1);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3000',12345,9999));assert.equal(draft(x).state.learning.history.length,1);
});
test('legacy drafts never label the first newly observed value as original model output',()=>{
 const x=env();post(x);const d=draft(x);delete d.state.learning;x.props.setProperty(d.key,JSON.stringify(d.state));
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));const l=draft(x).state.learning;
 assert.equal(l.legacy,true);assert.equal(l.initial,null);assert.equal(l.history[0].fields.amount.from,40000);
});
test('learning history is bounded within property byte budget, detects edits beyond the visible prefix and retains initial result',()=>{
 const x=env();post(x);const d=draft(x);d.state.original='漢'.repeat(1200);d.state.tx.description='漢'.repeat(400);x.props.setProperty(d.key,JSON.stringify(d.state));
 for(let i=0;i<20;i++)x.ctx.handleBankDraftReply_(reply(x,'sửa nội dung '+'漢'.repeat(399)+i,12345,10000+i));
 const s=draft(x).state;assert.ok(s.learning.history.length<=8);assert.ok(s.learning.history.length>0);assert.ok(s.learning.dropped>0);
 assert.ok(Buffer.byteLength(x.values[d.key])<8500);assert.equal(s.learning.initial.amount,40000);assert.equal(s.expires,d.state.expires);
});
test('sanitized Telegram errors are recorded but not-modified is not an error',()=>{
 const x=env({onTelegram:m=>{if(m==='editMessageText')throw Error('Telegram HTTP 429: token secret key private body');}});post(x);
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));const l=draft(x).state.learning;assert.equal(l.errors[0].http,429);assert.ok(!JSON.stringify(l).includes('private body'));assert.ok(!JSON.stringify(l).includes('token secret'));
 const y=env({onTelegram:m=>{if(m==='editMessageText')throw Error('message is not modified');}});post(y);y.ctx.handleBankDraftReply_(reply(y,'sửa tiền 3k'));assert.equal(draft(y).state.learning.errors.length,0);
});
test('banklog is owner/group/secret restricted, before ledger routing, and detailed output contains no intake key',()=>{
 const x=env();post(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));const id=draft(x).state.id;
 function report(from=12345,chat=-10012345,text='/banklog'){return {message_id:900,from:{id:from},chat:{id:chat},text};}
 let n=x.calls.length;x.ctx.handleBankLogCommand_(report(999));x.ctx.handleBankLogCommand_(report(12345,-999));assert.equal(x.calls.length,n);
 x.ctx.doPost({parameter:{key:'wrong'},postData:{contents:JSON.stringify({message:report()})}});assert.equal(x.calls.length,n);
 assert.equal(x.ctx.doPost({parameter:{key:'telegram-secret'},postData:{contents:JSON.stringify({message:report()})}}).html,'OK');assert.match(x.calls.at(-1).payload.text,/cửa sổ 7 ngày/);
 x.ctx.handleBankLogCommand_(report(12345,-10012345,'/banklog '+id));const text=x.calls.at(-1).payload.text;
 assert.match(text,/40\.000đ/);assert.match(text,/3\.000đ/);assert.match(text,/40000 → 3000/);assert.match(text,/Gốc/);assert.ok(text.length<=3800);assert.ok(!text.includes('a'.repeat(64)));assert.equal(x.calls.at(-1).payload.parse_mode,undefined);
});
test('seven-day log expiry removes learning together with event; report never returns purged-window contents',()=>{
 const x=env();post(x);const d=draft(x);d.state.captured_at=Date.now()-7*86400000-1;d.state.created=d.state.captured_at;d.state.expires=d.state.captured_at+48*3600000;x.props.setProperty(d.key,JSON.stringify(d.state));
 x.ctx.handleBankLogCommand_({from:{id:12345},chat:{id:-10012345},text:'/banklog '+d.state.id});assert.match(x.calls.at(-1).payload.text,/Không tìm thấy/);
 x.ctx.cleanupBankRelayState();assert.equal(x.values[d.key],undefined);
});
test('banklog paginates the entire retained window and excludes another group even in shared properties',()=>{
 const x=env(),at=Date.now();for(let i=0;i<10;i++)post(x,request(sample(),{at:at-i}));
 const events=Object.keys(x.values).filter(k=>k.startsWith('BANK_EVT_'));const hidden=JSON.parse(x.values[events[0]]);hidden.group='-999';hidden.id='aaaaaaaaaaaa';x.values.BANK_EVT_foreign=JSON.stringify(hidden);
 x.ctx.handleBankLogCommand_({from:{id:12345},chat:{id:-10012345},text:'/banklog 2'});const text=x.calls.at(-1).payload.text;
 assert.match(text,/Trang 2\/2/);assert.equal((text.match(/· VIB ·/g)||[]).length,2);assert.ok(!text.includes('aaaaaaaaaaaa'));
});
test('callback display errors append sanitized learning error once without altering original extraction',()=>{
 const x=env({onTelegram:m=>{if(m==='editMessageReplyMarkup')throw Error('HTTP 403: private key');}});post(x);const initial=JSON.stringify(draft(x).state.learning.initial);
 x.ctx.handleBankDraftCallback_(callback(x,'edit'));const s=draft(x).state;assert.equal(s.learning.errors[0].stage,'telegram_navigation');assert.equal(s.learning.errors[0].kind,'forbidden');
 assert.equal(JSON.stringify(s.learning.initial),initial);assert.equal(s.learning.history.length,0);assert.ok(!JSON.stringify(s.learning).includes('private key'));
});
test('three-day-old draft remains in weekly learning log but cannot be approved or edited',()=>{
 const x=env();post(x);const d=draft(x),at=Date.now()-3*86400000;d.state.captured_at=at;d.state.created=at;d.state.expires=at+48*3600000;
 x.props.setProperty(d.key,JSON.stringify(d.state));const mapKey='BANK_MSG_'+d.state.group+'_'+d.state.message_id;
 x.props.setProperty(mapKey,JSON.stringify({eventKey:d.key,expires:d.state.expires}));const l=ledger(x);
 x.ctx.cleanupBankRelayState();assert.ok(x.values[d.key]);assert.equal(x.values[mapKey],undefined);
 x.ctx.handleBankDraftCallback_(callback(x,'approve'));x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));assert.equal(l.writes(),0);assert.equal(draft(x).state.tx.amount,40000);
 x.ctx.handleBankLogCommand_({from:{id:12345},chat:{id:-10012345},text:'/banklog '+d.state.id});assert.match(x.calls.at(-1).payload.text,/hết hạn, chưa duyệt/);assert.match(x.calls.at(-1).payload.text,/40\.000đ/);assert.match(x.calls.at(-1).payload.text,/Gốc/);
});
test('weekly retention uses original capture, never approval/edit times, and cleanup is exact at the seven-day boundary',()=>{
 const x=env();post(x);const d=draft(x),s=d.state;const expires=x.ctx.bankLogExpires_(s);assert.equal(expires,s.captured_at+7*86400000);
 s.learning.approved_at=Date.now()+10*86400000;s.editing_at=s.learning.approved_at;assert.equal(x.ctx.bankLogExpires_(s),expires);
 x.props.setProperty(d.key,JSON.stringify(s));x.ctx.bankClean_(x.props,expires-1);assert.ok(x.values[d.key]);x.ctx.bankClean_(x.props,expires);assert.equal(x.values[d.key],undefined);
});
test('pre-upgrade events without a log deadline gain the same seven-day window without inventing a model baseline',()=>{
 const x=env();post(x);const d=draft(x);delete d.state.captured_at;delete d.state.learning;d.state.created=Date.now()-4*86400000;d.state.expires=d.state.created+48*3600000;
 x.props.setProperty(d.key,JSON.stringify(d.state));x.ctx.cleanupBankRelayState();assert.ok(x.values[d.key]);
 x.ctx.handleBankLogCommand_({from:{id:12345},chat:{id:-10012345},text:'/banklog '+d.state.id});assert.match(x.calls.at(-1).payload.text,/nháp cũ/);assert.equal(JSON.parse(x.values[d.key]).learning,undefined);
});
test('a week of retained logs does not change intake retry limits, authentication or weekly report owner checks',()=>{
 const x=env();post(x);const old=Date.now()-3*86400000;assert.equal(post(x,request(sample(),{at:old})).status,'expired_or_future');
 const n=x.calls.length;x.ctx.handleBankLogCommand_({from:{id:999},chat:{id:-10012345},text:'/banklog'});assert.equal(x.calls.length,n);
 x.ctx.handleBankLogCommand_({from:{id:12345},chat:{id:-10012345},text:'/banklog'});assert.match(x.calls.at(-1).payload.text,/cửa sổ 7 ngày/);
});
test('all authorized menu, field and input buttons use one callback/UI batch and retain timing without ledger access',()=>{
 for(const [i,action] of ['edit','menu','kind','close','income','expense','money','description','delete'].entries()){
  const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,action,'',12345,'batch'+i));
  assert.equal(x.batches.length,1,action);assert.equal(x.batches[0].callbackId,'batch'+i);
  assert.equal(x.calls.filter(c=>c.method==='answerCallbackQuery').length,1);
  const timing=draft(x).state.last_ui_timing||JSON.parse(x.cache.get('BANK_UI_'+draft(x).state.id));assert.ok(timing.mode.includes('batch'));
  assert.equal(timing.action,action);assert.ok(timing.telegram_ms>=0);assert.ok(!draft(x).state.editing);
 }
});
test('invalid/unauthorized/duplicate callbacks cannot dispatch a UI batch; approval remains separate and idempotent',()=>{
 const x=env();post(x);x.ctx.handleBankDraftCallback_(callback(x,'edit','',999,'wrong'));assert.equal(x.batches.length,0);
 const cb=callback(x,'edit');x.ctx.handleBankDraftCallback_(cb);x.ctx.handleBankDraftCallback_(cb);assert.equal(x.batches.length,2); // repeated read-only navigation is harmless and writes no state
 const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'approve'));assert.equal(l.writes(),1);assert.equal(x.batches.length,2);
});
test('ambiguous input batch timeout never automatically resends a prompt and always releases UI claim',()=>{
 const x=env({onBatch:()=>{throw Error('batch transport timeout');}});post(x);const cb=callback(x,'money');x.ctx.handleBankDraftCallback_(cb);
 assert.equal(x.batches.length,1);assert.equal(x.calls.filter(c=>c.payload.reply_markup&&c.payload.reply_markup.force_reply).length,0);
 assert.equal(draft(x).state.editing,false);assert.equal(draft(x).state.learning.errors.at(-1).stage,'telegram_action');
 x.ctx.handleBankDraftCallback_(cb);assert.equal(x.batches.length,1);
});
test('navigation performs no Script Properties writes, no ledger access and no ScriptLock acquisition',()=>{
 const x=env({autoApprove:true});post(x);const writes=x.stats.writes,locks=x.stats.locks,original=x.values[draft(x).key];
 for(const [i,action] of ['edit','menu','kind','close'].entries())x.ctx.handleBankDraftCallback_(callback(x,action,'',12345,'nav'+i));
 assert.equal(x.stats.writes,writes);assert.equal(x.stats.locks,locks);assert.equal(x.values[draft(x).key],original);assert.equal(x.batches.length,4);
 const timing=JSON.parse(x.cache.get('BANK_UI_'+draft(x).state.id));assert.equal(timing.mode,'read_only_batch');
});
test('new category value callbacks stay correct if category order changes and fit Telegram callback limit',()=>{
 const x=env({autoApprove:true});post(x);const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,'menu'));
 const choices=x.calls.filter(c=>c.method==='editMessageReplyMarkup').at(-1).payload.reply_markup.inline_keyboard.flat().filter(b=>b.callback_data.startsWith('bank:catv:'));
 for(const button of choices)assert.ok(Buffer.byteLength(button.callback_data)<=64);
 const b=choices.find(b=>b.text.replace(/^✓ /,'')==='Đi chợ');x.ctx.FAMILY_CATEGORIES.reverse();
 const cb=callback(x,'catv','Đi chợ');cb.data=b.callback_data;x.ctx.handleBankDraftCallback_(cb);
 assert.equal(l.writes(),1);assert.equal(l.rows[1][5],'Đi chợ');assert.equal(draft(x).state.recorded,true);
});
test('valid submitted money or description correction commits once immediately without a Duyệt callback',()=>{
 for(const [i,kind,value,amount] of [[1,'money','3k',3000],[2,'description','Mua sách cho bé',40000]]){
  const x=env({autoApprove:true});post(x);const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,kind));const m=inputReply(x,kind,value,12345,9000+i);
  x.ctx.doPost({parameter:{key:'telegram-secret'},postData:{contents:JSON.stringify({message:m})}});
  assert.equal(l.writes(),1);assert.equal(l.rows[1][7],amount);assert.equal(draft(x).state.recorded,true);
  assert.match(x.calls.filter(c=>c.method==='editMessageText').at(-1).payload.text,/Đã ghi sổ/);
  x.ctx.handleBankDraftReply_(m);x.ctx.handleBankDraftCallback_(callback(x,'approve','',12345,'retry'));assert.equal(l.writes(),1);
 }
});
test('category and Thu/Chi submission auto-approve while Edit, menus, prompts, delete and restore alone never do',()=>{
 for(const action of ['income','expense']){const x=env({autoApprove:true});post(x);const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,action));assert.equal(l.writes(),1);assert.equal(l.rows[1][4],action==='income'?'ThuNhap':'ChiTieu');}
 const x=env({autoApprove:true});post(x);const l=ledger(x);
 for(const [i,action] of ['edit','menu','kind','close','money','description','delete','restore'].entries())x.ctx.handleBankDraftCallback_(callback(x,action,'',12345,'only'+i));
 assert.equal(l.writes(),0);assert.ok(!draft(x).state.recorded);
});
test('incomplete or invalid edit stays a draft; the final missing field submission auto-commits',()=>{
 const x=env({autoApprove:true});post(x);const d=draft(x);delete d.state.tx.amount;delete d.state.tx.direction;x.props.setProperty(d.key,JSON.stringify(d.state));const l=ledger(x);
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền abc',12345,1000));assert.equal(l.writes(),0);
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 50k',12345,1001));assert.equal(l.writes(),0);assert.equal(draft(x).state.tx.amount,50000);assert.equal(draft(x).state.editing,false);
 x.ctx.handleBankDraftCallback_(callback(x,'income','',12345,'finish'));assert.equal(l.writes(),1);assert.equal(l.rows[1][7],50000);assert.equal(l.rows[1][4],'ThuNhap');
});
test('explicitly submitting the unchanged amount also approves once; unauthorised or expired edits never do',()=>{
 const x=env({autoApprove:true});post(x);const l=ledger(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 40000'));assert.equal(l.writes(),1);
 for(const mode of ['owner','expired','deleted']){const y=env({autoApprove:true});post(y);const k=ledger(y),d=draft(y);if(mode==='expired')d.state.expires=0;if(mode==='deleted')d.state.deleted=true;y.props.setProperty(d.key,JSON.stringify(d.state));y.ctx.handleBankDraftReply_(reply(y,'sửa tiền 3k',mode==='owner'?999:12345));assert.equal(k.writes(),0);}
});
test('ambiguous auto-approval flush failure is recoverable by Duyệt without another append',()=>{
 const x=env({autoApprove:true});post(x);let fail=true;const l=ledger(x,{onFlush:()=>{if(fail)throw Error('timeout after append');}});
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k'));assert.equal(l.writes(),1);assert.ok(!draft(x).state.recorded);assert.equal(draft(x).state.editing,false);assert.match(x.calls.at(-1).payload.text,/Chưa xác minh ghi sổ/);
 fail=false;x.ctx.handleBankDraftCallback_(callback(x,'approve'));assert.equal(l.writes(),1);assert.equal(draft(x).state.recorded,true);assert.equal(l.rows[1][7],3000);
});
test('legacy numeric category callbacks remain accepted and auto-approve the saved category snapshot',()=>{
 const x=env({autoApprove:true});post(x);const l=ledger(x),d=draft(x);d.state.category_choices=['Khác','Vay mượn'];x.props.setProperty(d.key,JSON.stringify(d.state));
 x.ctx.handleBankDraftCallback_(callback(x,'cat',1));assert.equal(l.writes(),1);assert.equal(l.rows[1][5],'Vay mượn');
});
test('read-only menu races can never authorize a second ledger write or edit an already approved draft',()=>{
 const x=env({autoApprove:true});post(x);const l=ledger(x);x.ctx.handleBankDraftCallback_(callback(x,'income'));
 const n=x.batches.length;x.ctx.handleBankDraftCallback_(callback(x,'edit','',12345,'stale'));x.ctx.handleBankDraftCallback_(callback(x,'catv','Đi chợ',12345,'stale-cat'));
 assert.equal(x.batches.length,n);assert.equal(l.writes(),1);assert.equal(l.rows[1][5],'Khác');assert.equal(l.rows[1][4],'ThuNhap');
});
test('submitted description sends a fresh Sheets receipt directly under user reply after verified commit, with editable ledger binding',()=>{
 const x=env({autoApprove:true});post(x,request(sample(undefined,undefined,sample().text.replace('40,000','312,000'))));const l=ledger(x);
 x.ctx.handleBankDraftCallback_(callback(x,'description'));const m=inputReply(x,'description','Sửa khóa yên xe',12345,19001);
 x.ctx.handleBankDraftReply_(m);assert.equal(l.writes(),1);assert.equal(l.rows[1][7],312000);assert.equal(l.rows[1][6],'Sửa khóa yên xe');
 const receipt=x.calls.find(c=>c.method==='sendMessage'&&c.payload.text.startsWith('✅ Đã ghi Sheets'));
 assert.ok(receipt);assert.equal(receipt.payload.reply_to_message_id,19001);assert.match(receipt.payload.text,/Chi 312\.000đ/);assert.match(receipt.payload.text,/#/);
 assert.notEqual(l.rows[1][16],String(draft(x).state.message_id));assert.equal(l.rows[1][10],String(draft(x).state.message_id));
 const receiptIndex=x.calls.indexOf(receipt),editIndex=x.calls.findIndex(c=>c.method==='editMessageText'&&c.payload.text.includes('Đã ghi sổ'));assert.ok(receiptIndex<editIndex);
 x.ctx.handleBankDraftReply_(m);assert.equal(l.writes(),1);assert.equal(x.calls.filter(c=>c.method==='sendMessage'&&c.payload.text.startsWith('✅ Đã ghi Sheets')).length,1);
});
test('fresh receipt cannot be emitted before Sheets flush and stored confirmation have completed',()=>{
 let x,l;
 x=env({autoApprove:true,onTelegram:(method,payload)=>{if(method==='sendMessage'&&payload.text.startsWith('✅ Đã ghi Sheets')){assert.equal(l.rows.length,2);assert.equal(draft(x).state.recorded,true);}}});
 post(x);l=ledger(x);x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k',12345,19002));assert.equal(l.writes(),1);
});
test('ambiguous edit commit produces no false success receipt and reports uncertainty under the user input',()=>{
 const x=env({autoApprove:true});post(x);const l=ledger(x,{onFlush:()=>{throw Error('ambiguous flush');}});
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k',12345,19003));assert.equal(l.writes(),1);
 assert.equal(x.calls.filter(c=>c.method==='sendMessage'&&c.payload.text.startsWith('✅ Đã ghi Sheets')).length,0);
 assert.match(x.calls.at(-1).payload.text,/Chưa xác minh ghi sổ/);assert.equal(x.calls.at(-1).payload.reply_to_message_id,19003);
});
test('failure editing the old message does not duplicate a delivered fresh receipt or claim ledger failure',()=>{
 const x=env({autoApprove:true,onTelegram:m=>{if(m==='editMessageText')throw Error('offline old message');}});post(x);const l=ledger(x);
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k',12345,19004));assert.equal(l.writes(),1);assert.equal(draft(x).state.recorded,true);
 assert.equal(x.calls.filter(c=>c.method==='sendMessage'&&c.payload.text.startsWith('✅ Đã ghi Sheets')).length,1);
 assert.ok(!x.calls.some(c=>/Chưa hoàn tất cập nhật|Chưa xác minh ghi sổ/.test(c.payload.text||'')));
 assert.equal(draft(x).state.learning.errors.at(-1).stage,'telegram_confirmation');
});
test('receipt transport failure leaves the original confirmation and durable ledger intact without a misleading retry note',()=>{
 const x=env({autoApprove:true,onTelegram:(method,payload)=>{if(method==='sendMessage'&&payload.text.startsWith('✅ Đã ghi Sheets'))throw Error('private transport payload');}});post(x);const l=ledger(x);
 x.ctx.handleBankDraftReply_(reply(x,'sửa tiền 3k',12345,19005));assert.equal(l.writes(),1);assert.equal(draft(x).state.recorded,true);
 assert.match(x.calls.filter(c=>c.method==='editMessageText').at(-1).payload.text,/Đã ghi sổ/);
 assert.equal(draft(x).state.learning.errors.at(-1).stage,'telegram_edit_receipt');assert.ok(!JSON.stringify(draft(x).state.learning).includes('private transport payload'));
 assert.ok(!x.calls.some(c=>/Chưa hoàn tất cập nhật/.test(c.payload.text||'')));
});
