function transactionRowVnd_(row) {
  var v = row[COL_AMT_VND];
  if (v !== '' && v != null && !isNaN(Number(v))) return Number(v);
  return Number(row[COL_AMOUNT]) || 0;
}

function padRowToNumCols_(row) {
  var out = [];
  for (var c = 0; c < SHEET_NUM_COLS; c++) {
    out.push(c < row.length ? row[c] : '');
  }
  return out;
}

function clearTransactionsByType_(userId, typeFilter) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  var newRows = [padRowToNumCols_(data[0])];
  for (var i = 1; i < data.length; i++) {
    var typ = data[i][COL_TYPE];
    var drop = false;
    if (typeFilter === 'BOTH') {
      drop = typ === 'ThuNhap' || typ === 'ChiTieu';
    } else {
      drop = typ === typeFilter;
    }
    if (!drop) {
      newRows.push(padRowToNumCols_(data[i]));
    }
  }
  sheet.clearContents();
  if (newRows.length > 0) {
    sheet.getRange(1, 1, newRows.length, SHEET_NUM_COLS).setValues(newRows);
  }
}

function getTotalAmountByType(userId, type) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][COL_TYPE] === type) {
      total += transactionRowVnd_(data[i]);
    }
  }
  return total;
}

function getCurrentBalance(userId) {
  return getTotalAmountByType(userId, 'ThuNhap') - getTotalAmountByType(userId, 'ChiTieu');
}

function getTotalAllocationBalances(userId) {
  var balances = {};
  for (var i = 0; i < ALLOCATIONS.length; i++) {
    balances[ALLOCATIONS[i]] = 0;
  }
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var allocation = row[COL_ALLOC];
    var typ = row[COL_TYPE];
    if (Object.prototype.hasOwnProperty.call(balances, allocation)) {
      var amt = transactionRowVnd_(row);
      if (typ === 'ThuNhap') {
        balances[allocation] += amt;
      } else if (typ === 'ChiTieu') {
        balances[allocation] -= amt;
      }
    }
  }
  return balances;
}

function getTransactionHistoryList(userId) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  var transactions = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[COL_TYPE]) continue;
    transactions.push({
      date: row[COL_DATE],
      description: row[COL_DESC],
      amount: row[COL_AMOUNT],
      allocation: row[COL_ALLOC],
      type: row[COL_TYPE],
      amountVnd: transactionRowVnd_(row),
      currency: row[COL_CURRENCY] || 'VND',
      txnId: String(row[COL_TXN_ID] || ''),
      sheetRow: i + 1,
    });
  }
  return transactions;
}

function getTransactionHistoryInRange(userId, startDate, endDate) {
  var all = getTransactionHistoryList(userId);
  var out = [];
  for (var i = 0; i < all.length; i++) {
    var transactionDate = new Date(all[i].date);
    if (transactionDate >= startDate && transactionDate < endDate) {
      out.push(all[i]);
    }
  }
  return out;
}

function deleteTransactionByRow(userId, displayIndex1Based) {
  var sheet = getSheet(userId);
  var rowNum = displayIndex1Based + 1;
  if (rowNum <= 1 || rowNum > sheet.getLastRow()) return false;
  sheet.deleteRow(rowNum);
  return true;
}

function findTransactionByTxnId(userId, txnId) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL_TXN_ID]) === String(txnId)) {
      return { sheetRow: i + 1, row: data[i] };
    }
  }
  return null;
}

function deleteTransactionByTxnId(userId, txnId) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL_TXN_ID]) === String(txnId)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function sendTotalPhanboSummary(chatId, userId) {
  var allocations = getTotalAllocationBalances(userId);
  var message = '\nSố tiền phân bổ theo hũ:\n';
  for (var allocation in allocations) {
    if (!Object.prototype.hasOwnProperty.call(allocations, allocation)) continue;
    message +=
      '- ' +
      allocation +
      ': ' +
      allocations[allocation].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
      '\n';
  }
  var menuphanbo = {
    inline_keyboard: [
      [
        { text: 'Xem Tổng Thu Nhập', callback_data: 'totalthunhap' },
        { text: 'Xem Tổng Chi Tiêu', callback_data: 'totalchi' },
      ],
    ],
  };
  sendText(chatId, message, menuphanbo);
}

function sendTotalIncomeSummary(chatId, userId) {
  var totalIncome = getTotalAmountByType(userId, 'ThuNhap');
  var currentBalance = getCurrentBalance(userId);

  var message =
    '- Tổng thu nhập của bạn là: ' +
    totalIncome.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    '\n';
  message +=
    '- Số tiền hiện tại của bạn là: ' +
    currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    '\n';

  var menuchithu = {
    inline_keyboard: [
      [
        { text: 'Xem Tổng Chi Tiêu', callback_data: 'totalchi' },
        { text: 'Xem Chi Tiết Các Hũ', callback_data: 'getTotalAllocationBalances' },
      ],
    ],
  };

  sendText(chatId, message, menuchithu);
}

