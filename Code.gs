function setWebhook() {
  var t = getBotToken();
  var url = getWebAppUrl();
  if (!t || !url) {
    throw new Error('Set BOT_TOKEN and WEB_APP_URL script properties before setWebhook.');
  }
  UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + t + '/setWebhook?url=' + encodeURIComponent(url),
  );
}

function isValidEmail(email) {
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function saveEmailToSheet(userId, email) {
  var usersSpreadsheet = SpreadsheetApp.openById(getMainSpreadsheetId());
  var usersSheet = usersSpreadsheet.getSheetByName('Users');
  var data = usersSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === userId) {
      usersSheet.getRange(i + 1, 3).setValue(email);
      break;
    }
  }
}

function sendBankOptions(chatId) {
  var bankKeyboard = {
    inline_keyboard: [
      [
        { text: 'VIB', callback_data: 'bank_VIB' },
        { text: 'CAKE', callback_data: 'bank_CAKE' },
        { text: 'VPBank', callback_data: 'bank_VPBank' },
        { text: 'ACB', callback_data: 'bank_ACB' },
      ],
    ],
  };
  sendText(chatId, 'Vui lòng chọn ngân hàng của bạn:', bankKeyboard);
}

function saveBankToSheet(userId, bankName) {
  var usersSpreadsheet = SpreadsheetApp.openById(getMainSpreadsheetId());
  var usersSheet = usersSpreadsheet.getSheetByName('Users');
  var data = usersSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === userId) {
      usersSheet.getRange(i + 1, 4).setValue(bankName);
      break;
    }
  }
}

function stripHtml(html) {
  var doc = DocumentApp.create('temp');
  doc.getBody().setText(html);
  var text = doc.getBody().getText();
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  return text;
}

function sendToGeminiAPI(emailBody) {
  var url = geminiApiUrl_('/v1beta/models/gemini-1.5-flash-latest:generateContent');

  var payload = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text:
              'Bạn là một AI Chi tiêu, hãy cho tôi tiền chi tiêu, nội dung(Nội dung, diễn giải) giao dịch và loại ThuNhap hay ChiTieu, nếu không phải có rõ số tiền, nội dung và loại Thu nhập/Chi tiêu thì phản hồi lại trống cho tôi, đây là mail: ' +
              emailBody,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.55,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          amount: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  });

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    headers: geminiApiHeaders_(),
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());
    var candidates = responseData.candidates;
    if (candidates && candidates.length > 0) {
      var content = candidates[0].content;
      var parts = content.parts;
      if (parts && parts.length > 0) {
        var text = parts[0].text;
        return JSON.parse(text);
      }
    }
    return null;
  } catch (error) {
    Logger.log('Lỗi khi gọi API: ' + error.message);
    return null;
  }
}

