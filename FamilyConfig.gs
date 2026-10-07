var FAMILY_CATEGORIES = ['Ăn uống','Đi chợ','Gia đình','Con cái','Đi lại','Hóa đơn','Mua sắm','Sức khỏe','Giáo dục','Giải trí','Nhà cửa','Thu nhập','Khác'];

function familySpreadsheet_() {
  var id = getMainSpreadsheetId();
  if (!id) throw new Error('Thiếu GOOGLE_SPREADSHEET_ID trong Script Properties');
  return SpreadsheetApp.openById(id);
}

function familySheet_() {
  var ss = familySpreadsheet_();
  var sh = ss.getSheetByName('Transactions');
  if (!sh) sh = ss.insertSheet('Transactions');
  var header = ['Timestamp','Date','PayerId','Payer','Type','Category','Description','Amount','Currency','TelegramChatId','TelegramMessageId','Source','TransactionId'];
  if (sh.getLastRow() === 0) sh.appendRow(header);
  else sh.getRange(1,1,1,header.length).setValues([header]);
  return sh;
}

function familyGroupId_() { return getScriptProp_('FAMILY_GROUP_ID') || ''; }
function familyGeminiModel_() { return getScriptProp_('GEMINI_MODEL') || 'gemini-2.5-flash'; }