function sendTransactionHistoryPart(
  chatId,
  userId,
  transactions,
  chunkIndex,
  chunkSize,
  totalChunks,
  totals,
) {
  var startIndex = chunkIndex * chunkSize;
  var endIndex = Math.min((chunkIndex + 1) * chunkSize, transactions.length);
  var message =
    'Lịch sử chi tiêu của bạn (Trang ' + (chunkIndex + 1) + ' / ' + totalChunks + '):\n';

  function formatTransaction(transaction, index) {
    var formattedDate = new Intl.DateTimeFormat('vi-VN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).format(new Date(transaction.date));
    var formattedAmount = formatNumberWithSeparator(transaction.amountVnd);

    var typeLabel = '';
    var transactionAmount = '';

    if (transaction.type === 'ChiTieu') {
      typeLabel = 'Chi tiêu💸';
      transactionAmount = '<s>-' + formattedAmount + '</s>';
    } else if (transaction.type === 'ThuNhap') {
      typeLabel = 'Thu nhập💰';
      transactionAmount = '<b>+' + formattedAmount + '</b>';
    } else {
      typeLabel = transaction.type;
      transactionAmount = String(transaction.amountVnd);
    }

    var idShort = transaction.txnId ? transaction.txnId.slice(0, 8) + '…' : '';

    return (
      '\n' +
      (index + 1) +
      '. Ngày: ' +
      formattedDate +
      '\n- Mô tả: ' +
      transaction.description +
      '\n- Số tiền (VND tương đương): ' +
      transactionAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
      '\n- Hũ: ' +
      transaction.allocation +
      (idShort ? '\n- ID: <code>' + transaction.txnId + '</code>' : '') +
      '\n<i>- Loại:</i> ' +
      typeLabel +
      '\n'
    );
  }

  for (var i = startIndex; i < endIndex; i++) {
    var transaction = transactions[i];
    if (transaction.type === 'ChiTieu') {
      totals.chi += transaction.amountVnd;
    } else if (transaction.type === 'ThuNhap') {
      totals.thu += transaction.amountVnd;
    }
    message += formatTransaction(transaction, i);
  }

  if (chunkIndex == totalChunks - 1) {
    var currentBalance = getCurrentBalance(userId);
    message +=
      '<b>💸 Tổng Chi tiêu: <s>' +
      totals.chi.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
      '</s></b>\n';
    message +=
      '<b>💰 Tổng Thu nhập: ' +
      totals.thu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
      '</b>\n';
    message +=
      '<b>💹 Số tiền hiện tại của bạn là: ' +
      currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
      '</b>\n';
  }

  sendText(chatId, message);

  if (chunkIndex < totalChunks - 1) {
    Utilities.sleep(3000);
    sendTransactionHistoryPart(
      chatId,
      userId,
      transactions,
      chunkIndex + 1,
      chunkSize,
      totalChunks,
      totals,
    );
  }
}

function sendTransactionHistory(chatId, userId) {
  var transactions = getTransactionHistoryList(userId);
  if (transactions.length === 0) {
    sendText(chatId, 'Bạn chưa có chi tiêu nào.');
    return;
  }

  var chunkSize = 16;
  var totalChunks = Math.ceil(transactions.length / chunkSize);
  var totals = { thu: 0, chi: 0 };

  sendTransactionHistoryPart(chatId, userId, transactions, 0, chunkSize, totalChunks, totals);
}

function sendTransactionHistoryByDateRange(chatId, userId, startDate, endDate) {
  var transactions = getTransactionHistoryInRange(userId, startDate, endDate);
  var chunkSize = 16;
  var totalChunks = Math.max(1, Math.ceil(transactions.length / chunkSize));

  var totals = { thu: 0, chi: 0 };

  function sendPart(chunkIndex) {
    var message =
      'Lịch sử chi tiêu từ ' +
      formatDate(startDate) +
      ' đến ' +
      formatDate(endDate) +
      ' (Trang ' +
      (chunkIndex + 1) +
      ' / ' +
      totalChunks +
      '):\n\n';

    var startIndex = chunkIndex * chunkSize;
    var endIndex = Math.min((chunkIndex + 1) * chunkSize, transactions.length);

    for (var i = startIndex; i < endIndex; i++) {
      var transaction = transactions[i];
      var formattedDate = formatDate(transaction.date);
      var typeLabel = '';
      var transactionAmount = transaction.amountVnd;
      var formatTransactionAmount = new Intl.NumberFormat('vi-VN').format(transactionAmount);

      if (transaction.type === 'ChiTieu') {
        typeLabel = 'Chi tiêu💸';
        transactionAmount = '<s>-' + formatTransactionAmount + 'đ</s>';
        totals.chi += transaction.amountVnd;
      } else if (transaction.type === 'ThuNhap') {
        typeLabel = 'Thu nhập💰';
        transactionAmount = '<b>+' + formatTransactionAmount + 'đ</b>';
        totals.thu += transaction.amountVnd;
      } else {
        typeLabel = transaction.type;
        transactionAmount = String(transaction.amountVnd);
      }

      message += i + 1 + '. Ngày: ' + formattedDate + '\n';
      message += '- Mô tả: ' + transaction.description + '\n';
      message += '- Số tiền: ' + transactionAmount + '\n';
      message += '- Hũ: ' + transaction.allocation + '\n';
      if (transaction.txnId) {
        message += '- ID: <code>' + transaction.txnId + '</code>\n';
      }
      message += '<i>- Loại: ' + typeLabel + '</i>\n\n';
    }

    if (chunkIndex === totalChunks - 1) {
      var currentBalance = getCurrentBalance(userId);
      message +=
        '<b>💸 Tổng Chi tiêu: <s>' +
        totals.chi.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
        '</s></b>\n';
      message +=
        '<b>💰 Tổng Thu nhập: ' +
        totals.thu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
        '</b>\n';
      message +=
        '<b>💹 Số tiền hiện tại: ' +
        currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
        '</b>\n';
    }

    sendText(chatId, message);

    if (chunkIndex < totalChunks - 1) {
      Utilities.sleep(3000);
      sendPart(chunkIndex + 1);
    }
  }

  if (transactions.length === 0) {
    sendText(chatId, 'Không có giao dịch nào trong khoảng thời gian này.');
  } else {
    sendPart(0);
  }
}
