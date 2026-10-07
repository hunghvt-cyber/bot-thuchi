/**
 * @returns {{ ok: boolean, startDate?: Date, endDate?: Date, error?: string }}
 */
function parseHistoryCommand_(text) {
  var parts = String(text || '')
    .trim()
    .split(/\s+/);
  if (parts[0] !== '/history') {
    return { ok: false };
  }
  if (parts.length < 2) {
    return {
      ok: false,
      error:
        'Hãy sử dụng các lệnh sau:\n <b>1. Lịch sử Thu/Chi hôm nay:</b>\n   - <code>/history today</code>\n\n<b>2. Lịch sử Thu/Chi ngày cụ thể:</b>\n   - <code>/history d ngày/tháng/năm</code>\n\n<b>3. Lịch sử Thu/Chi trong tuần:</b>\n   - <code>/history week</code>\n\n<b>4. Lịch sử Thu/Chi trong tuần cụ thể:</b>\n   - <code>/history w 1 (2, 3, 4)</code>\n\n<b>5. Lịch sử Thu/Chi tháng:</b>\n   - <code>/history month tháng/năm</code>\n\n<b>6. Lịch sử Thu/Chi năm:</b>\n   - <code>/history year năm</code>\n',
    };
  }

  var sub = parts[1].toLowerCase();
  var today;
  var startDate;
  var endDate;

  if (sub === 'today') {
    today = new Date();
    startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return { ok: true, startDate: startDate, endDate: endDate };
  }

  if (sub === 'week') {
    today = new Date();
    var startOfWeek = today.getDate() - today.getDay();
    startDate = new Date(today.getFullYear(), today.getMonth(), startOfWeek);
    endDate = new Date(today.getFullYear(), today.getMonth(), startOfWeek + 7);
    return { ok: true, startDate: startDate, endDate: endDate };
  }

  if (sub === 'w' && parts.length === 3) {
    var weekNumber = parseInt(parts[2], 10);
    if (!isNaN(weekNumber) && weekNumber >= 1 && weekNumber <= 4) {
      var currentDate = new Date();
      startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        (weekNumber - 1) * 7 + 1,
      );
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), weekNumber * 7 + 1);
      return { ok: true, startDate: startDate, endDate: endDate };
    }
    return {
      ok: false,
      error:
        'Vui lòng cung cấp tuần hợp lệ, bạn có thể thử /history w 1, /history w 2, /history w 3, /history w 4.',
    };
  }

  if (sub === 'month' && parts.length === 3) {
    var monthYearStr = parts[2];
    var segs = monthYearStr.split('/');
    var month = parseInt(segs[0], 10);
    var year = parseInt(segs[1], 10);
    if (!isNaN(month) && !isNaN(year)) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
      return { ok: true, startDate: startDate, endDate: endDate };
    }
    return {
      ok: false,
      error: 'Vui lòng cung cấp tháng hợp lệ, ví dụ: /history month MM/YYYY',
    };
  }

  if (sub === 'year' && parts.length === 3) {
    var y = parseInt(parts[2], 10);
    if (!isNaN(y)) {
      startDate = new Date(y, 0, 1);
      endDate = new Date(y + 1, 0, 1);
      return { ok: true, startDate: startDate, endDate: endDate };
    }
    return {
      ok: false,
      error: 'Vui lòng cung cấp năm hợp lệ, ví dụ: /history year YYYY',
    };
  }

  if (sub === 'd' && parts.length >= 3) {
    var dateParts = parts.slice(2).join(' ').split('/');
    if (dateParts.length === 3) {
      var yearD = parseInt(dateParts[2], 10);
      var monthD = parseInt(dateParts[1], 10) - 1;
      var dayD = parseInt(dateParts[0], 10);
      startDate = new Date(yearD, monthD, dayD);
      endDate = new Date(yearD, monthD, dayD + 1);
      return { ok: true, startDate: startDate, endDate: endDate };
    }
    return {
      ok: false,
      error: 'Vui lòng cung cấp ngày/tháng/năm hợp lệ, ví dụ: /history d DD/MM/YYYY',
    };
  }

  return {
    ok: false,
    error:
      'Lệnh không hợp lệ. Hãy sử dụng các lệnh sau:\n <b>1. Lịch sử Thu/Chi hôm nay:</b>\n   - <code>/history today</code>\n\n<b>2. Lịch sử Thu/Chi ngày cụ thể:</b>\n   - <code>/history d ngày/tháng/năm</code>\n\n<b>3. Lịch sử Thu/Chi trong tuần:</b>\n   - <code>/history week</code>\n\n<b>4. Lịch sử Thu/Chi trong tuần cụ thể:</b>\n   - <code>/history w 1 (2, 3, 4)</code>\n\n<b>5. Lịch sử Thu/Chi tháng:</b>\n   - <code>/history month tháng/năm</code>\n\n<b>6. Lịch sử Thu/Chi năm:</b>\n   - <code>/history year năm</code>\n',
  };
}

