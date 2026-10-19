// Existing Script Properties key/model; no CLI, NAS, paid fallback, or automatic retries.
function sharedGemini_(contents,jsonOutput) {
  return sharedGeminiResult_(contents,jsonOutput).text;
}
function sharedGeminiResult_(contents,jsonOutput,selectedModel) {
  var key=getGeminiApiKey();
  if(!key){var missing=new Error('Chưa cấu hình Gemini.');missing.reason='CONFIG';throw missing;}
  var model=selectedModel||getScriptProp_('GEMINI_SHARED_MODEL')||'gemini-3.5-flash-lite';
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
  return {text:text,requestedModel:model,modelVersion:typeof result.modelVersion==='string'&&/^[a-zA-Z0-9._-]{1,128}$/.test(result.modelVersion)?result.modelVersion:null};
}

// Only reviewed text models; listing is not proof of remaining quota or billing tier.
function homepageModelIds_() {
  var current=getScriptProp_('GEMINI_SHARED_MODEL')||'gemini-3.5-flash-lite';
  return [current,'gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-2.5-flash-lite'].filter(function(id,i,all){return /^[a-zA-Z0-9._-]{1,128}$/.test(id)&&all.indexOf(id)===i;});
}
function homepageModels_(forceRefresh) {
  var key=getGeminiApiKey();
  if(!key){var missing=new Error('Chưa cấu hình Gemini.');missing.reason='CONFIG';throw missing;}
  var current=getScriptProp_('GEMINI_SHARED_MODEL')||'gemini-3.5-flash-lite';
  var cache=CacheService.getScriptCache(),cacheKey='HOMEPAGE_MODELS_V1_'+current,cached=cache.get(cacheKey);
  if(cached&&!forceRefresh){try{return JSON.parse(cached);}catch(ignore){}}
  var allowed=homepageModelIds_(),found=[],token='';
  // Bounded pagination. Fail closed rather than offering a partial list.
  for(var page=0;page<5;page++){
    var response=UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'+(token?'&pageToken='+encodeURIComponent(token):''),{headers:{'x-goog-api-key':key},muteHttpExceptions:true});
    if(response.getResponseCode()!==200){var failed=new Error('Không tải được danh sách model.');failed.reason='HTTP';failed.upstreamStatus=response.getResponseCode();throw failed;}
    var data=JSON.parse(response.getContentText());
    (data.models||[]).forEach(function(m){var id=String(m.name||'').replace(/^models\//,'');if(allowed.indexOf(id)>=0&&Array.isArray(m.supportedGenerationMethods)&&m.supportedGenerationMethods.indexOf('generateContent')>=0&&found.indexOf(id)<0)found.push(id);});
    token=data.nextPageToken||'';if(!token)break;
  }
  if(token)throw new Error('Danh sách model chưa đầy đủ.');
  var result={defaultModel:current,models:allowed.filter(function(id){return found.indexOf(id)>=0;})};
  cache.put(cacheKey,JSON.stringify(result),300);return result;
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

function homepageChat_(envelope) {
  function output(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
  try{
    var secret=getScriptProp_('HOMEPAGE_STATS_SECRET');
    if(!secret||secret.length<32||typeof envelope.payload!=='string'||envelope.payload.length>150000)return output({ok:false});
    var expected=Utilities.computeHmacSha256Signature(envelope.payload,secret,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
    var received=String(envelope.signature||''),diff=expected.length^received.length;
    for(var i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^(received.charCodeAt(i)||0);
    if(diff)return output({ok:false});
    var request=JSON.parse(envelope.payload),messages=request.messages;
    if(request.action!=='homepage_chat'||typeof request.timestamp!=='number'||!isFinite(request.timestamp)||Math.abs(Date.now()-request.timestamp)>60000)return output({ok:false});
    if(request.operation==='models'){var catalog=homepageModels_(request.refresh===true);return output({ok:true,defaultModel:catalog.defaultModel,models:catalog.models});}
    if(request.operation&&request.operation!=='chat')return output({ok:false});
    if(request.action!=='homepage_chat'||typeof request.timestamp!=='number'||!isFinite(request.timestamp)||Math.abs(Date.now()-request.timestamp)>60000||!Array.isArray(messages)||!messages.length||messages.length>19||messages.length%2!==1)return output({ok:false});
    var total=0,contents=messages.map(function(m,i){
      if(!m||m.role!==(i%2?'model':'user')||typeof m.text!=='string'||!m.text.trim()||m.text.length>(m.role==='user'?4000:16000))throw new Error('Tin nhắn không hợp lệ.');
      total+=m.text.length;return {role:m.role,parts:[{text:m.text}]};
    });
    if(total>24000)return output({ok:false});
    var model=request.model;
    if(model!==undefined&&(typeof model!=='string'||homepageModelIds_().indexOf(model)<0))return output({ok:false,reason:'MODEL_UNAVAILABLE',code:400});
    if(model&&homepageModels_().models.indexOf(model)<0)return output({ok:false,reason:'MODEL_UNAVAILABLE',code:400});
    sharedGeminiQuota_('CHAT',30);
    var answer=sharedGeminiResult_(contents,false,model);
    return output({ok:true,text:answer.text,requestedModel:answer.requestedModel,modelVersion:answer.modelVersion});
  }catch(e){return output({ok:false,code:e.code===429?429:502,reason:['CONFIG','HTTP','INCOMPLETE'].indexOf(e.reason)>=0?e.reason:'UNKNOWN',upstreamStatus:Number(e.upstreamStatus)||null,model:getScriptProp_('GEMINI_SHARED_MODEL')||'gemini-3.5-flash-lite'});}
}

