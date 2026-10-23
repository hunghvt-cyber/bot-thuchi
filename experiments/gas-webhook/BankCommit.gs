/** Only an explicit owner approval can write a bank draft to Transactions. */
function bankCell_(value){var text=String(value||'');return /^\s*[=+@-]/.test(text)?"'"+text:text;}
function bankApprovalError_(state){
  if(state.deleted)return 'Khôi phục bản nháp trước khi duyệt.';
  var t=state.tx||{};
  if(!Number.isSafeInteger(t.amount)||t.amount<=0||t.amount>1000000000000)return 'Sửa số tiền trước khi duyệt.';
  if(!/^(Thu|Chi)$/.test(t.direction))return 'Chọn Thu hoặc Chi trước khi duyệt.';
  if(FAMILY_CATEGORIES.indexOf(t.category)<0)return 'Chọn danh mục trước khi duyệt.';
  return '';
}
function bankCommit_(key,actor){
  return bankLock_(function(){
    var cfg=bankConfig_(),p=cfg.props,s=JSON.parse(p.getProperty(key)||'null');
    if(!s||s.expires<=Date.now()||s.owner!==String(actor.id)||s.owner!==cfg.owner||s.group!==cfg.group)throw Error('approval_unavailable');
    if(bankApprovalError_(s))throw Error('approval_invalid');
    var sh=familySheet_(),dedupe='bank:'+key.replace(/^BANK_EVT_/,''),last=sh.getLastRow(),found;
    // Shared ScriptLock covers check+append, including manual/receipt writers.
    // DedupeKey persists in the ledger after temporary event state expires.
    if(last>1){
      var keys=sh.getRange(2,14,last-1,1).getValues();
      for(var i=0;i<keys.length;i++)if(String(keys[i][0])===dedupe){found=sh.getRange(i+2,1,1,18).getValues()[0];break;}
    }
    if(!found){
      var t=s.tx,now=new Date(),when=t.transaction_iso?new Date(t.transaction_iso):new Date(s.captured_at||s.created);
      if(!isFinite(when.getTime()))throw Error('approval_invalid_date');
      var id=bankDigest_(key).slice(0,32),payer=((actor.first_name||'')+' '+(actor.last_name||'')).trim()||actor.username||s.owner;
      found=[when,Utilities.formatDate(when,'Asia/Ho_Chi_Minh','dd/MM/yyyy'),s.owner,bankCell_(payer),t.direction==='Thu'?'ThuNhap':'ChiTieu',t.category,
        bankCell_(t.description||'Không rõ mục đích'),t.amount,'VND',s.group,String(s.message_id),'bank',id,dedupe,'Ngân hàng: '+t.source,'ACTIVE',String(s.message_id),now];
      sh.appendRow(found);
      SpreadsheetApp.flush();
    }
    // A timeout after append can leave the row without this state; next click finds it.
    s.tx.amount=Number(found[7]);s.tx.direction=found[4]==='ThuNhap'?'Thu':'Chi';s.tx.category=String(found[5]);s.tx.description=String(found[6]);
    s.recorded=true;s.ledger_id=String(found[12]);s.ledger_status=String(found[15]||'ACTIVE');s.editing=false;
    var learning=bankLearnEnsure_(s);if(!learning.approved_at){learning.approved_at=Date.now();learning.approved=bankLearnSnapshot_(s.tx);}bankLearnFit_(s);
    p.setProperty(key,JSON.stringify(s));return s;
  });
}
function bankApprovedText_(state){
  return (state.ledger_status==='DELETED'?'✅ Giao dịch đã xóa':'✅ Đã ghi sổ')+'\n'+bankSummary_(state)+'\n'+String(state.tx.description||'Không rõ mục đích').replace(/\s+/g,' ').slice(0,100)+'\n#'+state.ledger_id.slice(0,8);
}
function bankApproveCallback_(cb,key,state){
  var saved;
  try{saved=bankCommit_(key,cb.from);}catch(err){
    bankLock_(function(){var p=PropertiesService.getScriptProperties(),s=JSON.parse(p.getProperty(key)||'null');if(s){s.editing=false;bankLearnError_(s,'ledger_approval',err);p.setProperty(key,JSON.stringify(s));}});
    telegramApi_('sendMessage',{chat_id:String(state.group),reply_to_message_id:state.message_id,
      text:BANK_DRAFT_MARKER_+'\nChưa xác minh ghi sổ. Bấm Duyệt lại để kiểm tra; hệ thống không ghi lặp cùng nháp.'});return;
  }
  try{telegramApi_('editMessageText',{chat_id:String(saved.group),message_id:saved.message_id,text:bankApprovedText_(saved),reply_markup:{inline_keyboard:[]}});}
  catch(err){if(!/message is not modified/i.test(String(err.message||''))){
    bankLearnStoredError_(key,'telegram_confirmation',err);
    var sent=telegramApi_('sendMessage',{chat_id:String(saved.group),reply_to_message_id:saved.message_id,text:bankApprovedText_(saved)});
    if(sent.result&&sent.result.message_id)bankLock_(function(){
      var sh=familySheet_(),last=sh.getLastRow(),rows=last>1?sh.getRange(2,13,last-1,1).getValues():[];
      for(var i=0;i<rows.length;i++)if(String(rows[i][0])===saved.ledger_id){sh.getRange(i+2,17).setValue(String(sent.result.message_id));break;}
    });
  }}
}
