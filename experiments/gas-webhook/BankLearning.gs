/** Bounded learning notes live inside the existing 48h bank event, never a new Sheet. */
function bankLearnSnapshot_(tx){
  tx=tx||{};return {source:String(tx.source||'').slice(0,32),amount:Number.isSafeInteger(tx.amount)?tx.amount:null,
    direction:String(tx.direction||''),category:String(tx.category||''),description:String(tx.description||'').slice(0,80),description_hash:bankDigest_(String(tx.description||'')).slice(0,12),
    status:String(tx.status||''),reason:String(tx.reason||'').slice(0,64),parser:tx.parser==='gemini'?'gemini':tx.status==='recognized'?'local':'review_or_ignored'};
}
function bankLearnStart_(s,tx){if(!s.learning){s.learning={version:1,initial:bankLearnSnapshot_(tx),history:[],errors:[],dropped:0};if(tx.reason==='gemini_unavailable_or_invalid')s.learning.errors.push({at:Date.now(),stage:'parser',kind:'gemini_unavailable_or_invalid',http:null});bankLearnFit_(s);}}
function bankLearnEnsure_(s){
  // Earlier deployments overwrote draft values. Never invent their original AI result.
  if(!s.learning)s.learning={version:1,initial:null,legacy:true,history:[],errors:[],dropped:0};
  return s.learning;
}
function bankLearnFit_(s){
  var l=s.learning;if(!l)return;
  while(l.history.length>8){l.history.shift();l.dropped++;}
  while(l.errors.length>4)l.errors.shift();
  function bytes(){return encodeURIComponent(JSON.stringify(s)).replace(/%[0-9A-F]{2}|./g,'x').length;}
  while(bytes()>7800&&l.history.length){l.history.shift();l.dropped++;}
  while(bytes()>7800&&l.errors.length)l.errors.shift();
}
function bankLearnChange_(s,before,action){
  var after=bankLearnSnapshot_(s.tx),fields={},changed=false;
  ['amount','direction','category','description'].forEach(function(k){if(before[k]!==after[k]||(k==='description'&&before.description_hash!==after.description_hash)){fields[k]={from:before[k],to:after[k]};changed=true;}});
  if(!changed&&action!=='delete'&&action!=='restore')return;
  var l=bankLearnEnsure_(s);l.history.push({at:Date.now(),action:action,fields:fields});bankLearnFit_(s);
}
function bankLearnError_(s,stage,err){
  var message=String(err&&err.message||''),http=message.match(/HTTP (\d{3})/),l=bankLearnEnsure_(s);
  // Do not persist API error bodies, tokens, URLs or notification contents in error notes.
  l.errors.push({at:Date.now(),stage:stage,kind:/429|quota|retry after/i.test(message)?'quota_or_rate_limit':/403|forbidden/i.test(message)?'forbidden':/not found/i.test(message)?'not_found':'unavailable_or_uncertain',http:http?Number(http[1]):null});bankLearnFit_(s);
}
function bankLearnStoredError_(key,stage,err){
  try{bankLock_(function(){var p=PropertiesService.getScriptProperties(),s=JSON.parse(p.getProperty(key)||'null');if(s&&s.expires>Date.now()){bankLearnError_(s,stage,err);p.setProperty(key,JSON.stringify(s));}});}catch(ignore){}
}
function bankLearnOutcome_(s,now){
  if(s.recorded)return 'đã duyệt';if(s.status==='ignored')return 'bỏ qua tự động';if(s.deleted)return 'đã xóa nháp';
  return s.expires<=now?'hết hạn, chưa duyệt':'chưa duyệt';
}
function bankLearnValues_(tx){return (tx.direction||'?')+' '+bankAmountText_(tx.amount)+' · '+(tx.category||'Khác');}
function handleBankLogCommand_(msg){
  var match=String(msg&&msg.text||'').trim().match(/^\/banklog(?:@PoormanTest0219_bot)?(?:\s+([a-f0-9]{12}|[1-9]\d{0,2}))?$/i);
  if(!match)return false;
  var p=PropertiesService.getScriptProperties(),owner=p.getProperty('BANK_RELAY_OWNER_ID'),group=p.getProperty('FAMILY_GROUP_ID');
  if(!owner||!group||String(msg.from&&msg.from.id)!==owner||String(msg.chat&&msg.chat.id)!==group)return true;
  var now=Date.now(),states=bankLock_(function(){var all=p.getProperties();return Object.keys(all).filter(function(k){return /^BANK_EVT_/.test(k);}).map(function(k){try{return JSON.parse(all[k]);}catch(ignore){return null;}}).filter(function(s){return s&&s.group===group&&s.owner===owner&&s.expires>now;});});
  states.sort(function(a,b){return b.created-a.created;});var text;
  if(match[1]&&/^[a-f0-9]{12}$/i.test(match[1])){
    var s=states.filter(function(s){return s.id===match[1].toLowerCase();})[0];
    if(!s)text='Không tìm thấy log còn hạn 48 giờ.';
    else{
      var l=s.learning||{},initial=l.initial;
      text='BANK LOG · '+s.id+' · '+String(s.tx&&s.tx.source||'?')+' · '+bankLearnOutcome_(s,now)+'\nBan đầu: '+(initial?bankLearnValues_(initial)+' · '+initial.parser+(initial.reason?' ('+initial.reason+')':''):'chưa có bản gốc nhận diện (nháp cũ)')+
        '\nNội dung ban đầu: '+String(initial&&initial.description||'chưa lưu')+'\nHiện tại: '+bankLearnValues_(s.tx||{})+'\nNội dung: '+String(s.tx&&s.tx.description||'').slice(0,160)+
        '\nLần sửa: '+(l.history||[]).map(function(h){return h.action+' '+Object.keys(h.fields).map(function(k){return k+': '+h.fields[k].from+' → '+h.fields[k].to;}).join('; ');}).join('\n')+
        (l.dropped?'\nĐã lược bớt '+l.dropped+' lần sửa cũ.':'')+'\nLỗi: '+(l.errors||[]).map(function(e){return e.stage+'/'+e.kind+(e.http?' HTTP '+e.http:'');}).join(', ')+
        '\nGốc (trích):\n'+String(s.original||'').slice(0,900);
    }
  }else{
    var approved=states.filter(function(s){return s.recorded;}).length,changed=states.filter(function(s){return s.learning&&s.learning.history.length;}).length;
    var page=Math.min(Number(match[1])||1,Math.max(1,Math.ceil(states.length/8))),start=(page-1)*8;
    text='BANK LOG · cửa sổ 48 giờ\n'+states.length+' thông báo · '+approved+' đã duyệt · '+changed+' có sửa/xóa nháp.\nChưa duyệt không có nghĩa nhận diện sai.\n'+states.slice(start,start+8).map(function(s){return s.id+' · '+String(s.tx&&s.tx.source||'?')+' · '+bankLearnValues_(s.tx||{})+' · '+bankLearnOutcome_(s,now);}).join('\n')+'\nTrang '+page+'/'+Math.max(1,Math.ceil(states.length/8))+' · /banklog 2 để đổi trang.\nXem chi tiết: /banklog mã';
  }
  telegramApi_('sendMessage',{chat_id:group,text:text.slice(0,3800)});return true;
}
