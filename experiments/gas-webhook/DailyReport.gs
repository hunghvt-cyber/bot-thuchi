function testMoneyParser(){
  var cases = [
    ['45k', 45000],
    ['45 nghìn', 45000],
    ['630', 630000],
    ['đi chợ 630', 630000],
    ['2tr5', 2500000],
    ['học phí 2tr5', 2500000],
    ['1tr350', 1350000],
    ['tiền điện 1tr350', 1350000],
    ['1.5tr', 1500000],
    ['1,5tr', 1500000],
    ['cafe 2 đứa 85', 85000]
  ];
  cases.forEach(function(test){
    var got = parseMoneyLocal_(test[0]);
    if (got !== test[1]) throw new Error(test[0]+' expected '+test[1]+' got '+got);
  });
  return 'PASS ('+cases.length+' cases)';
}

// Runs inside the existing one-minute polling trigger; no additional trigger needed.
// Lock in pollFamilyTelegram_ serializes checks. Retry on subsequent polls if sending fails.
function sendFamilyDailyReportIfDue_(){
  var now=new Date(),tz='Asia/Ho_Chi_Minh';
  if(Number(Utilities.formatDate(now,tz,'HH'))!==21)return;
  var date=Utilities.formatDate(now,tz,'yyyy-MM-dd');
  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('DAILY_REPORT_SENT_DATE')===date)return;
  var chatId=familyGroupId_();
  if(!chatId)throw new Error('Chưa cấu hình FAMILY_GROUP_ID cho báo cáo tự động');
  var data=familySheet_().getDataRange().getValues();
  var totalToday=0,totalMonth=0;
  var month=date.slice(0,7);
  for(var i=1;i<data.length;i++){
    var r=data[i];
    if(r[4]!=='ChiTieu'||String(r[15])==='DELETED')continue;
    var d=new Date(r[0]);if(isNaN(d.getTime()))continue;
    var day=Utilities.formatDate(d,tz,'yyyy-MM-dd');
    if(day.slice(0,7)!==month||day>date)continue;
    var amount=Number(r[7])||0;
    totalMonth+=amount;
    if(day===date)totalToday+=amount;
  }
  var days=Number(date.slice(8,10));
  var message=[
    '<b>BÁO CÁO CHI TIÊU — '+date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4)+'</b>',
    'Chi tiêu hôm nay: <b>'+formatVnd_(totalToday)+'</b>',
    'Trung bình/ngày trong tháng: <b>'+formatVnd_(totalMonth/days)+'</b>',
    'Tổng chi tiêu tháng: <b>'+formatVnd_(totalMonth)+'</b>'
  ].join('\n');
  sendText(chatId,message);
  props.setProperty('DAILY_REPORT_SENT_DATE',date);
  props.deleteProperty('DAILY_REPORT_LAST_ERROR');
}