function processVoiceMessage(fileId, chatId) {
  var botToken = getBotToken();
  var telegramUrl = 'https://api.telegram.org/bot' + botToken;

  var getFileUrl = telegramUrl + '/getFile?file_id=' + fileId;
  var getFileResponse = UrlFetchApp.fetch(getFileUrl);
  var fileInfo = JSON.parse(getFileResponse.getContentText());
  if (!fileInfo.ok) {
    Logger.log('Không lấy được file từ Telegram.');
    sendText(chatId, 'Xin lỗi, không thể xử lý tin nhắn voice của bạn.');
    return;
  }
  var filePath = fileInfo.result.file_path;
  var voiceUrl = 'https://api.telegram.org/file/bot' + botToken + '/' + filePath;

  var voiceResponse = UrlFetchApp.fetch(voiceUrl);
  var blob = voiceResponse.getBlob();
  var mimeType = blob.getContentType();
  if (mimeType === 'application/octet-stream') {
    mimeType = 'audio/ogg';
  }
  var numBytes = blob.getBytes().length;
  var displayName = 'voice_file';

  var initUrl = geminiApiUrl_('/upload/v1beta/files');
  var initHeaders = Object.assign(
    {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(numBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    geminiApiHeaders_(),
  );
  var initPayload = JSON.stringify({ file: { display_name: displayName } });
  var initOptions = {
    method: 'post',
    headers: initHeaders,
    payload: initPayload,
    muteHttpExceptions: true,
  };

  var initResponse = UrlFetchApp.fetch(initUrl, initOptions);
  var initResponseHeaders = initResponse.getAllHeaders();
  var uploadUrl =
    initResponseHeaders['X-Goog-Upload-Url'] || initResponseHeaders['x-goog-upload-url'];
  if (!uploadUrl) {
    Logger.log('Không lấy được upload URL: ' + initResponse.getContentText());
    sendText(chatId, 'Lỗi khi xử lý file voice.');
    return;
  }

  var uploadHeaders = Object.assign(
    {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    geminiApiHeaders_(),
  );
  var uploadOptions = {
    method: 'post',
    headers: uploadHeaders,
    payload: blob.getBytes(),
    muteHttpExceptions: true,
  };

  var uploadResponse = UrlFetchApp.fetch(uploadUrl, uploadOptions);
  var uploadResult = JSON.parse(uploadResponse.getContentText());
  var fileUri = uploadResult.file.uri;
  if (!fileUri) {
    Logger.log('Upload thất bại: ' + uploadResponse.getContentText());
    sendText(chatId, 'Upload file voice thất bại.');
    return;
  }
  Logger.log('File URI: ' + fileUri);

  var generateUrl = geminiApiUrl_('/v1beta/models/gemini-2.0-flash:generateContent');
  var generatePayload = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: 'Bạn là một AI Chi tiêu. Hãy trích xuất thông tin về số tiền, nội dung và loại giao dịch (type luôn đặt là: Thu nhập hoặc Chi tiêu) từ giọng nói. Lưu ý: nhận diện các biểu thức rút gọn và các từ lóng/địa phương liên quan đến tiền tệ. Ví dụ: “củ” tương đương với “triệu", “k hoặc ca hoặc ka” tương đương với “trăm”, “nghìn” hoặc “ngàn” tương đương với “nghìn”, “ty” hoặc “tỉ” tương đương với “tỷ”, “lít” tương đương với “trăm” (các từ rút gọn này chỉ áp dụng khi đi kèm với giá tiền). Nếu không nghe rõ hoặc không nhận diện được số tiền, hãy trả về rỗng {}. Tuyệt đối không được tự suy đoán hay chế thông tin.',
          },
          { file_data: { mime_type: mimeType, file_uri: fileUri } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topK: 64,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            amount: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
  });

  var generateOptions = {
    method: 'post',
    contentType: 'application/json',
    payload: generatePayload,
    headers: geminiApiHeaders_(),
    muteHttpExceptions: true,
  };

  var generateResponse = UrlFetchApp.fetch(generateUrl, generateOptions);
  Logger.log('Response: ' + generateResponse.getContentText());

  try {
    var responseData = JSON.parse(generateResponse.getContentText());
    if (responseData && responseData.candidates && responseData.candidates.length > 0) {
      var content = responseData.candidates[0].content;
      if (content.parts && content.parts.length > 0) {
        var resultText = content.parts[0].text;
        var transactions = JSON.parse(resultText);
        recordTransactionsFromAI(chatId, transactions);
      } else {
        sendText(chatId, 'Không nhận được nội dung phản hồi từ hệ thống AI.');
      }
    } else {
      sendText(chatId, 'AI không nghe rõ được Voice, vui lòng thử lại.');
    }
  } catch (err) {
    Logger.log('Lỗi khi xử lý phản hồi: ' + err);
    sendText(chatId, 'AI không nghe rõ được Voice, vui lòng thử lại.');
  }
}

function recordTransactionsFromAI(chatId, transactions) {
  var isInvalid = transactions.some(function (tx) {
    return !tx.amount || String(tx.amount).trim() === '';
  });

  if (isInvalid) {
    sendText(chatId, 'AI không nghe rõ được Voice, vui lòng thử lại.');
    return;
  }

  var userId = chatId;
  var date = new Date();
  var formattedDate = formatDate(date);
  var messages = [];

  transactions.forEach(function (tx) {
    var amount = parseInt(String(tx.amount).replace(/,/g, ''), 10);
    var description = tx.description;

    var typeLower = String(tx.type).toLowerCase();
    var transactionType = typeLower.indexOf('thu') >= 0 ? 'ThuNhap' : typeLower.indexOf('chi') >= 0 ? 'ChiTieu' : tx.type;

    var allocation = 'Thiết yếu';

    appendTransactionWithFx(userId, date, description, amount, allocation, transactionType, 'VND');

    if (transactionType === 'ThuNhap') {
      messages.push(
        'Bạn đã thu nhâp: ' +
          description +
          ' ' +
          amount.toLocaleString('vi-VN') +
          ' vào ngày ' +
          formattedDate +
          ' và phân bổ thu nhập của bạn vào hũ ' +
          allocation +
          '.',
      );
    } else if (transactionType === 'ChiTieu') {
      messages.push(
        'Bạn đã chi tiêu: ' +
          description +
          ' ' +
          amount.toLocaleString('vi-VN') +
          ' vào ngày ' +
          formattedDate +
          ' và phân bổ chi tiêu của bạn vào hũ ' +
          allocation +
          '.',
      );
    } else {
      messages.push(
        'Giao dịch: ' +
          description +
          ' ' +
          amount.toLocaleString('vi-VN') +
          ' vào ngày ' +
          formattedDate +
          '.',
      );
    }
  });

  sendText(chatId, messages.join('\n'));
}

function checkEmail() {
  var usersSpreadsheet = SpreadsheetApp.openById(getMainSpreadsheetId());
  var usersSheet = usersSpreadsheet.getSheetByName('Users');
  var data = usersSheet.getDataRange().getValues();

  for (var k = 1; k < data.length; k++) {
    var emailToCheck = data[k][2];
    if (emailToCheck) {
      var bank = data[k][3];

      if (!BANK_DOMAINS.hasOwnProperty(bank)) {
        Logger.log('Không có ngân hàng phù hợp: ' + bank);
        continue;
      }

      var searchQuery = '';
      var domain = BANK_DOMAINS[bank];

      if (bank === 'VPBank' && Array.isArray(domain)) {
        searchQuery = '(' + domain.join(' OR ') + ') to:' + emailToCheck;
      } else {
        searchQuery = domain + ' to:' + emailToCheck;
      }

      searchQuery += ' is:unread';

      var threads = GmailApp.search(searchQuery);
      for (var i = 0; i < threads.length; i++) {
        var messages = threads[i].getMessages();
        for (var j = 0; j < messages.length; j++) {
          var message = messages[j];
          var emailBody = message.getBody();
          var timestamp = message.getDate();
          var timestampEpoch = timestamp.getTime();

          var apiResponse = sendToGeminiAPI(emailBody);
          if (apiResponse && apiResponse.amount && apiResponse.type && apiResponse.description) {
            var amount = parseInt(String(apiResponse.amount).replace(/,/g, '').trim(), 10);
            var explanation = apiResponse.description;
            var typ = apiResponse.type;

            var targetUserId = data[k][0];

            var targetSheet = getSheet(targetUserId);
            var targetData = targetSheet.getDataRange().getValues();

            var alreadyRecorded = false;
            for (var m = 1; m < targetData.length; m++) {
              var recordedEpoch = targetData[m][COL_EPOCH];
              if (recordedEpoch === timestampEpoch) {
                alreadyRecorded = true;
                break;
              }
            }
            if (!alreadyRecorded) {
              appendTransactionRow(targetUserId, timestamp, explanation, amount, 'Thiết yếu', typ, {
                epoch: timestampEpoch,
                currency: 'VND',
                amountVnd: amount,
                fxRate: 1,
                fxDate: formatDateVN(timestamp),
              });
              Logger.log('Đã ghi nội dung vào sheet.');
            } else {
              Logger.log('Nội dung đã được ghi trước đó.');
            }
          } else {
            Logger.log('API không trả về dữ liệu hợp lệ hoặc nội dung trống.');
          }
        }
        threads[i].markRead();
      }
    } else {
      Logger.log('Bỏ qua hàng rỗng ở dòng: ' + (k + 1));
    }
  }
}
