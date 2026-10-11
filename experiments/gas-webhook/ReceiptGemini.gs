// Existing Script Properties key/model; no CLI, NAS, paid fallback, or automatic retries.
function sharedGemini_(contents,jsonOutput) {
  var key=getGeminiApiKey();
  if(!key){var missing=new Error('Chưa cấu hình Gemini.');missing.reason='CONFIG';throw missing;}
  var model=getScriptProp_('GEMINI_SHARED_MODEL')||'gemini-3.5-flash-lite';
  if(!/^[a-zA-Z0-9._-]+$/.test(model))throw new Error('Model Gemini không hợp lệ.');
  var config={maxOutputTokens:2048};
  if(jsonOutput)config.responseMimeType='application/json';
  var response;
  try{response=UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
    method:'post',contentType:'application/json',headers:{'x-goog-api-key':key},
    payload:JSON.stringify({contents:contents,generationConfig:config}),muteHttpExceptions:true
  });}catch(e){throw new Error('Không kết nối được Gemini. Thử lại sau.');}
  var code=response.getResponseCode();
  if(code===429){var limited=new Error('Đã hết hạn mức Gemini hoặc đang quá tải. Thử lại sau.');limited.code=429;throw limited;}
  if(code<200||code>=300){var failed=new Error('Gemini chưa phản hồi.');failed.reason='HTTP';failed.upstreamStatus=code;throw failed;}
  var result;try{result=JSON.parse(response.getContentText());}catch(e){throw new Error('Câu trả lời Gemini không hợp lệ.');}
  var candidate=result.candidates&&result.candidates[0];
  if(!candidate || candidate.finishReason!=='STOP'){var incomplete=new Error('Gemini chưa trả lời đầy đủ.');incomplete.reason='INCOMPLETE';throw incomplete;}
  var parts=candidate.content&&candidate.content.parts||[];
  var text=parts.filter(function(p){return typeof p.text==='string'&&!p.thought;}).map(function(p){return p.text;}).join('');
  if(!text.trim()||text.length>16000)throw new Error('Câu trả lời Gemini trống hoặc quá dài.');
  return text;
}

// Small daily ceilings protect the existing bot quota; they don't prove Google billing tier.
function sharedGeminiQuota_(kind,maximum,alreadyLocked) {
  var lock=LockService.getScriptLock();
  if(!alreadyLocked&&!lock.tryLock(1000))throw new Error('Bot đang bận. Thử lại sau.');
  try{
    var key='GEMINI_USAGE_'+kind,props=PropertiesService.getScriptProperties();
    var day=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd'),state;
    try{state=JSON.parse(props.getProperty(key)||'null');}catch(e){}
    if(!state||state.day!==day)state={day:day,count:0};
    if(state.count>=maximum){var e=new Error('Đã hết hạn mức hôm nay. Hãy thử lại ngày mai.');e.code=429;throw e;}
    state.count++;props.setProperty(key,JSON.stringify(state));
  }finally{if(!alreadyLocked)lock.releaseLock();}
}

