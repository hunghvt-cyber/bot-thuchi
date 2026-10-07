function setupFamilyBot(){
  familySheet_();
  if(!getBotToken())throw new Error('Thiếu BOT_TOKEN');
  if(!getGeminiApiKey())throw new Error('Thiếu GEMINI_API_KEY');
  if(!getWebAppUrl())throw new Error('Thiếu WEB_APP_URL');
  var result=setWebhook();Logger.log(JSON.stringify(result));return result;
}
function healthCheck(){return {spreadsheet:!!getMainSpreadsheetId(),bot:!!getBotToken(),gemini:!!getGeminiApiKey(),webApp:!!getWebAppUrl(),group:familyGroupId_()||'ANY'};}
function testMoneyParser(){
  var cases = [
    ['45k', 45000],
    ['45 nghìn', 45000],
    ['630', 630000],
    ['đi chợ 630', 630000],
    ['2tr5', 2500000],
    ['học phí 2tr5', 2500000],
    ['1tr350', 1350000],
    ['tiền điện 1tr350', 1350000],
    ['1.5tr', 1500000],
    ['1,5tr', 1500000],
    ['cafe 2 đứa 85', 85000]
  ];
  cases.forEach(function(test){
    var got = parseMoneyLocal_(test[0]);
    if (got !== test[1]) throw new Error(test[0]+' expected '+test[1]+' got '+got);
  });
  return 'PASS ('+cases.length+' cases)';
}
