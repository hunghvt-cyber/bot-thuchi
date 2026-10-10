const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
test('signed statistics only include configured group, active rows and Vietnam month',()=>{
 const secret='test-only-secret-at-least-32-characters';let reads=0;
 const row=(date,status='',group='family',type='ChiTieu')=>{const r=[];r[0]=date;r[2]='1';r[3]='A';r[4]=type;r[5]='Ăn uống';r[7]=35000;r[9]=group;r[15]=status;return r;};
 const ctx={PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},Utilities:{Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(p,s)=>[...crypto.createHmac('sha256',s).update(p).digest()],formatDate:d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)},familyGroupId_:()=> 'family',familySpreadsheet_:()=>{reads++;return {getSheetByName:name=>{assert.equal(name,'Transactions');return {getDataRange:()=>({getValues:()=>[[],row('2026-09-30T18:00:00Z'),row('2026-10-10T00:00:00Z','DELETED'),row('2026-10-10T00:00:00Z','','other'),row('2026-10-31T18:00:00Z')]})};}};}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('HomepageStats.gs','utf8'),ctx);
 const payload=JSON.stringify({month:'2026-10',timestamp:Date.now()}),signature=crypto.createHmac('sha256',secret).update(payload).digest('hex');
 assert.equal(JSON.parse(ctx.homepageStats_({payload,signature:'bad'}).text).ok,false);assert.equal(reads,0);
 const data=JSON.parse(ctx.homepageStats_({payload,signature}).text);assert.equal(data.ok,true);assert.equal(data.transactions.length,1);assert.equal(data.transactions[0].day,'2026-10-01');
 const expiredPayload=JSON.stringify({month:'2026-10',timestamp:Date.now()-120000});
 assert.equal(JSON.parse(ctx.homepageStats_({payload:expiredPayload,signature:crypto.createHmac('sha256',secret).update(expiredPayload).digest('hex')}).text).ok,false);assert.equal(reads,1);
 ctx.familySpreadsheet_=()=>({getSheetByName:()=>null,insertSheet:()=>{throw new Error('Reporting must not create a sheet');}});
 assert.equal(JSON.parse(ctx.homepageStats_({payload,signature}).text).ok,false);
});
