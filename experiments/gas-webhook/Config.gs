// Isolated webhook project configuration; never use the old production BOT_TOKEN.
function getScriptProp_(key){return PropertiesService.getScriptProperties().getProperty(key);}
function getBotToken(){return getScriptProp_('TEST_BOT_TOKEN')||'';}
function getGeminiApiKey(){return getScriptProp_('GEMINI_API_KEY')||'';}
function getMainSpreadsheetId(){return getScriptProp_('GOOGLE_SPREADSHEET_ID')||'';}
function getWebAppUrl(){return 'https://script.google.com/macros/s/AKfycby9V-wbbucC9zTBRfMdCM5Tf8qsJRlMVeQtOfyKmrtuOVmLs1USBcTTMbe4J2ExhpQn/exec';}
function setFamilyGroupId_(chatId){PropertiesService.getScriptProperties().setProperty('FAMILY_GROUP_ID',String(chatId));}
function getFamilyGroupId(){return getScriptProp_('FAMILY_GROUP_ID')||'';}
function getGeminiModel(){return getScriptProp_('GEMINI_MODEL')||'gemini-2.5-flash';}
function familyGroupId_(){return getFamilyGroupId();}