/**
 * @returns {boolean} true if message was handled
 */
function handleTelegramMessageText(chatId, userName, text) {
  var id_message = chatId;
  var allocations = ALLOCATIONS;

  if (text === '/clearthunhap') {
    clearTransactionsByType_(chatId, 'ThuNhap');
    sendText(chatId, 'Đã xoá các thu nhập.');
    return true;
  }
  if (text === '/clearchitieu') {
    clearTransactionsByType_(chatId, 'ChiTieu');
    sendText(chatId, 'Đã xoá các giao dịch chi tiêu.');
    return true;
  }
  if (text === '/clearall') {
    clearTransactionsByType_(chatId, 'BOTH');
    sendText(chatId, 'Đã xoá các giao dịch chi tiêu và thu nhập.');
    return true;
  }

  if (text.indexOf('+') >= 0) {
    var parts = text.split(' + ');
    if (parts.length >= 2) {
      var itemWithAllocation = parts[0].trim();
      var amountWithDate = parts[1].trim();
      var allocationAndDate = parts.slice(2).join(' ').trim() || 'Thiết yếu';
      var allocationParts = itemWithAllocation.split('+');
      var item;
      var date;

      if (allocationParts.length >= 2) {
        item = allocationParts[0].trim();
        allocationAndDate = allocationParts[1].trim();
      } else {
        item = itemWithAllocation;
      }

      var dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{4})/;
      var dateMatch = allocationAndDate.match(dateRegex);

      if (dateMatch) {
        var dp = dateMatch[0].split(/[/-]/);
        var day = parseInt(dp[0], 10);
        var month = parseInt(dp[1], 10) - 1;
        var year = parseInt(dp[2], 10);
        date = new Date(year, month, day);
        allocationAndDate = allocationAndDate.replace(dateRegex, '').trim();
      } else {
        var currentDate = new Date();
        date = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      }
      var amount = parseFloat(amountWithDate);
      var allocation = allocationAndDate || 'Thiết yếu';
      var type = 'ThuNhap';
      if (!isNaN(amount) && allocations.indexOf(allocation) >= 0) {
        appendTransactionWithFx(chatId, date, item, amount, allocation, type, 'VND');
        sendText(
          id_message,
          'Bạn đã thu nhâp: ' +
            item +
            ' ' +
            amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
            ' vào ngày ' +
            formatDate(date) +
            ' và phân bổ thu nhập của bạn vào hũ ' +
            allocation +
            '.',
        );
        return true;
      }
      sendText(
        id_message,
        'Vui lòng cung cấp thông tin thu nhập và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Thu nhập:</b>\n   - <code>nội dung + số tiền</code>\n\n<b>2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm + hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>',
      );
      return true;
    }
    sendText(
      id_message,
      'Vui lòng cung cấp thông tin thu nhập và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Thu nhập:</b>\n   - <code>nội dung + số tiền</code>\n\n<b>2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm + hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>',
    );
    return true;
  }

  if (text.indexOf('-') >= 0) {
    var partsE = text.split(' - ');
    if (partsE.length >= 2) {
      var itemWithAllocationE = partsE[0].trim();
      var amountWithDateE = partsE[1].trim();
      var allocationAndDateE = partsE.slice(2).join(' ').trim() || 'Thiết yếu';
      var allocationPartsE = itemWithAllocationE.split('-');
      var itemE;
      var dateE;

      if (allocationPartsE.length >= 2) {
        itemE = allocationPartsE[0].trim();
        allocationAndDateE = allocationPartsE[1].trim();
      } else {
        itemE = itemWithAllocationE;
      }

      var dateRegexE = /(\d{1,2}[/-]\d{1,2}[/-]\d{4})/;
      var dateMatchE = allocationAndDateE.match(dateRegexE);
      if (dateMatchE) {
        var dpE = dateMatchE[0].split(/[/-]/);
        var dayE = parseInt(dpE[0], 10);
        var monthE = parseInt(dpE[1], 10) - 1;
        var yearE = parseInt(dpE[2], 10);
        dateE = new Date(yearE, monthE, dayE);
        allocationAndDateE = allocationAndDateE.replace(dateRegexE, '').trim();
      } else {
        var currentDateE = new Date();
        dateE = new Date(
          currentDateE.getFullYear(),
          currentDateE.getMonth(),
          currentDateE.getDate(),
        );
      }
      var amountE = parseFloat(amountWithDateE);
      var allocationE = allocationAndDateE || 'Thiết yếu';
      var typeE = 'ChiTieu';
      if (!isNaN(amountE) && allocations.indexOf(allocationE) >= 0) {
        appendTransactionWithFx(chatId, dateE, itemE, amountE, allocationE, typeE, 'VND');
        sendText(
          id_message,
          'Bạn đã chi tiêu: ' +
            itemE +
            ' ' +
            amountE.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
            ' vào ngày ' +
            formatDate(dateE) +
            ' và phân bổ chi tiêu của bạn vào hũ ' +
            allocationE +
            '.',
        );
        return true;
      }
      sendText(
        id_message,
        'Vui lòng cung cấp thông tin Chi tiêu và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Chi tiêu:</b>\n   - <code>nội dung - số tiền</code>\n\n<b>2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm - hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>',
      );
      return true;
    }
    sendText(
      id_message,
      'Vui lòng cung cấp thông tin Chi tiêu và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Chi tiêu:</b>\n   - <code>nội dung - số tiền</code>\n\n<b>2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm - hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>',
    );
    return true;
  }

  if (text.indexOf('/history') === 0) {
    var ph = parseHistoryCommand_(text);
    if (ph.ok) {
      sendTransactionHistoryByDateRange(id_message, chatId, ph.startDate, ph.endDate);
    } else if (ph.error) {
      sendText(id_message, ph.error);
    }
    return true;
  }

  if (text === '/start') {
    sendText(
      id_message,
      'Xin chào ' +
        userName +
        '!\n\nChào mừng đến <b>LedgerBot on Telegram</b> — bot hỗ trợ <b>quản lý tài chính cá nhân</b> trên nền <b>Google Sheets</b> + <b>Google Apps Script</b> (stack nhẹ, không cần server riêng).\n\nGửi <code>/help</code> để xem lệnh hoặc dùng menu bên dưới.',
      KEYBOARD_MAIN,
    );
    return true;
  }
  if (text === '/menu') {
    sendText(
      id_message,
      'Xin chào ' +
        userName +
        '!\n<b>LedgerBot on Telegram</b> — menu quản lý thu/chi và báo cáo.',
      KEYBOARD_MAIN,
    );
    return true;
  }

  if (text.indexOf('/del') === 0) {
    handleDelCommand_(chatId, id_message, text);
    return true;
  }

  if (text === '/help') {
    sendText(
      id_message,
      '<b>LedgerBot on Telegram</b> — hướng dẫn cho ' +
        userName +
        '.\n\nDưới đây là cách gửi thông tin Chi tiêu / Thu nhập và xem lịch sử:\n\n' +
        '<b>💳 Chi tiêu:</b>\n' +
        '1. Thêm thông tin Chi tiêu:\n  <code>nội dung - số tiền</code>\n\n' +
        '2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:\n  <code>nội dung - số tiền - ngày/tháng/năm</code>\n\n' +
        '3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:\n  <code>nội dung - số tiền - ngày/tháng/năm - hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>\n\n' +
        '<b>💰 Thu nhập:</b>\n' +
        '1. Thêm thông tin Thu nhập:\n  <code>nội dung + số tiền</code>\n\n' +
        '2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:\n  <code>nội dung + số tiền + ngày/tháng/năm</code>\n\n' +
        '3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:\n  <code>nội dung + số tiền + ngày/tháng/năm + hũ (...)</code>\n\n' +
        '<b>➕ Wizard thêm (đa tiền tệ):</b> <code>/add</code>\n' +
        '<b>🗑️ Xóa theo ID:</b> <code>/del &lt;uuid&gt;</code> rồi xác nhận inline.\n\n' +
        '<b>📅 Lịch sử Thu/Chi:</b> <code>/history today</code>, <code>/history week</code>, <code>/history w 1</code>, <code>/history month MM/YYYY</code>, <code>/history year YYYY</code>, <code>/history d DD/MM/YYYY</code>\n\n' +
        '<b>🗑️ Clear:</b> <code>/clearchitieu</code>, <code>/clearthunhap</code>, <code>/clearall</code>\n',
    );
    return true;
  }

  if (text === '/add' || text.indexOf('/add ') === 0) {
    return false;
  }

  sendText(
    id_message,
      'Xin chào ' +
      userName +
      '!\n\n<b>LedgerBot on Telegram</b> — gửi <code>/help</code> để xem lệnh quản lý tài chính cá nhân.',
  );
  return true;
}

