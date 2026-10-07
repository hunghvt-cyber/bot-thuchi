/**
 * Transaction sheet columns (1-based in sheet; arrays use 0-based)
 * A Date, B Description, C Amount (original), D Allocation, E Type,
 * F DedupeEpoch, G TransactionId, H Currency, I AmountVND, J FxRate, K FxAsOfDate
 */
var COL_DATE = 0;
var COL_DESC = 1;
var COL_AMOUNT = 2;
var COL_ALLOC = 3;
var COL_TYPE = 4;
var COL_EPOCH = 5;
var COL_TXN_ID = 6;
var COL_CURRENCY = 7;
var COL_AMT_VND = 8;
var COL_FX_RATE = 9;
var COL_FX_DATE = 10;
var SHEET_NUM_COLS = 11;

var HEADER_ROW = [
  'Date',
  'Description',
  'Amount',
  'Allocation',
  'Type',
  'DedupeEpoch',
  'TransactionId',
  'Currency',
  'AmountVND',
  'FxRate',
  'FxAsOfDate',
];

function getSheet(userId) {
  var mainId = getMainSpreadsheetId();
  if (!mainId) throw new Error('Missing GOOGLE_SPREADSHEET_ID script property');

  var usersSpreadsheet = SpreadsheetApp.openById(mainId);
  var usersSheet = usersSpreadsheet.getSheetByName('Users');
  if (!usersSheet) throw new Error('Master spreadsheet must have a sheet named Users');

  var userData = usersSheet.getDataRange().getValues();
  var sheetId = null;
  for (var i = 0; i < userData.length; i++) {
    if (userData[i][0] === userId) {
      sheetId = userData[i][1];
      break;
    }
  }

  if (!sheetId) {
    var newSpreadsheet = SpreadsheetApp.create('Expense Tracker for ' + userId);
    sheetId = newSpreadsheet.getId();
    usersSheet.appendRow([userId, sheetId]);
    var sheet = newSpreadsheet.getActiveSheet();
    sheet.getRange(1, 1, 1, SHEET_NUM_COLS).setValues([HEADER_ROW]);
    var maxCols = sheet.getMaxColumns();
    if (maxCols > SHEET_NUM_COLS) {
      sheet.deleteColumns(SHEET_NUM_COLS + 1, maxCols - SHEET_NUM_COLS);
    }
    var numRows = sheet.getMaxRows();
    if (numRows > 2) {
      sheet.deleteRows(3, numRows - 2);
    }
    return sheet;
  }

  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  migrateUserTransactionSheet_(sheet);
  return sheet;
}

function migrateUserTransactionSheet_(sheet) {
  while (sheet.getLastColumn() < SHEET_NUM_COLS) {
    sheet.insertColumnAfter(Math.max(1, sheet.getLastColumn()));
  }
  sheet.getRange(1, 1, 1, SHEET_NUM_COLS).setValues([HEADER_ROW]);

  var lastRow = sheet.getLastRow();
  for (var r = 2; r <= lastRow; r++) {
    var row = sheet.getRange(r, 1, r, SHEET_NUM_COLS).getValues()[0];
    if (!row[COL_TXN_ID]) {
      sheet.getRange(r, COL_TXN_ID + 1).setValue(Utilities.getUuid());
    }
    if (!row[COL_CURRENCY]) {
      sheet.getRange(r, COL_CURRENCY + 1).setValue('VND');
    }
    var vndCell = row[COL_AMT_VND];
    if (vndCell === '' || vndCell == null) {
      var amt = Number(row[COL_AMOUNT]) || 0;
      sheet.getRange(r, COL_AMT_VND + 1).setValue(amt);
    }
  }
}

/**
 * @param {string|number} userId
 * @param {Date} date
 * @param {string} description
 * @param {number} amount
 * @param {string} allocation
 * @param {string} type ThuNhap | ChiTieu
 * @param {{epoch?: number, currency?: string, amountVnd?: number, fxRate?: number|string, fxDate?: string|Date, txnId?: string}=} opt
 */
function appendTransactionRow(userId, date, description, amount, allocation, type, opt) {
  opt = opt || {};
  var txnId = opt.txnId || Utilities.getUuid();
  var currency = opt.currency || 'VND';
  var amountVnd = opt.amountVnd != null ? opt.amountVnd : amount;
  var fxRate = opt.fxRate != null && opt.fxRate !== '' ? opt.fxRate : '';
  var fxDate = opt.fxDate != null && opt.fxDate !== '' ? opt.fxDate : '';
  if (fxDate instanceof Date) {
    fxDate = formatDateVN(fxDate);
  }
  var epoch = opt.epoch != null && opt.epoch !== '' ? opt.epoch : '';

  var sheet = getSheet(userId);
  sheet.appendRow([
    date,
    description,
    amount,
    allocation,
    type,
    epoch,
    txnId,
    currency,
    amountVnd,
    fxRate,
    fxDate,
  ]);
}
