function isFamilyGroupAllowed_(chatId) {
  var configured=familyGroupId_();
  return !configured || String(chatId)===String(configured);
}

function handleFamilyMessage_(msg) {
  var chatId=msg.chat.id, text=String(msg.text||'').trim();
  if(!isFamilyGroupAllowed_(chatId)) return true;
  if(!text) return false;

  var cmd=text.split(/\s+/)[0].split('@')[0].toLowerCase();
  if(cmd==='/start'||cmd==='/help'){
    sendText(chatId,'<b>Poorman Family Expense Bot</b>\nNhắn tự nhiên: <code>cafe 35k</code>, <code>đi chợ 420k</code>.\nLệnh: /today, /month, /mine, /whoami');
    return true;
  }
  if(cmd==='/whoami'){ sendText(chatId,'User ID: <code>'+msg.from.id+'</code>\nGroup ID: <code>'+chatId+'</code>'); return true; }
  if(cmd==='/today'){sendText(chatId,familySummary_('today'));return true;}
  if(cmd==='/month'){sendText(chatId,familySummary_('month'));return true;}
  if(cmd==='/mine'){sendText(chatId,familySummary_('month',msg.from.id));return true;}
  if(text.charAt(0)==='/') return false;

  try{
    var tx=parseFamilyTransaction_(text);
    if(!tx||!Number(tx.amount)) return false;
    var saved=appendFamilyTransaction_(msg,tx);
    sendText(chatId,'✓ <b>'+formatVnd_(tx.amount)+'</b> · '+(tx.category||'Khác')+' · '+saved.payer+'\n'+(tx.description||text));
    return true;
  }catch(e){ Logger.log(e.stack||e); sendText(chatId,'Không xử lý được giao dịch này. Hãy thử dạng <code>đi chợ 450k</code>.'); return true; }
}

function doPost(e) {
  try {
    var contents=JSON.parse(e.postData.contents);
    if(contents.message && handleFamilyMessage_(contents.message)) return ContentService.createTextOutput('ok');
    routeTelegramPost_(e);
    return ContentService.createTextOutput('ok');
  } catch(err) {
    Logger.log(err.stack||err);
    return ContentService.createTextOutput('error');
  }
}
