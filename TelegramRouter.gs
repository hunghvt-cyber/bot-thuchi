function readAddWizard_(chatId) {
  var raw = CacheService.getScriptCache().get(CACHE_PREFIX_WIZARD_ADD + String(chatId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeAddWizard_(chatId, state) {
  CacheService.getScriptCache().put(
    CACHE_PREFIX_WIZARD_ADD + String(chatId),
    JSON.stringify(state),
    600,
  );
}

function clearAddWizard_(chatId) {
  CacheService.getScriptCache().remove(CACHE_PREFIX_WIZARD_ADD + String(chatId));
}

function startAddWizard_(chatId) {
  writeAddWizard_(chatId, { step: 'desc', description: '', amount: 0, type: '', currency: 'VND', allocation: '' });
  sendText(chatId, 'Wizard <b>/add</b>\nBước 1/5: Gửi <b>mô tả</b> giao dịch.\n(Hủy: <code>/cancel</code>)');
}

function tryHandleAddWizardMessage_(chatId, text) {
  var st = readAddWizard_(chatId);
  if (!st) return false;

  if (text === '/cancel') {
    clearAddWizard_(chatId);
    sendText(chatId, 'Đã hủy wizard /add.');
    return true;
  }

  if (st.step === 'desc') {
    st.description = String(text).trim();
    if (!st.description) {
      sendText(chatId, 'Mô tả không được để trống.');
      return true;
    }
    st.step = 'amt';
    writeAddWizard_(chatId, st);
    sendText(chatId, 'Bước 2/5: Gửi <b>số tiền</b> (số dương), ví dụ <code>50000</code> hoặc <code>99.5</code>.');
    return true;
  }

  if (st.step === 'amt') {
    var amt = parseFloat(String(text).replace(/,/g, '').replace(/\s/g, ''));
    if (isNaN(amt) || amt <= 0) {
      sendText(chatId, 'Số tiền không hợp lệ. Nhập lại (ví dụ <code>100000</code>).');
      return true;
    }
    st.amount = amt;
    st.step = 'wait_type';
    writeAddWizard_(chatId, st);
    sendText(chatId, 'Bước 3/5: Chọn <b>loại</b>:', {
      inline_keyboard: [
        [
          { text: 'Thu nhập', callback_data: 'a_ty:ThuNhap' },
          { text: 'Chi tiêu', callback_data: 'a_ty:ChiTieu' },
        ],
      ],
    });
    return true;
  }

  return false;
}

function buildAllocKeyboard_() {
  var row = [];
  for (var i = 0; i < ALLOCATIONS.length; i++) {
    row.push({ text: ALLOCATIONS[i], callback_data: 'a_al:' + i });
  }
  return { inline_keyboard: [row] };
}

function handleAddWizardCallbacks_(chatId, callbackQueryId, data) {
  var st = readAddWizard_(chatId);

  if (data.indexOf('a_ty:') === 0) {
    if (!st || st.step !== 'wait_type') {
      answerCallbackQuery(callbackQueryId, 'Wizard hết hạn. Gửi /add');
      return true;
    }
    st.type = data.slice(5);
    st.step = 'wait_cur';
    writeAddWizard_(chatId, st);
    answerCallbackQuery(callbackQueryId);
    sendText(chatId, 'Bước 4/5: Chọn <b>tiền tệ</b> (giá quy đổi VND lấy từ TCB):', {
      inline_keyboard: [
        [
          { text: 'VND', callback_data: 'a_cu:VND' },
          { text: 'USD', callback_data: 'a_cu:USD' },
          { text: 'EUR', callback_data: 'a_cu:EUR' },
        ],
      ],
    });
    return true;
  }

  if (data.indexOf('a_cu:') === 0) {
    if (!st || st.step !== 'wait_cur') {
      answerCallbackQuery(callbackQueryId, 'Wizard hết hạn. Gửi /add');
      return true;
    }
    st.currency = data.slice(5).toUpperCase();
    st.step = 'wait_alloc';
    writeAddWizard_(chatId, st);
    answerCallbackQuery(callbackQueryId);
    sendText(chatId, 'Bước 5/5: Chọn <b>hũ phân bổ</b>:', buildAllocKeyboard_());
    return true;
  }

  if (data.indexOf('a_al:') === 0) {
    if (!st || st.step !== 'wait_alloc') {
      answerCallbackQuery(callbackQueryId, 'Wizard hết hạn. Gửi /add');
      return true;
    }
    var idx = parseInt(data.slice(5), 10);
    if (isNaN(idx) || idx < 0 || idx >= ALLOCATIONS.length) {
      answerCallbackQuery(callbackQueryId, 'Hũ không hợp lệ');
      return true;
    }
    st.allocation = ALLOCATIONS[idx];
    st.step = 'confirm';
    writeAddWizard_(chatId, st);
    answerCallbackQuery(callbackQueryId);
    var sum =
      'Xác nhận ghi sổ?\n- Mô tả: ' +
      st.description +
      '\n- Số tiền: ' +
      st.amount +
      ' ' +
      st.currency +
      '\n- Loại: ' +
      st.type +
      '\n- Hũ: ' +
      st.allocation;
    sendText(chatId, sum, {
      inline_keyboard: [[{ text: 'Ghi sổ', callback_data: 'a_ok' }, { text: 'Hủy', callback_data: 'a_ca' }]],
    });
    return true;
  }

  if (data === 'a_ok') {
    if (!st || st.step !== 'confirm') {
      answerCallbackQuery(callbackQueryId, 'Không có giao dịch chờ xác nhận.');
      return true;
    }
    answerCallbackQuery(callbackQueryId);
    try {
      var now = new Date();
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      appendTransactionWithFx(chatId, d, st.description, st.amount, st.allocation, st.type, st.currency);
      clearAddWizard_(chatId);
      sendText(chatId, 'Đã ghi sổ thành công.');
    } catch (err) {
      sendText(chatId, 'Lỗi khi ghi sổ / FX: ' + (err.message || String(err)));
    }
    return true;
  }

  if (data === 'a_ca') {
    answerCallbackQuery(callbackQueryId);
    clearAddWizard_(chatId);
    sendText(chatId, 'Đã hủy wizard /add.');
    return true;
  }

  return false;
}

function handleDelConfirmCallbacks_(chatId, id_callback, callbackQueryId, data) {
  if (data === 'del_y') {
    var uuid = CacheService.getScriptCache().get(CACHE_PREFIX_PENDING_DEL + String(chatId));
    answerCallbackQuery(callbackQueryId);
    if (!uuid) {
      sendText(id_callback, 'Phiên xác nhận đã hết hạn. Gửi lại /del &lt;uuid&gt;.');
      return true;
    }
    if (deleteTransactionByTxnId(chatId, uuid)) {
      sendText(id_callback, 'Đã xóa giao dịch.');
    } else {
      sendText(id_callback, 'Không xóa được (đã bị xóa hoặc không tìm thấy).');
    }
    CacheService.getScriptCache().remove(CACHE_PREFIX_PENDING_DEL + String(chatId));
    return true;
  }
  if (data === 'del_n') {
    answerCallbackQuery(callbackQueryId);
    CacheService.getScriptCache().remove(CACHE_PREFIX_PENDING_DEL + String(chatId));
    sendText(id_callback, 'Đã hủy xóa.');
    return true;
  }
  return false;
}

function handleCallbackQuery_(contents) {
  var cq = contents.callback_query;
  var chatId = cq.from.id;
  var id_callback = chatId;
  var data = cq.data;
  var callbackQueryId = cq.id;

  if (data === 'connect_email') {
    answerCallbackQuery(callbackQueryId);
    sendText(chatId, 'Vui lòng nhập email của bạn:');
    return;
  }

  if (data.indexOf('bank_') === 0) {
    answerCallbackQuery(callbackQueryId);
    var bankName = data.split('_')[1];
    saveBankToSheet(chatId, bankName);
    sendText(chatId, 'Ngân hàng của bạn đã được kết nối thành công: ' + bankName);
    return;
  }

  if (handleDelConfirmCallbacks_(chatId, id_callback, callbackQueryId, data)) {
    return;
  }

  if (
    data.indexOf('a_ty:') === 0 ||
    data.indexOf('a_cu:') === 0 ||
    data.indexOf('a_al:') === 0 ||
    data === 'a_ok' ||
    data === 'a_ca'
  ) {
    handleAddWizardCallbacks_(chatId, callbackQueryId, data);
    return;
  }

  if (data === 'totalchi') {
    answerCallbackQuery(callbackQueryId);
    var totalExpenses = getTotalAmountByType(chatId, 'ChiTieu');
    sendText(
      id_callback,
      'Tổng chi tiêu của bạn là: ' + totalExpenses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      KEYBOARD_MENCHI,
    );
    return;
  }
  if (data === 'totalthunhap') {
    answerCallbackQuery(callbackQueryId);
    sendTotalIncomeSummary(id_callback, chatId);
    return;
  }
  if (data === 'currentbalance') {
    answerCallbackQuery(callbackQueryId);
    var currentBalance = getCurrentBalance(chatId);
    sendText(
      id_callback,
      'Số tiền hiện tại của bạn là: ' + currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
    );
    return;
  }
  if (data === 'getTotalAllocationBalances') {
    answerCallbackQuery(callbackQueryId);
    sendTotalPhanboSummary(id_callback, chatId);
    return;
  }
  if (data === 'history') {
    answerCallbackQuery(callbackQueryId);
    sendTransactionHistory(id_callback, chatId);
    return;
  }

  answerCallbackQuery(callbackQueryId);
}

function handleTelegramMessage_(contents) {
  var msg = contents.message;
  var chatId = msg.chat.id;
  var userName = msg.from.first_name;
  var text = msg.text || '';

  if (msg.voice) {
    processVoiceMessage(msg.voice.file_id, chatId);
    return;
  }

  if (text && isValidEmail(text)) {
    saveEmailToSheet(chatId, text);
    sendBankOptions(chatId);
    return;
  }

  if (text && text.indexOf('/') === 0 && text !== '/cancel') {
    if (text === '/add' || text.indexOf('/add ') === 0) {
      startAddWizard_(chatId);
      return;
    }
    clearAddWizard_(chatId);
  }

  if (text && tryHandleAddWizardMessage_(chatId, text)) {
    return;
  }

  if (text) {
    handleTelegramMessageText(chatId, userName, text);
  }
}

function routeTelegramPost_(e) {
  var contents = JSON.parse(e.postData.contents);

  if (contents.callback_query) {
    handleCallbackQuery_(contents);
    return;
  }

  if (contents.message) {
    handleTelegramMessage_(contents);
  }
}
