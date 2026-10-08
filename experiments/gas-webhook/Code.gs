function doGet(e) { return ContentService.createTextOutput('webhook-test-ready'); }
function doPost(e) {
  var start=Date.now();
  try {
    var update=JSON.parse(e.postData.contents);
    var msg=update.message;
    var token=PropertiesService.getScriptProperties().getProperty('TEST_BOT_TOKEN');
    if(msg && msg.text && token) {
      var r=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
        method:'post',payload:{chat_id:msg.chat.id,text:'Webhook OK ('+(Date.now()-start)+'ms): '+msg.text},
        muteHttpExceptions:true
      });
      console.log('update='+update.update_id+' elapsed='+ (Date.now()-start)+' telegram_http='+r.getResponseCode());
    }
  } catch(err) {console.error(String(err));}
  return ContentService.createTextOutput('OK');
}