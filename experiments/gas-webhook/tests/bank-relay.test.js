const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const root=__dirname+'/../';
function env(options={}){
 const values={BANK_RELAY_ENABLED:'YES',BANK_RELAY_MODE:'PREVIEW',BANK_RELAY_KEY:'a'.repeat(64),BANK_RELAY_OWNER_ID:'12345',BANK_RELAY_VERIFIED:'YES',FAMILY_GROUP_ID:'-10012345',ENABLE_FAMILY_WEBHOOK:'YES',RECEIPT_WEBHOOK_SECRET:'telegram-secret',...options.props};
 const calls=[];let locked=false,seq=100;
 const props={getProperty:k=>values[k]??null,setProperty:(k,v)=>{values[k]=v;return props;},deleteProperty:k=>delete values[k],getProperties:()=>({...values})};
 const ctx={Date,JSON,Number,String,Error,console,
  PropertiesService:{getScriptProperties:()=>props},
  LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>locked=false})},
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
 vm.createContext(ctx);
 for(const f of ['BankNotifications.gs','BankRelay.gs','Code.gs'])vm.runInContext(fs.readFileSync(root+f,'utf8'),ctx,{filename:f});
 return {ctx,values,calls,props};
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
test('relay succeeds with no Sheets access, original text visible',()=>{const x=env(),r=post(x);assert.equal(r.status,'sent');assert.match(x.calls[0].payload.text,/CHƯA GHI SHEETS/);assert.match(x.calls[0].payload.text,/40,000/);assert.equal(x.calls[0].payload.chat_id,'-10012345');assert.ok(!JSON.stringify(x.calls).includes('a'.repeat(64)));});
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
