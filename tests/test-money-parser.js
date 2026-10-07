const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('FamilyLedger.gs', 'utf8');
const context = { console };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'FamilyLedger.gs' });
const cases = [
  ['45k',45000],['45 nghìn',45000],['630',630000],['đi chợ 630',630000],
  ['2tr5',2500000],['học phí 2tr5',2500000],['1tr350',1350000],
  ['tiền điện 1tr350',1350000],['1.5tr',1500000],['1,5tr',1500000],
  ['cafe 2 đứa 85',85000]
];
for (const pair of cases) {
  const got = context.parseMoneyLocal_(pair[0]);
  if (got !== pair[1]) throw new Error(pair[0] + ': expected ' + pair[1] + ', got ' + got);
}
console.log('PASS (' + cases.length + ' money parser cases)');
