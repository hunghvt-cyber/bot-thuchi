function getScriptProp_(key) { return PropertiesService.getScriptProperties().getProperty(key); }
function getBotToken() { return getScriptProp_('BOT_TOKEN') || ''; }
function getGeminiApiKey() { return getScriptProp_('GEMINI_API_KEY') || ''; }
function getMainSpreadsheetId() { return getScriptProp_('GOOGLE_SPREADSHEET_ID') || ''; }
function getWebAppUrl() { return getScriptProp_('WEB_APP_URL') || ScriptApp.getService().getUrl() || ''; }
function setFamilyGroupId_(chatId) { PropertiesService.getScriptProperties().setProperty('FAMILY_GROUP_ID', String(chatId)); }
function getFamilyGroupId() { return getScriptProp_('FAMILY_GROUP_ID') || ''; }
function getGeminiModel() { return getScriptProp_('GEMINI_MODEL') || 'gemini-2.5-flash'; }
