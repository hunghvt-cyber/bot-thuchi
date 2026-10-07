function setupFamilyBot() {
  familySheet_();
  var url=getWebAppUrl();
  if(!getBotToken()) throw new Error('Thiếu BOT_TOKEN');
  if(!getGeminiApiKey() && !getGoogleAccountAccessToken()) throw new Error('Thiếu GEMINI_API_KEY');
  if(!url) throw new Error('Thiếu WEB_APP_URL sau khi Deploy Web app');
  setWebhook();
  Logger.log('Family bot ready: '+url);
}

function healthCheck() {
  return {spreadsheet:!!getMainSpreadsheetId(),bot:!!getBotToken(),gemini:!!(getGeminiApiKey()||getGoogleAccountAccessToken()),webApp:!!getWebAppUrl(),group:familyGroupId_()||'ANY'};
}
