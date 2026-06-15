(function(){
  var CONFIG_URL_KEY = 'tsukiyomi:sheetSync:url';
  var CONFIG_SECRET_KEY = 'tsukiyomi:sheetSync:secretKey';
  var OUTBOX_KEY = 'tsukiyomi:diarySync:outbox';
  var DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxIffIfAOptA-WR6jjT9dg8Fc0yb9HpwsLTR-ZG43Nw12_KR_Yi0Xj9IT_FAyXGV_Ic/exec';
  var DEFAULT_SECRET_KEY = 'tsukiyomi-2026-key';

  function getParams(){
    return new URLSearchParams(window.location.search || '');
  }

  function getProfile(){
    var params = getParams();
    return {
      name: params.get('name') || '',
      email: params.get('email') || '',
      birth: params.get('birth') || '',
      zodiac: params.get('zodiac') || '',
      shuku: params.get('shuku') || '',
      participantId: params.get('participantId') || '',
      concern: params.get('concern') || '',
      q: params.get('q') || '',
      q2: params.get('q2') || ''
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
    return (window.location.pathname.split('/').pop() || 'unknown').replace(/%20/g, ' ');
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
    if(!config.url){
      addOutbox(record);
      status('スプレッドシートURL未設定のため、この端末に一時保存しました', false);
      return Promise.resolve({ queued: true });
    }
    postRecordByGetForm(config.url, config.secretKey || '', record);
    status('送信リクエストを出しました。スプレッドシートの records を確認してください', true);
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
})();
