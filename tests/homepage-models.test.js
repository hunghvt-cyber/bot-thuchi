const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function setup(){
 const props=new Map([['HOMEPAGE_STATS_SECRET','x'.repeat(32)]]),cache=new Map(),calls=[];
 const c={Date,JSON,Number,isFinite,getScriptProp_:k=>props.get(k),getGeminiApiKey:()=> 'test-key',CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},Utilities:{Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(p,s)=>[...crypto.createHmac('sha256',s).update(p).digest()]},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},UrlFetchApp:{fetch:(url,options)=>{calls.push({url,options});return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(url.includes(':generateContent')?{modelVersion:'gemini-3.5-flash-lite-001',candidates:[{finishReason:'STOP',content:{parts:[{text:'Tôi là 1.5 Pro'}]}}]}:{models:[{name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.1-flash-lite',supportedGenerationMethods:['generateContent']},{name:'models/gemini-pro-paid',supportedGenerationMethods:['generateContent']},{name:'models/gemini-2.5-flash-lite',supportedGenerationMethods:['embedContent']}]})};}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../GeminiShared.gs','utf8'),c);c.sharedGeminiQuota_=()=>{calls.push({quota:true});};
 function send(body,tamper=false){const payload=JSON.stringify({action:'homepage_chat',timestamp:Date.now(),...body});return JSON.parse(c.homepageChat_({payload:payload+(tamper?' ':''),signature:crypto.createHmac('sha256','x'.repeat(32)).update(payload).digest('hex')}).text);}
 return {c,calls,send};
}
test('catalog excludes unreviewed/non-text models, caches and consumes no generation quota',()=>{
 const {calls,send}=setup();assert.equal(send({operation:'models'},true).ok,false);assert.equal(calls.length,0);
 const data=send({operation:'models'});assert.deepEqual(data.models,['gemini-3.5-flash-lite','gemini-3.1-flash-lite']);send({operation:'models'});assert.equal(calls.length,1);assert.ok(!JSON.stringify(data).includes('test-key'));send({operation:'models',refresh:true});assert.equal(calls.length,2);
});
test('response modelVersion overrides self-description; selected model stays request-local',()=>{
 const {c,calls,send}=setup(),messages=[{role:'user',text:'Model nào?'}];
 const data=send({messages,model:'gemini-3.1-flash-lite'});assert.equal(data.ok,true);assert.equal(data.requestedModel,'gemini-3.1-flash-lite');assert.equal(data.modelVersion,'gemini-3.5-flash-lite-001');
 assert.match(calls.find(x=>x.url?.includes(':generateContent')).url,/gemini-3.1-flash-lite:generateContent$/);
 assert.equal(typeof c.sharedGemini_([{role:'user',parts:[{text:'receipt'}]}],true),'string');
 assert.match(calls.filter(x=>x.url?.includes(':generateContent')).at(-1).url,/gemini-3.5-flash-lite:generateContent$/);
});
test('removed/arbitrary models are rejected before generation or quota use',()=>{
 const {calls,send}=setup(),messages=[{role:'user',text:'Hello'}];
 for(const model of ['gemini-1.5-pro','../private','gemini-2.5-flash-lite'])assert.equal(send({messages,model}).reason,'MODEL_UNAVAILABLE');
 assert.equal(calls.filter(x=>x.quota||x.url?.includes(':generateContent')).length,0);
});
test('Google HTTP 404/429/503 use a single request without retry or fallback',()=>{
 for(const code of [404,429,503]){const {c}=setup();let calls=0;c.UrlFetchApp.fetch=()=>{calls++;return {getResponseCode:()=>code};};assert.throws(()=>c.sharedGeminiResult_([],false));assert.equal(calls,1);}
});
test('missing metadata never pretends requested model is verified',()=>{
 const {c}=setup();c.UrlFetchApp.fetch=()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'Hi'}]}}]})});assert.equal(c.sharedGeminiResult_([],false).modelVersion,null);
});
