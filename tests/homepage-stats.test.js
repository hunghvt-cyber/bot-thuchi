const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function fixture() {
 const secret='test-only-secret-at-least-32-characters';let reads=0;
 const row=(day,amount,status='',group='old')=>{const r=[];r[0]=new Date('2026-09-01T00:00:00Z');r[1]=day;r[2]='1';r[3]='A';r[4]='ChiTieu';r[5]='Khác';r[7]=amount;r[9]=group;r[15]=status;return r;};
 const rows=[[],row('09/10/2026',2400000,'','new'),row(new Date('2026-10-10T00:00:00Z'),3550000,'','new'),row('2026-10-10',500000),row('08/10/2026',40000),row('10/10/2026',10000,'DELETED'),row('31/09/2026',999),row('',999),row('01/11/2026',999)];
 const ctx={PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},Utilities:{Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(p,s)=>[...crypto.createHmac('sha256',s).update(p).digest()],formatDate:(d,tz)=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const v=t=>p.find(x=>x.type===t).value;return v('year')+'-'+v('month')+'-'+v('day');}},familySpreadsheet_:()=>{reads++;return {getSpreadsheetTimeZone:()=> 'Etc/GMT',getSheetByName:name=>{assert.equal(name,'Transactions');return {getDataRange:()=>({getValues:()=>rows})};}};}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('HomepageStats.gs','utf8'),ctx);
 const sign=p=>crypto.createHmac('sha256',secret).update(p).digest('hex');
 const payload=JSON.stringify({month:'2026-10',timestamp:Date.now()});
 return {ctx,payload,sign,reads:()=>reads};
}
test('reports all groups using Date, excludes deleted and invalid dates',()=>{
 const {ctx,payload,sign}=fixture(),data=JSON.parse(ctx.homepageStats_({payload,signature:sign(payload)}).text);
 assert.equal(data.ok,true);assert.deepEqual(data.transactions.map(r=>[r.day,r.amount]),[['2026-10-09',2400000],['2026-10-10',3550000],['2026-10-10',500000],['2026-10-08',40000]]);
 assert.equal(data.transactions.reduce((sum,r)=>sum+r.amount,0),6490000);
});
test('rejects invalid signatures and expired requests before reading',()=>{
 const f=fixture();assert.equal(JSON.parse(f.ctx.homepageStats_({payload:f.payload,signature:'bad'}).text).ok,false);
 const expired=JSON.stringify({month:'2026-10',timestamp:Date.now()-120000});
 assert.equal(JSON.parse(f.ctx.homepageStats_({payload:expired,signature:f.sign(expired)}).text).ok,false);assert.equal(f.reads(),0);
});
test('missing sheet does not create or initialize ledger',()=>{
 const f=fixture();f.ctx.familySpreadsheet_=()=>({getSheetByName:()=>null,insertSheet:()=>{throw Error('must not write');}});
 assert.equal(JSON.parse(f.ctx.homepageStats_({payload:f.payload,signature:f.sign(f.payload)}).text).ok,false);
});
test('Date objects preserve spreadsheet calendar date including positive timezone',()=>{
 const f=fixture();assert.equal(f.ctx.homepageLedgerDay_(new Date('2026-10-09T17:00:00Z'),'Asia/Ho_Chi_Minh'),'2026-10-10');
});
