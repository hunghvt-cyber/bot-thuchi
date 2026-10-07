/**
 * Script Properties — Project Settings → Script properties
 * BOT_TOKEN, GOOGLE_SPREADSHEET_ID,
 * GOOGLE_ACCOUNT_ACCESS_TOKEN (OAuth Bearer cho Gemini API) hoặc GEMINI_API_KEY (một chuỗi, gắn ?key=),
 * WEB_APP_URL (optional), FX_RATE_BASE_URL, FX_RATE_API_KEY, …
 *
 * Gemini: nếu đặt GOOGLE_ACCOUNT_ACCESS_TOKEN thì mọi request dùng header Authorization: Bearer …;
 * nếu không thì dùng GEMINI_API_KEY trên query (?key=).
 */

function getScriptProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getBotToken() {
  return getScriptProp_('BOT_TOKEN');
}

/** OAuth2 access token for Google Generative Language API (Bearer). */
function getGoogleAccountAccessToken() {
  return getScriptProp_('GOOGLE_ACCOUNT_ACCESS_TOKEN');
}

/** Single Gemini API key (AI Studio); used when Bearer token is not set. */
function getGeminiApiKey() {
  return getScriptProp_('GEMINI_API_KEY');
}

function getMainSpreadsheetId() {
  return getScriptProp_('GOOGLE_SPREADSHEET_ID');
}

function getWebAppUrl() {
  return getScriptProp_('WEB_APP_URL') || '';
}

function getFxRateBaseUrl() {
  return getScriptProp_('FX_RATE_BASE_URL') || 'https://api.vnappmob.com/api/v2/exchange_rate/tcb';
}

function getFxRateApiKey() {
  return getScriptProp_('FX_RATE_API_KEY');
}

function getFxKeyRequestUrl() {
  return (
    getScriptProp_('FX_RATE_KEY_REQUEST_URL') ||
    'https://api.vnappmob.com/api/request_api_key?scope=exchange_rate'
  );
}

function getAddDescriptionPresetsJson() {
  return getScriptProp_('ADD_DESCRIPTION_PRESETS');
}

/**
 * @returns {{ mode: 'bearer', headers: Object<string,string> } | { mode: 'key', key: string, headers: Object<string,string> }}
 */
function getGeminiAuth_() {
  var b = getGoogleAccountAccessToken();
  if (b && String(b).trim()) {
    return { mode: 'bearer', headers: { Authorization: 'Bearer ' + String(b).trim() } };
  }
  var k = getGeminiApiKey();
  if (k && String(k).trim()) {
    return { mode: 'key', key: String(k).trim(), headers: {} };
  }
  throw new Error('Set GOOGLE_ACCOUNT_ACCESS_TOKEN or GEMINI_API_KEY in script properties');
}

/** @param {string} path e.g. /v1beta/models/gemini-1.5-flash:generateContent */
function geminiApiUrl_(path) {
  var auth = getGeminiAuth_();
  var url = 'https://generativelanguage.googleapis.com' + path;
  if (auth.mode === 'key') {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(auth.key);
  }
  return url;
}

/** Headers to merge into UrlFetchApp options (Bearer when using access token). */
function geminiApiHeaders_() {
  return getGeminiAuth_().headers;
}
