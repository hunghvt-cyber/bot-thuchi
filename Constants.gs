/** @type {readonly string[]} */
var ALLOCATIONS = ['Thiết yếu', 'Giáo dục', 'Tiết kiệm', 'Đầu tư', 'Tiêu dùng', 'Khác'];

/** @type {Object<string,string|string[]>} */
var BANK_DOMAINS = {
  VIB: 'vib.com.vn',
  CAKE: 'no-reply@cake.vn',
  VPBank: ['vpbankonline@vpb.com.vn', 'customercare@care.vpb.com.vn'],
  ACB: 'mailalert@acb.com.vn',
};

var KEYBOARD_MAIN = {
  inline_keyboard: [
    [{ text: 'Xem Tổng Chi Tiêu', callback_data: 'totalchi' }],
    [{ text: 'Xem Tổng Thu Nhập', callback_data: 'totalthunhap' }],
    [{ text: 'Xem Số Tiền Hiện Tại', callback_data: 'currentbalance' }],
    [{ text: 'Xem Chi Tiết Các Hũ', callback_data: 'getTotalAllocationBalances' }],
    [{ text: 'Xem Lịch Sử Thu/Chi', callback_data: 'history' }],
    [{ text: 'Connect Email', callback_data: 'connect_email' }],
  ],
};

var KEYBOARD_MENCHI = {
  inline_keyboard: [
    [
      { text: 'Xem Tổng Thu Nhập', callback_data: 'totalthunhap' },
      { text: 'Xem Chi Tiết Các Hũ', callback_data: 'getTotalAllocationBalances' },
    ],
  ],
};

/** Cache key prefixes (must stay short for Telegram + GAS cache limits) */
var CACHE_PREFIX_WIZARD_ADD = 'wizard:add:';
var CACHE_PREFIX_WIZARD_DEL = 'wizard:del:';
var CACHE_PREFIX_PENDING_DEL = 'pending_del:';
