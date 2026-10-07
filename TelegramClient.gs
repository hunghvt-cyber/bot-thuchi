function sendMessage(chatId, text, replyMarkup) {
  var token = getBotToken();
  if (!token) throw new Error('Missing BOT_TOKEN');

  var payload = {
    chat_id: chatId,
    text: String(text),
    parse_mode: 'HTML',
  };
  if (replyMarkup != null) {
    payload.reply_markup = replyMarkup;
  }

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

/** @param {string|number} chatId @param {string} text @param {Object=} keyBoard */
function sendText(chatId, text, keyBoard) {
  sendMessage(chatId, formatNumberWithSeparator(String(text)), keyBoard);
}

function answerCallbackQuery(callbackQueryId, text) {
  var token = getBotToken();
  if (!token) return;

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
    muteHttpExceptions: true,
  });
}
