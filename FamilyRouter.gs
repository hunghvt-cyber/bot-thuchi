function isFamilyGroupAllowed_(chatId){var x=familyGroupId_();return !x||String(x)===String(chatId);}
function handleFamilyMessage_(msg){
  var chatId=msg.chat.id,text=String(msg.text||'').trim();if(!isFamilyGroupAllowed_(chatId)||!text)return true;
  var cmd=text.split(/\s+/)[0].split('@')[0].toLowerCase();
  if(cmd==='/start'||cmd==='/help'){sendText(chatId,'<b>Poorman Family Expense Bot</b>\nNhắn: <code>cafe 35k</code>, <code>đi chợ 630</code>, <code>học phí 2tr5</code>.\nLệnh: /today /month /mine /whoami');return true;}
  if(cmd==='/whoami'){sendText(chatId,'User ID: <code>'+msg.from.id+'</code>\nGroup ID: <code>'+chatId+'</code>');return true;}
  if(cmd==='/today'){sendText(chatId,familySummary_('today'));return true;}
  if(cmd==='/month'){sendText(chatId,familySummary_('month'));return true;}
  if(cmd==='/mine'){sendText(chatId,familySummary_('month',msg.from.id));return true;}
  if(text.charAt(0)==='/')return true;
  try{var tx=parseFamilyTransaction_(text);if(!tx||!Number(tx.amount))return true;var saved=appendFamilyTransaction_(msg,tx);if(saved.duplicate)return true;
    sendText(chatId,'✓ <b>'+formatVnd_(tx.amount)+'</b> · '+escapeHtml_(tx.category||'Khác')+' · '+escapeHtml_(saved.payer)+'\n'+escapeHtml_(tx.description||text));return true;
  }catch(e){Logger.log(e.stack||e);sendText(chatId,'Không xử lý được. Thử: <code>đi chợ 450k</code>');return true;}
}
function doPost(e){
  try{var u=JSON.parse(e.postData.contents);if(u.message)handleFamilyMessage_(u.message);return ContentService.createTextOutput('ok');}
  catch(err){Logger.log(err.stack||err);return ContentService.createTextOutput('error');}
}
