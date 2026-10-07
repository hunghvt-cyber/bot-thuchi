function setupFamilyBot(){
  familySheet_();
  if(!getBotToken())throw new Error('Thiếu BOT_TOKEN');
  if(!getGeminiApiKey())throw new Error('Thiếu GEMINI_API_KEY');
  if(!getWebAppUrl())throw new Error('Thiếu WEB_APP_URL');
  var result=setWebhook();Logger.log(JSON.stringify(result));return result;
}
function healthCheck(){return {spreadsheet:!!getMainSpreadsheetId(),bot:!!getBotToken(),gemini:!!getGeminiApiKey(),webApp:!!getWebAppUrl(),group:familyGroupId_()||'ANY'};}
function testMoneyParser(){
  var cases={'45k':45000,'630':630000,'2tr5':2500000,'1tr350':1350000,'1.5tr':1500000};
  Object.keys(cases).forEach(function(s){var got=parseMoneyLocal_(s);if(got!==cases[s])throw new Error(s+' expected '+cases[s]+' got '+got);});
  return 'PASS';
}
