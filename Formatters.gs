/**
 * @param {Date|string|number} value
 * @returns {string} DD/MM/YYYY in local date parts
 */
function formatDateVN(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
}

function formatNumberWithSeparator(number) {
  return number.toString();
}

function formatAmountLocaleVi_(n) {
  return Number(n).toLocaleString('vi-VN');
}

/** Alias for legacy call sites */
function formatDate(value) {
  return formatDateVN(value);
}
