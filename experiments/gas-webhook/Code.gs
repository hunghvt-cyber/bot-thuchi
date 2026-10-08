/**
 * Isolated TEST bot only. Telegram requires a non-redirect response; HtmlService
 * is used intentionally. Do not copy this into the production deployment.
 */
function doGet() {
  return HtmlService.createHtmlOutput('webhook-test-ready');
}

function doPost(e) {
  var started = Date.now();
  var diagnostic = {at:new Date().toISOString(),stage:'start'};
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    var update = JSON.parse(e && e.postData && e.postData.contents || '{}');
    var id = update.update_id;
    var msg = update.message;
    diagnostic.update_id = id;
    diagnostic.message_type = msg ? (typeof msg.text === 'string' ? 'text' : 'non_text') : 'no_message';
    diagnostic.chat_id = msg && msg.chat ? String(msg.chat.id) : null;
    diagnostic.chat_type = msg && msg.chat ? msg.chat.type : null;

    if (typeof id !== 'number' || !isFinite(id) || Math.floor(id) !== id) {
      throw new Error('Invalid update_id');
    }
    if (!lock.tryLock(20000)) {
      diagnostic.stage = 'lock_busy';
      // No side effects. Telegram can retry if its HTTP response is rejected.
      return HtmlService.createHtmlOutput('BUSY');
    }
    locked = true;

    var props = PropertiesService.getScriptProperties();
    var recent = JSON.parse(props.getProperty('TEST_PROCESSED_UPDATE_IDS') || '[]');
    if (recent.indexOf(id) !== -1) {
      diagnostic.stage = 'duplicate';
      return HtmlService.createHtmlOutput('OK');
    }

    var token = props.getProperty('TEST_BOT_TOKEN');
    diagnostic.has_token = !!token;
    if (!token) throw new Error('Missing TEST_BOT_TOKEN');

    if (msg && typeof msg.text === 'string' && msg.chat && msg.chat.id != null) {
      var text = testWebhookReplyText_(msg.text, started);
      var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method:'post',
        payload:{chat_id:String(msg.chat.id),text:text},
        muteHttpExceptions:true
      });
      var body = JSON.parse(response.getContentText());
      diagnostic.telegram_http = response.getResponseCode();
      diagnostic.telegram_ok = body.ok === true;
      diagnostic.telegram_error = body.ok ? null : String(body.description || 'unknown').slice(0,180);
      if (!body.ok) throw new Error('Telegram sendMessage: ' + diagnostic.telegram_error);
      diagnostic.stage = 'sent';
    } else {
      diagnostic.stage = 'ignored';
    }

    // Mark only after successful delivery (or intentional ignore).
    recent.push(id);
    if (recent.length > 100) recent = recent.slice(-100);
    props.setProperty('TEST_PROCESSED_UPDATE_IDS', JSON.stringify(recent));
  } catch (err) {
    diagnostic.stage = 'error';
    diagnostic.error = String(err).slice(0,220);
  } finally {
    diagnostic.elapsed_ms = Date.now() - started;
    if (locked) lock.releaseLock();
    PropertiesService.getScriptProperties().setProperty('TEST_LAST_DIAGNOSTIC', JSON.stringify(diagnostic));
    console.log(JSON.stringify(diagnostic));
  }
  return HtmlService.createHtmlOutput('OK');
}

function testWebhookReplyText_(input, started) {
  var command = String(input).trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (command === '/start') return 'Poorman webhook TEST ready. Commands: /ping, /start.';
  if (command === '/ping') return 'pong';
  return 'Webhook OK (' + (Date.now() - started) + 'ms): ' + String(input).slice(0,3000);
}

function showLastWebhookDiagnostic() {
  var value = PropertiesService.getScriptProperties().getProperty('TEST_LAST_DIAGNOSTIC');
  console.log(value || 'No webhook diagnostic recorded yet');
  return value;
}

/** Safe offline smoke checks: no Telegram calls and no production effects. */
function runTestWebhookSelfChecks() {
  var assert = function(ok, name) { if (!ok) throw new Error('FAIL: ' + name); console.log('PASS: ' + name); };
  assert(testWebhookReplyText_('/ping', Date.now()) === 'pong', 'ping');
  assert(testWebhookReplyText_('/ping@PoormanTest0219_bot', Date.now()) === 'pong', 'addressed ping');
  assert(testWebhookReplyText_('/start', Date.now()).indexOf('ready') !== -1, 'start');
  assert(testWebhookReplyText_('hello', Date.now()).indexOf('hello') !== -1, 'echo');
  console.log('All offline self-checks passed');
}
