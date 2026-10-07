var FAMILY_CATEGORIES = ['Ăn uống','Đi chợ','Gia đình','Con cái','Đi lại','Hóa đơn','Mua sắm','Sức khỏe','Giáo dục','Giải trí','Nhà cửa','Thu nhập','Khác'];
var FAMILY_HEADERS = ['Timestamp','Date','PayerId','Payer','Type','Category','Description','Amount','Currency','TelegramChatId','TelegramMessageId','Source','TransactionId','DedupeKey','RawText'];

function familySpreadsheet_() {
  var id=getMainSpreadsheetId();
  if(!id) throw new Error('Thiếu GOOGLE_SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}
function familySheet_() {
  var ss=familySpreadsheet_(), sh=ss.getSheetByName('Transactions') || ss.insertSheet('Transactions');
  if(sh.getLastRow()===0) sh.getRange(1,1,1,FAMILY_HEADERS.length).setValues([FAMILY_HEADERS]);
  return sh;
}
function familyGroupId_(){ return getFamilyGroupId(); }
