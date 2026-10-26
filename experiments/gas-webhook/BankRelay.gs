/** Intake creates drafts only; ledger writes require separate owner approval. */
var BANK_TTL_=48*3600000;
var BANK_NOTIFICATION_MIN_AMOUNT_=1000;
var BANK_DRAFT_MARKER_='🧪 Nháp ngân hàng';
function bankIsDraftText_(text){text=String(text||'');return text.indexOf(BANK_DRAFT_MARKER_)===0||text.indexOf('🧪 BANK_DRAFT_V1')===0;}
function bankAmountText_(amount){return Number.isSafeInteger(amount)&&amount>0?String(amount).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'đ':'Chưa rõ số tiền';}
function bankSummary_(state){var t=state.tx;return (t.direction||'Chưa rõ Thu/Chi')+' '+bankAmountText_(t.amount)+' · '+t.source+' · '+(t.category||'Khác');}
function bankJson_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function bankDigest_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function bankEqual_(a,b){a=String(a||'');b=String(b||'');var d=a.length^b.length;for(var i=0;i<b.length;i++)d|=(a.charCodeAt(i)||0)^b.charCodeAt(i);return d===0;}
function bankLock_(fn){var l=LockService.getScriptLock();if(!l.tryLock(1500))throw new Error('bank_busy');try{return fn();}finally{l.releaseLock();}}
function bankReadEnvelope_(e){
  var raw=String(e&&e.postData&&e.postData.contents||'');
  if(raw.length>18000)throw new Error('invalid_request');
  // Fixed six-line header, then raw body. No JSON interpolation/escaping on Android.
  var p=raw.replace(/\r\n/g,'\n').split('\n');
  if(p.shift()!=='BANK-NOTIFY-1')throw new Error('invalid_request');
  var key=p.shift(),device=p.shift(),at=p.shift(),pkg=p.shift(),title=p.shift();
  if(!/^[A-Za-z0-9_-]{1,50}$/.test(device||'')||!/^\d{13}$/.test(at||'')||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/.test(pkg||'')||String(pkg||'').length>200||typeof title!=='string'||title.length>200)throw new Error('invalid_request');
  return {key:key,device:device,captured_at:Number(at),package_name:pkg,title:title,text:p.join('\n')};
}
function bankClean_(props,now){
  var all=props.getProperties();Object.keys(all).forEach(function(k){
    if(!/^BANK_(EVT|MSG)_/.test(k))return;
    var v;try{v=JSON.parse(all[k]);}catch(ignore){}
    var deadline=v?(/^BANK_EVT_/.test(k)?bankLogExpires_(v):Number(v.expires)):NaN;
    if(!isFinite(deadline)||deadline<=now)props.deleteProperty(k);
  });
}
function cleanupBankRelayState(){return bankLock_(function(){bankClean_(PropertiesService.getScriptProperties(),Date.now());return {ok:true};});}
function installBankRelayCleanup(){
  // Explicit setup only, never called by deployment or the HTTP entrypoint.
  var existing=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='cleanupBankRelayState';});
  if(!existing.length)ScriptApp.newTrigger('cleanupBankRelayState').timeBased().everyHours(1).create();
  return {ok:true};
}
function bankConfig_(){
  var p=PropertiesService.getScriptProperties(),key=p.getProperty('BANK_RELAY_KEY')||'';
  if(p.getProperty('BANK_RELAY_ENABLED')!=='YES'||p.getProperty('BANK_RELAY_MODE')!=='PREVIEW')throw new Error('disabled');
  var group=p.getProperty('FAMILY_GROUP_ID')||'',owner=p.getProperty('BANK_RELAY_OWNER_ID')||'';
  if(key.length<32||!/^\d+$/.test(owner)||!/^-[0-9]+$/.test(group)||!p.getProperty('RECEIPT_WEBHOOK_SECRET')||p.getProperty('ENABLE_FAMILY_WEBHOOK')!=='YES'||p.getProperty('BANK_RELAY_VERIFIED')!=='YES')throw new Error('not_configured');
  return {props:p,key:key,group:group,owner:owner};
}
function prepareBankRelayPreview(){
  // One-time explicit setup. Never returns a secret, never enables relay or changes group/token.
  var p=PropertiesService.getScriptProperties();
  if(!p.getProperty('BANK_RELAY_KEY'))p.setProperty('BANK_RELAY_KEY',Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''));
  if(!p.getProperty('BANK_RELAY_MODE'))p.setProperty('BANK_RELAY_MODE','PREVIEW');
  if(!p.getProperty('BANK_RELAY_ENABLED'))p.setProperty('BANK_RELAY_ENABLED','NO');
  if(!p.getProperty('BANK_RELAY_VERIFIED'))p.setProperty('BANK_RELAY_VERIFIED','NO');
  return {ok:true,keyConfigured:(p.getProperty('BANK_RELAY_KEY')||'').length>=32,enabled:p.getProperty('BANK_RELAY_ENABLED')==='YES'};
}
function inspectBankRelayReadiness(){
  var p=PropertiesService.getScriptProperties(),me=telegramApi_('getMe',{}).result||{},info=getWebhookInfo().result||{};
  var ok=me.username==='PoormanTest0219_bot'&&info.url===getWebAppUrl()&&!!p.getProperty('RECEIPT_WEBHOOK_SECRET')&&!!p.getProperty('FAMILY_GROUP_ID')&&/^\d+$/.test(p.getProperty('BANK_RELAY_OWNER_ID')||'');
  if(ok){var m=telegramApi_('getChatMember',{chat_id:p.getProperty('FAMILY_GROUP_ID'),user_id:me.id}).result||{};ok=m.status!=='left'&&m.status!=='kicked'&&!!m.status;}
  p.setProperty('BANK_RELAY_VERIFIED',ok?'YES':'NO');
  return {ok:ok,bot:me.username||'',keyConfigured:(p.getProperty('BANK_RELAY_KEY')||'').length>=32,mode:p.getProperty('BANK_RELAY_MODE')||'',enabled:p.getProperty('BANK_RELAY_ENABLED')==='YES'};
}
function bankDraftText_(state){
  var t=state.tx,description=String(t.description||'').replace(/\s+/g,' ').trim();
  if(description===t.direction)description='';
  return BANK_DRAFT_MARKER_+(state.deleted?' — ĐÃ XÓA':'')+'\n'+bankSummary_(state)+'\n'+
    (description?description.slice(0,100)+'\n':'')+'Chưa ghi Sheets · Nút → Dán → nhập → Gửi';
}
/** Opt-in file-spool ACK; v1 JSON clients remain unchanged. */
function bankRelayAck_(e,value){
  if(!e||!e.parameter||e.parameter.ack!=='2')return bankJson_(value);
  var status=String(value.status||'invalid_request');
  if(!/^(sent|duplicate_sent|ignored|pending|uncertain|unauthorized|expired_or_future|disabled|not_configured|bank_busy|bank_capacity|invalid_request)$/.test(status))status='invalid_request';
  var raw=String(e.postData&&e.postData.contents||'');
  return ContentService.createTextOutput('BANK-ACK-2\n'+bankDigest_(raw)+'\n'+status+'\nEND_BANK_ACK_2\n').setMimeType(ContentService.MimeType.TEXT);
}
function bankRelayPost_(e){
  var cfg,event,key,state;
  function reply(value){return bankRelayAck_(e,value);}
  try{
    cfg=bankConfig_();event=bankReadEnvelope_(e);
    if(!bankEqual_(event.key,cfg.key))return reply({ok:false,status:'unauthorized'});
    var now=Date.now();if(event.captured_at>now+300000||event.captured_at+BANK_TTL_<=now)return reply({ok:false,status:'expired_or_future'});
    // Donation retry occurs before existing BANK_EVT dedupe, so a lost ACK can reconcile the separate store.
    if(typeof donationIngest_==='function'){
      try{donationIngest_(event);}catch(donationError){return reply({ok:false,status:'bank_busy'});}
    }
    var tx;
    // Exact request identity includes receipt time, source, title and complete content; never amount-only.
    key='BANK_EVT_'+bankDigest_([event.device,event.captured_at,event.package_name,event.title,event.text].join('\n'));
    var claimed=bankLock_(function(){
      bankClean_(cfg.props,now);var existing=cfg.props.getProperty(key);
      if(existing)return {existing:JSON.parse(existing)};
      var all=cfg.props.getProperties(),used=Object.keys(all).reduce(function(n,k){return n+2*(k.length+all[k].length);},0);
      if(used>300000)throw new Error('bank_capacity');
      state={id:Utilities.getUuid().replace(/-/g,'').slice(0,12),status:'pending',created:now,captured_at:event.captured_at,expires:event.captured_at+BANK_TTL_,group:cfg.group,owner:cfg.owner,tx:null,original:(event.title+'\n'+event.text).slice(0,1200)};
      cfg.props.setProperty(key,JSON.stringify(state));return {state:state};
    });
    if(claimed.existing)return reply({ok:claimed.existing.status==='sent'||claimed.existing.status==='ignored',status:claimed.existing.status==='sent'?'duplicate_sent':claimed.existing.status,event_id:claimed.existing.id});
    state=claimed.state;
    tx=bankDetect_(event);
    // Telegram draft policy only: exact recognized amount, regardless of bank/direction/parser.
    // Unknown amounts remain review drafts. Donation projection and manual entries are separate.
    if(tx.status==='recognized'&&Number.isSafeInteger(tx.amount)&&tx.amount>0&&tx.amount<BANK_NOTIFICATION_MIN_AMOUNT_){
      tx.status='ignored';tx.reason='below_notification_minimum';
    }
    state.tx=tx;bankLearnStart_(state,tx);
    if(tx.status==='ignored'){state.status='ignored';bankLock_(function(){cfg.props.setProperty(key,JSON.stringify(state));});return reply({ok:true,status:'ignored',reason:tx.reason});}
    bankLock_(function(){cfg.props.setProperty(key,JSON.stringify(state));});
    try{
      var sent=telegramApi_('sendMessage',{chat_id:String(cfg.group),text:bankDraftText_(state),reply_markup:bankKeyboard_(state,false)});
      if(!sent.result||!sent.result.message_id)throw new Error('no_message_id');
      bankLock_(function(){state.status='sent';state.message_id=sent.result.message_id;
        cfg.props.setProperty(key,JSON.stringify(state));
        cfg.props.setProperty('BANK_MSG_'+cfg.group+'_'+state.message_id,JSON.stringify({eventKey:key,expires:state.expires}));});
      return reply({ok:true,status:'sent',event_id:state.id,message_id:state.message_id});
    }catch(sendError){
      // Telegram may have accepted the request. Never blindly resend after ambiguous failure.
      try{bankLock_(function(){var s=JSON.parse(cfg.props.getProperty(key)||'null');if(s&&s.status!=='sent'){s.status='uncertain';bankLearnError_(s,'telegram_send',sendError);cfg.props.setProperty(key,JSON.stringify(s));}});}catch(ignore){}
      return reply({ok:false,status:'uncertain',event_id:state.id});
    }
  }catch(err){return reply({ok:false,status:/^(disabled|not_configured|bank_busy|bank_capacity)$/.test(err.message)?err.message:'invalid_request'});}
}
function bankReplyNote_(msg,text){telegramApi_('sendMessage',{chat_id:String(msg.chat.id),reply_to_message_id:msg.message_id,text:BANK_DRAFT_MARKER_+'\n'+text+'\nChưa ghi Sheets.'});}
function handleBankDraftReply_(msg){
  var reply=msg&&msg.reply_to_message;
  if(!reply||!bankIsDraftText_(reply.text))return false;
  // Always consume even expired/unknown bank drafts; never fall through to the ledger parser.
  var p=PropertiesService.getScriptProperties(),map,key,state,wantsCommit=false;
  try{
    map=JSON.parse(p.getProperty('BANK_MSG_'+msg.chat.id+'_'+reply.message_id)||'null');
    if(!map||map.expires<=Date.now()) {bankReplyNote_(msg,'Bản nháp đã hết hạn hoặc không còn khả dụng.');return true;}
    key=map.eventKey;
    var changed=bankLock_(function(){
      state=JSON.parse(p.getProperty(key)||'null');
      if(!state||state.expires<=Date.now()||String(state.group)!==String(msg.chat.id))return 'expired';
      if(String(state.owner)!==String(msg.from&&msg.from.id))return 'owner_only';
      if(state.recorded)return 'recorded';
      if((state.edit_ids||[]).indexOf(String(msg.message_id))>=0)return 'duplicate';
      if(state.editing&&(!state.editing_at||Date.now()-state.editing_at<120000))return 'busy';
      var before=bankLearnSnapshot_(state.tx);
      var cmd=String(msg.text||'').trim();
      if(map.inputKind&&/^hủy$/iu.test(cmd)){p.deleteProperty('BANK_MSG_'+msg.chat.id+'_'+reply.message_id);return 'cancelled';}
      if(map.inputKind==='money')cmd='sửa tiền '+cmd;
      if(map.inputKind==='description')cmd='sửa nội dung '+cmd;
      var m=cmd.match(/^sửa\s+(tiền|số tiền|nội dung|danh mục|loại)\s+([^]+)$/iu);
      if(/^(xóa|xoá)$/iu.test(cmd))state.deleted=true;
      else if(/^khôi phục$/iu.test(cmd))state.deleted=false;
      else if(m){
        if(state.deleted)return 'restore_first';
        m[1]=m[1].toLowerCase();var value=m[2].trim();
        if(m[1]==='tiền'||m[1]==='số tiền'){
          var plain=value.toLowerCase().replace(/\s*(?:vnd|đ|₫)$/iu,'').trim();
          var money=/^\d+$/.test(plain)?Number(plain):/^\d{1,3}(?:[.,]\d{3})+$/.test(plain)?bankMoney_(plain,plain.indexOf(',')>=0?',':'.'):/^\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|tr|triệu|củ)(?:\d{1,3})?$/u.test(plain)?parseMoneyLocal_(plain):null;
          if(!Number.isSafeInteger(money)||money<=0||money>1000000000000)return 'invalid_amount';state.tx.amount=money;
        }else if(m[1]==='nội dung'){if(value.length>400)return 'too_long';state.tx.description=value;}
        else if(m[1]==='danh mục'){
          var cat=FAMILY_CATEGORIES.filter(function(c){return c.toLowerCase()===value.toLowerCase();})[0];
          if(!cat)return 'invalid_category';state.tx.category=cat;
        }else{if(!/^(thu|chi)$/iu.test(value))return 'invalid_direction';state.tx.direction=/^thu$/iu.test(value)?'Thu':'Chi';}
      }else return 'help';
      wantsCommit=!!m;
      bankLearnChange_(state,before,/^(xóa|xoá)$/iu.test(cmd)?'delete':/^khôi phục$/iu.test(cmd)?'restore':'reply_edit');
      state.editing=true;state.editing_at=Date.now();state.edit_ids=(state.edit_ids||[]).concat(String(msg.message_id)).slice(-20);
      p.setProperty(key,JSON.stringify(state));return 'updated';
    });
    if(changed==='duplicate')return true;
    if(changed==='recorded'){telegramApi_('sendMessage',{chat_id:String(msg.chat.id),reply_to_message_id:msg.message_id,text:'Giao dịch đã ghi sổ. Reply tin xác nhận để sửa hoặc xóa.'});return true;}
    if(changed!=='updated'){bankReplyNote_(msg,{recorded:'Đã ghi sổ. Reply tin xác nhận mới để sửa hoặc xóa.',cancelled:'Đã hủy nhập.',owner_only:'Chỉ chủ thiết bị đã cấu hình được sửa.',busy:'Bản nháp đang được cập nhật, thử lại sau.',restore_first:'Khôi phục bản nháp trước khi sửa.',invalid_amount:'Số tiền không hợp lệ.',invalid_category:'Sửa danh mục '+FAMILY_CATEGORIES.join(' / '),invalid_direction:'Dùng sửa loại thu hoặc sửa loại chi.',too_long:'Nội dung tối đa 400 ký tự.',expired:'Bản nháp hết hạn.',help:'Dùng các nút dưới tin nháp để sửa tiền, nội dung, danh mục, thu/chi hoặc xóa.'}[changed]||'Không cập nhật được bản nháp.');return true;}
    if(wantsCommit&&bankAutoCommitAfterEdit_(msg.from,key,state,null,msg.message_id))return true;
    var editError=null;
    try{
      var newText=bankDraftText_(state);
      if(map.inputKind||String(reply.text||'')!==newText)telegramApi_('editMessageText',{chat_id:String(state.group),message_id:state.message_id,text:newText,reply_markup:bankKeyboard_(state,false)});
    }catch(err){
      // Telegram rejects an identical edit; the requested display is already present.
      if(!/message is not modified/i.test(String(err&&err.message||'')))editError=err;
    }finally{bankLock_(function(){var latest=JSON.parse(p.getProperty(key)||'null');if(latest){
      latest.editing=false;
      if(editError){bankLearnError_(latest,'telegram_edit',editError);var detail=String(editError.message||''),code=detail.match(/HTTP (\d{3})/);latest.last_edit_error={at:Date.now(),kind:/429|retry after/i.test(detail)?'rate_limited':/not found/i.test(detail)?'not_found':/403|forbidden/i.test(detail)?'forbidden':'transport_or_api',http:code?Number(code[1]):null};}
      else delete latest.last_edit_error;
      p.setProperty(key,JSON.stringify(latest));
    }});}
    if(editError)bankReplyNote_(msg,'Đã lưu nháp: '+bankSummary_(state)+'. Tin gốc chưa xác minh cập nhật; Reply tin gốc để thử lại.');
    else bankReplyNote_(msg,state.deleted?'Đã xóa nháp.':'Đã sửa nháp: '+bankSummary_(state));
  }catch(err){try{bankReplyNote_(msg,'Chưa hoàn tất cập nhật bản nháp, thử lại sau.');}catch(ignore){}}
  return true;
}