var UUID_REGEX_ = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function handleDelCommand_(chatId, id_message, text) {
  var menuthuchi = {
    inline_keyboard: [[{ text: 'Xem Lịch Sử Thu/Chi', callback_data: 'history' }]],
  };

  var parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    sendText(
      id_message,
      'Gửi <code>/del &lt;uuid&gt;</code> (xem ID trong lịch sử) hoặc <code>/del &lt;số_thứ_tự&gt;</code> như cũ.\nVí dụ: <code>/del a1b2c3d4-e5f6-7890-abcd-ef1234567890</code>',
      menuthuchi,
    );
    return;
  }

  var arg = parts[1];
  if (UUID_REGEX_.test(arg)) {
    var found = findTransactionByTxnId(chatId, arg);
    if (!found) {
      sendText(id_message, 'Không tìm thấy giao dịch với ID đó.');
      return;
    }
    var row = found.row;
    var preview =
      'Xóa giao dịch này?\n- Mô tả: ' +
      row[COL_DESC] +
      '\n- Số tiền (ghi sổ): ' +
      row[COL_AMOUNT] +
      ' ' +
      (row[COL_CURRENCY] || 'VND') +
      '\n- VND tương đương: ' +
      transactionRowVnd_(row) +
      '\n- Ngày: ' +
      formatDate(row[COL_DATE]) +
      '\n- ID: <code>' +
      arg +
      '</code>';
    CacheService.getScriptCache().put(CACHE_PREFIX_PENDING_DEL + String(chatId), arg, 600);
    sendText(id_message, preview, {
      inline_keyboard: [
        [
          { text: 'Xác nhận xóa', callback_data: 'del_y' },
          { text: 'Hủy', callback_data: 'del_n' },
        ],
      ],
    });
    return;
  }

  var n = parseInt(arg, 10);
  if (!isNaN(n)) {
    var success = deleteTransactionByRow(chatId, n);
    if (success) {
      sendText(id_message, 'Đã xoá thành công Thu/Chi có số thứ tự: ' + n);
    } else {
      sendText(id_message, 'Không tìm thấy thu/chi có số thứ tự ' + n);
    }
    return;
  }

  sendText(
    id_message,
    'Không hiểu tham số. Dùng UUID từ lịch sử hoặc số thứ tự. Ví dụ: <code>/del 3</code>',
    menuthuchi,
  );
}
