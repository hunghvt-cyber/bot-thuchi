const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function response(code,body){return {getResponseCode:()=>code,getContentText:()=>typeof body==='string'?body:JSON.stringify(body)};}
function runtime(options={}){
 const batches=[];let serial=0,tokenReads=0;
 const c={JSON,Error,getBotToken:()=>{tokenReads++;return options.missingToken?'':'unit-token';},UrlFetchApp:{fetch:()=>{serial++;throw Error('Unexpected serial request');},fetchAll:requests=>{batches.push(requests);if(options.networkError)throw Error('private token unit-token connection error');return options.responses||[response(200,{ok:true,result:true}),response(200,{ok:true,result:{message_id:789}})];}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../TelegramClient.gs','utf8'),c);
 return {c,batches,serial:()=>serial,tokenReads:()=>tokenReads};
}
test('real transport dispatches ack and UI in one fetchAll with one token read and preserves UI message ID',()=>{
 const x=runtime(),payload={chat_id:'-100',text:'Sửa tiền',reply_markup:{force_reply:true}};
 const result=x.c.telegramCallbackUi_('cb-1','sendMessage',payload);
 assert.equal(x.batches.length,1);assert.equal(x.batches[0].length,2);assert.equal(x.serial(),0);assert.equal(x.tokenReads(),1);assert.equal(result.result.message_id,789);
 assert.ok(x.batches[0][0].url.endsWith('/answerCallbackQuery'));assert.ok(x.batches[0][1].url.endsWith('/sendMessage'));
 assert.deepEqual(JSON.parse(x.batches[0][0].payload),{callback_query_id:'cb-1'});assert.deepEqual(JSON.parse(x.batches[0][1].payload),payload);
 for(const request of x.batches[0]){assert.equal(request.method,'post');assert.equal(request.muteHttpExceptions,true);assert.equal(request.contentType,'application/json');}
});
test('stale or malformed acknowledgement cannot hide a successful independent UI operation',()=>{
 for(const first of [response(400,{ok:false,description:'query too old'}),response(502,'not JSON')]){
  const x=runtime({responses:[first,response(200,{ok:true,result:{message_id:9}})]});assert.equal(x.c.telegramCallbackUi_('cb','editMessageText',{}).result.message_id,9);assert.equal(x.batches.length,1);
 }
});
test('UI failure is propagated independently of ack success and never exposes raw Telegram error body',()=>{
 const x=runtime({responses:[response(200,{ok:true}),response(429,{ok:false,description:'private unit-token payload'})]});
 assert.throws(()=>x.c.telegramCallbackUi_('cb','editMessageText',{}),err=>/HTTP 429/.test(err.message)&&!err.message.includes('unit-token')&&!err.message.includes('payload'));
 assert.equal(x.batches.length,1);assert.equal(x.serial(),0);
});
test('not-modified remains recognizable to existing success handling',()=>{
 const x=runtime({responses:[response(200,{ok:true}),response(400,{ok:false,description:'Bad Request: message is not modified'})]});
 assert.throws(()=>x.c.telegramCallbackUi_('cb','editMessageReplyMarkup',{}),/message is not modified/);
});
test('network, malformed or incomplete batches never retry potentially accepted sendMessage',()=>{
 for(const options of [{networkError:true},{responses:[response(200,{ok:true})]},{responses:[response(200,{ok:true}),response(502,'broken JSON')]}]){
  const x=runtime(options);assert.throws(()=>x.c.telegramCallbackUi_('cb','sendMessage',{}),err=>!err.message.includes('unit-token'));
  assert.equal(x.batches.length,1);assert.equal(x.serial(),0);
 }
});
test('invalid method or missing token fails before any network request',()=>{
 const x=runtime();assert.throws(()=>x.c.telegramCallbackUi_('cb','deleteWebhook',{}),/Invalid/);assert.equal(x.batches.length,0);
 const y=runtime({missingToken:true});assert.throws(()=>y.c.telegramCallbackUi_('cb','sendMessage',{}),/BOT_TOKEN/);assert.equal(y.batches.length,0);
});
