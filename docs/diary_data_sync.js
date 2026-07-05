(function(){
  var CONFIG_URL_KEY = 'tsukiyomi:sheetSync:url';
  var CONFIG_SECRET_KEY = 'tsukiyomi:sheetSync:secretKey';
  var OUTBOX_KEY = 'tsukiyomi:diarySync:outbox';
  var CACHED_PROFILE_KEY = 'tsukiyomi:diarySync:cachedProfile';
  var STRUCTURED_DIARY_PREFIX = 'tsukiyomi:structuredDiary:v1:';
  var DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxIffIfAOptA-WR6jjT9dg8Fc0yb9HpwsLTR-ZG43Nw12_KR_Yi0Xj9IT_FAyXGV_Ic/exec';
  var DEFAULT_SECRET_KEY = 'tsukiyomi-2026-key';

  function getParams(){
    return new URLSearchParams(window.location.search || '');
  }

  function loadCachedProfile(){
    try { return JSON.parse(localStorage.getItem(CACHED_PROFILE_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function saveCachedProfile(p){
    try { localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(p)); }
    catch(e) {}
  }

  function getProfile(){
    var params = getParams();
    var cached = loadCachedProfile();
    var fromUrl = {
      name: params.get('name') || '',
      email: params.get('email') || '',
      birth: params.get('birth') || '',
      zodiac: params.get('zodiac') || '',
      shuku: params.get('shuku') || '',
      participantId: params.get('participantId') || params.get('pid') || '',
      concern: params.get('concern') || '',
      q: params.get('q') || '',
      q2: params.get('q2') || ''
    };
    // URLパラメータにプロフィール情報がある場合はキャッシュを更新
    if(fromUrl.participantId || fromUrl.email || fromUrl.name || fromUrl.birth){
      var merged = {};
      var keys = Object.keys(fromUrl);
      for(var i = 0; i < keys.length; i++){
        merged[keys[i]] = fromUrl[keys[i]] || cached[keys[i]] || '';
      }
      saveCachedProfile(merged);
      return merged;
    }
    // URLパラメータがない場合はキャッシュから補完
    return {
      name: cached.name || '',
      email: cached.email || '',
      birth: cached.birth || '',
      zodiac: cached.zodiac || '',
      shuku: cached.shuku || '',
      participantId: cached.participantId || '',
      concern: cached.concern || '',
      q: cached.q || '',
      q2: cached.q2 || ''
    };
  }

  function getConfig(){
    var savedSecret = localStorage.getItem(CONFIG_SECRET_KEY);
    var savedUrl = localStorage.getItem(CONFIG_URL_KEY);
    return {
      url: savedUrl || DEFAULT_WEBHOOK_URL,
      secretKey: savedSecret || DEFAULT_SECRET_KEY
    };
  }

  function setConfig(url, secretKey){
    localStorage.setItem(CONFIG_URL_KEY, url || '');
    localStorage.setItem(CONFIG_SECRET_KEY, secretKey || DEFAULT_SECRET_KEY);
  }

  function jstString(date){
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function pageName(){
    return (window.location.pathname.split('/').pop() || 'unknown')
      .replace(/%20/g, ' ')
      .replace('_sync.html', '.html');
  }

  function readOutbox(){
    try {
      return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    } catch(error) {
      return [];
    }
  }

  function writeOutbox(items){
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items || []));
  }

  function addOutbox(payload){
    var items = readOutbox();
    items.push(payload);
    writeOutbox(items.slice(-200));
  }

  function collectFields(root){
    var scope = root || document;
    var fields = {};
    var nodes = scope.querySelectorAll('textarea, input:not([type="file"]), select');
    nodes.forEach(function(node){
      var key = node.getAttribute('data-sync-key') || node.name || node.id || node.getAttribute('aria-label') || node.placeholder || node.tagName.toLowerCase();
      key = String(key).replace(/\s+/g, ' ').trim().slice(0, 80);
      if(!key) key = 'field';
      fields[key] = node.value || '';
    });
    var fileInputs = scope.querySelectorAll('input[type="file"]');
    var files = [];
    fileInputs.forEach(function(input){
      Array.prototype.forEach.call(input.files || [], function(file){
        files.push({ name: file.name, type: file.type, size: file.size });
      });
    });
    if(files.length) fields.attachedFiles = files;
    return fields;
  }

  function status(text, ok){
    document.querySelectorAll('[data-diary-sync-status]').forEach(function(el){
      el.textContent = text || '';
      el.style.color = ok === false ? '#d38b8b' : '';
    });
  }

  function buildRecord(recordType, payload){
    var now = new Date();
    return {
      secretKey: getConfig().secretKey,
      savedAt: now.toISOString(),
      savedAtJst: jstString(now),
      recordType: recordType || 'diary_record',
      page: pageName(),
      pageUrl: window.location.href,
      profile: getProfile(),
      payload: payload || {}
    };
  }

  function postRecord(record){
    var config = getConfig();
    var profile = record.profile || {};
    var who = profile.participantId ? '参加者ID: ' + profile.participantId : '参加者IDなし';
    if(profile.name) who += ' / ' + profile.name;
    if(!config.url){
      addOutbox(record);
      status('スプレッドシートURL未設定のため、この端末に一時保存しました（' + who + '）', false);
      return Promise.resolve({ queued: true });
    }
    postRecordByGetForm(config.url, config.secretKey || '', record);
    status('送信リクエストを出しました（' + who + '）。スプレッドシートの records を確認してください', true);
    return Promise.resolve({ requested: true });
  }

  function postRecordByGet(url, secretKey, record){
    var payload = Object.assign({}, record, { secretKey: secretKey || record.secretKey || '' });
    var separator = url.indexOf('?') === -1 ? '?' : '&';
    var requestUrl = url + separator +
      'secretKey=' + encodeURIComponent(secretKey || '') +
      '&data=' + encodeURIComponent(JSON.stringify(payload)) +
      '&t=' + encodeURIComponent(String(Date.now()));
    var img = new Image();
    img.style.display = 'none';
    img.alt = '';
    img.src = requestUrl;
    document.body.appendChild(img);
    window.setTimeout(function(){
      if(img.parentNode) img.parentNode.removeChild(img);
    }, 5000);
  }

  function buildGetUrl(url, secretKey, record){
    var payload = Object.assign({}, record, { secretKey: secretKey || record.secretKey || '' });
    var separator = url.indexOf('?') === -1 ? '?' : '&';
    return url + separator +
      'secretKey=' + encodeURIComponent(secretKey || '') +
      '&data=' + encodeURIComponent(JSON.stringify(payload)) +
      '&t=' + encodeURIComponent(String(Date.now()));
  }

  function postRecordByGetForm(url, secretKey, record){
    var iframeName = 'tsukiyomiDiarySyncGetFrame';
    var iframe = document.querySelector('iframe[name="' + iframeName + '"]');
    if(!iframe){
      iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    var form = document.createElement('form');
    form.method = 'GET';
    form.action = url;
    form.target = iframeName;
    form.style.display = 'none';
    var payload = Object.assign({}, record, { secretKey: secretKey || record.secretKey || '' });
    [
      ['secretKey', secretKey || ''],
      ['data', JSON.stringify(payload)],
      ['t', String(Date.now())]
    ].forEach(function(pair){
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = pair[0];
      input.value = pair[1];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    window.setTimeout(function(){
      if(form.parentNode) form.parentNode.removeChild(form);
    }, 1000);
  }

  function postRecordByForm(url, secretKey, record){
    var body = new URLSearchParams();
    body.set('secretKey', secretKey || '');
    body.set('data', JSON.stringify(record));
    var iframeName = 'tsukiyomiDiarySyncFrame';
    var iframe = document.querySelector('iframe[name="' + iframeName + '"]');
    if(!iframe){
      iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = iframeName;
    form.style.display = 'none';
    body.forEach(function(value, key){
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    window.setTimeout(function(){
      if(form.parentNode) form.parentNode.removeChild(form);
    }, 1000);
  }

  function sendRecord(recordType, payload){
    var record = buildRecord(recordType, payload);
    addOutbox(record);
    return postRecord(record);
  }

  function inferRecordType(){
    var page = pageName();
    var dayMatch = page.match(/challenge_day(\d+)/);
    if(dayMatch) return 'challenge_day' + dayMatch[1];
    if(page.indexOf('moon_diary_book') !== -1) return 'intro_reflection';
    if(page.indexOf('my_manual') !== -1) return 'diary_book_view';
    return 'diary_record';
  }

  function getCurrentDayKey(){
    var profile = getProfile();
    var id = profile.email || profile.participantId;
    if(!id) return null;
    var day = (pageName().match(/challenge_day(\d+)/) || [])[1];
    if(!day) return null;
    return STRUCTURED_DIARY_PREFIX + id + ':day:' + day;
  }

  function autoBackupOnLoad(){
    window.setTimeout(function(){
      var key = getCurrentDayKey();
      if(!key) return;
      try{
        var raw = localStorage.getItem(key);
        if(!raw) return;
        var diary = JSON.parse(raw);
        if(!diary || !diary.day) return;
        var hasContent = (diary.lines || []).some(function(l){ return (l.text || '').trim().length > 0; });
        if(!hasContent) return;
        var record = buildRecord('auto_backup', { fields: {'7日間日記専用記録': raw}, source: 'page_load_backup' });
        var config = getConfig();
        postRecordByGetForm(config.url || DEFAULT_WEBHOOK_URL, config.secretKey || DEFAULT_SECRET_KEY, record);
      }catch(e){}
    }, 2000);
  }

  function autoRestoreIfNeeded(){
    var key = getCurrentDayKey();
    if(!key) return;
    if(localStorage.getItem(key)) return;

    var profile = getProfile();
    var day = (pageName().match(/challenge_day(\d+)/) || [])[1];
    var attemptKey = 'tsukiyomi:restoreAttempted:' + profile.participantId + ':day:' + day;
    try{
      if(sessionStorage.getItem(attemptKey)) return;
      sessionStorage.setItem(attemptKey, '1');
    }catch(e){ return; }

    var config = getConfig();
    var gasUrl = config.url || DEFAULT_WEBHOOK_URL;
    var secretKey = config.secretKey || DEFAULT_SECRET_KEY;
    var idParam = profile.email
      ? 'email=' + encodeURIComponent(profile.email)
      : 'pid=' + encodeURIComponent(profile.participantId);
    var requestUrl = gasUrl + '?' + idParam + '&secretKey=' + encodeURIComponent(secretKey) + '&t=' + Date.now();

    fetch(requestUrl, { redirect: 'follow' })
      .then(function(r){ return r.json(); })
      .then(function(result){
        if(!result || !result.ok || !result.days) return;
        var dayData = result.days[day];
        if(!dayData) return;
        localStorage.setItem(key, JSON.stringify(dayData));
        var banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#3a2a1a;color:#fff;padding:14px 24px;border-radius:12px;z-index:9999;font-size:14px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.3);line-height:1.6;';
        banner.textContent = '✨ バックアップから日記を復元しました。画面を更新します…';
        document.body.appendChild(banner);
        setTimeout(function(){ window.location.reload(); }, 2000);
      })
      .catch(function(){});
  }

  function showNamePromptIfNeeded(){
    var cached = loadCachedProfile();
    if(cached.participantId) return;
    var params = getParams();
    if(params.get('participantId') || params.get('pid') || params.get('email')) return;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:32px 24px;max-width:320px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);';

    box.innerHTML = '<p style="font-size:15px;line-height:1.7;color:#3a2a1a;margin:0 0 18px;">月読みワンダーランドへようこそ。<br>登録したときのお名前と<br>メールアドレスを教えてください。</p>'
      + '<input id="tsukiyomi-name-input" type="text" placeholder="お名前（例：山田 花子）" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #c8b89a;border-radius:8px;font-size:15px;margin-bottom:10px;outline:none;">'
      + '<input id="tsukiyomi-pid-input" type="email" placeholder="メールアドレス（登録時のもの）" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #c8b89a;border-radius:8px;font-size:15px;margin-bottom:10px;outline:none;">'
      + '<p style="font-size:12px;color:#888;margin:0 0 16px;line-height:1.6;">月読みワンダーランドに登録したメールアドレスを入力してください。</p>'
      + '<button id="tsukiyomi-name-btn" style="background:#3a2a1a;color:#fff;border:none;border-radius:8px;padding:12px 0;width:100%;font-size:15px;cursor:pointer;">続ける</button>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var nameInput = document.getElementById('tsukiyomi-name-input');
    var pidInput = document.getElementById('tsukiyomi-pid-input');
    var btn = document.getElementById('tsukiyomi-name-btn');

    nameInput.focus();

    function submit(){
      var name = (nameInput.value || '').trim();
      var email = (pidInput.value || '').trim();
      if(!name){ nameInput.style.border = '1.5px solid #c0392b'; return; }
      if(!email){ pidInput.style.border = '1.5px solid #c0392b'; return; }
      var existing = loadCachedProfile();
      saveCachedProfile(Object.assign({}, existing, { name: name, email: email }));
      document.body.removeChild(overlay);
    }

    btn.addEventListener('click', submit);
    pidInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') submit(); });
  }

  function attachAutoSync(){
    document.addEventListener('click', function(event){
      var target = event.target.closest('button, a');
      if(!target) return;
      var text = (target.textContent || '').trim();
      var shouldSync = target.hasAttribute('data-save-intro-reflection') ||
        target.hasAttribute('data-save-moon-diary-book') ||
        target.hasAttribute('data-sync-current-page') ||
        /保存/.test(text);
      if(!shouldSync) return;
      window.setTimeout(function(){
        sendRecord(inferRecordType(), {
          actionText: text,
          fields: collectFields(document),
          source: 'auto_save_click'
        });
      }, 250);
    });
  }

  window.TsukiyomiDiarySync = {
    getConfig: getConfig,
    setConfig: setConfig,
    sendRecord: sendRecord,
    buildRecord: buildRecord,
    buildGetUrl: function(recordType, payload){
      var config = getConfig();
      return buildGetUrl(config.url, config.secretKey || '', buildRecord(recordType, payload));
    },
    collectFields: collectFields,
    readOutbox: readOutbox,
    writeOutbox: writeOutbox
  };

  attachAutoSync();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      showNamePromptIfNeeded();
      autoRestoreIfNeeded();
      autoBackupOnLoad();
    });
  } else {
    showNamePromptIfNeeded();
    autoRestoreIfNeeded();
    autoBackupOnLoad();
  }
})();
