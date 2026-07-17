(function(){
  function params(){
    return new URLSearchParams(window.location.search || '');
  }

  function identity(){
    var p = params();
    return p.get('participantId') || p.get('birth') || p.get('name') || 'guest';
  }

  function dayNumber(){
    var shell = document.querySelector('[data-challenge-day]');
    var value = shell && shell.getAttribute('data-challenge-day');
    return value ? String(value) : '';
  }

  function storageKey(day){
    return 'tsukiyomi:structuredDiary:v1:' + identity() + ':day:' + day;
  }

  function jstNow(){
    return new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function readRecord(day){
    try {
      return JSON.parse(localStorage.getItem(storageKey(day)) || '{}');
    } catch(error) {
      return {};
    }
  }

  function writeRecord(day, record){
    localStorage.setItem(storageKey(day), JSON.stringify(record || {}));
  }

  var GAS_URL_KEY = 'tsukiyomi:sheetSync:url';
  var GAS_SECRET_KEY = 'tsukiyomi:sheetSync:secretKey';
  var GAS_DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxIffIfAOptA-WR6jjT9dg8Fc0yb9HpwsLTR-ZG43Nw12_KR_Yi0Xj9IT_FAyXGV_Ic/exec';
  var GAS_DEFAULT_SECRET = 'tsukiyomi-2026-key';

  function gasUrl(){ return (localStorage.getItem(GAS_URL_KEY) || GAS_DEFAULT_URL).trim(); }
  function gasSecret(){ return (localStorage.getItem(GAS_SECRET_KEY) || GAS_DEFAULT_SECRET).trim(); }

  function backupDayToGas(day, record){
    try {
      var hasContent = (record.lines || []).some(function(l){ return (l.text || '').trim().length > 0; });
      if(!hasContent) return;
      var url = gasUrl();
      if(!url) return;
      var secret = gasSecret();
      var prof = record.profile || profile();
      var pid = prof.participantId || identity();
      if(!pid || pid === 'guest') return;
      var envelope = {
        secretKey: secret,
        savedAt: new Date().toISOString(),
        savedAtJst: jstNow(),
        recordType: 'auto_backup',
        page: 'challenge_day' + day + '.html',
        profile: { participantId: pid, name: prof.name || '', birth: prof.birth || '',
                   shuku: prof.shuku || '', zodiac: prof.zodiac || '',
                   concern: prof.concern || '', q: prof.q || '', q2: prof.q2 || '' },
        payload: { fields: { '7日間日記専用記録': JSON.stringify(record) }, source: 'structured_save_backup' }
      };
      var iframeName = 'tsukiyomiGasBackupFrame';
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
      [['secretKey', secret],['data', JSON.stringify(envelope)],['t', String(Date.now())]].forEach(function(p){
        var inp = document.createElement('input');
        inp.type = 'hidden';
        inp.name = p[0];
        inp.value = p[1];
        form.appendChild(inp);
      });
      document.body.appendChild(form);
      form.submit();
      window.setTimeout(function(){ if(form.parentNode) form.parentNode.removeChild(form); }, 1000);
    } catch(e){}
  }

  function backupAllDaysToGas(){
    for(var d = 1; d <= 7; d++){
      (function(day){
        var rec = readRecord(day);
        if(rec && rec.day){
          window.setTimeout(function(){ backupDayToGas(day, rec); }, (day - 1) * 600);
        }
      })(d);
    }
  }

  function loadCachedProfile(){
    try { return JSON.parse(localStorage.getItem('tsukiyomi:diarySync:cachedProfile') || '{}'); }
    catch(e) { return {}; }
  }

  function profile(){
    var p = params();
    var cached = loadCachedProfile();
    return {
      name: p.get('name') || cached.name || '',
      birth: p.get('birth') || cached.birth || '',
      participantId: p.get('participantId') || cached.participantId || '',
      shuku: p.get('shuku') || cached.shuku || '',
      zodiac: p.get('zodiac') || cached.zodiac || '',
      concern: p.get('concern') || cached.concern || '',
      q: p.get('q') || cached.q || '',
      q2: p.get('q2') || cached.q2 || ''
    };
  }

  function collectLines(){
    var lines = [];
    document.querySelectorAll('[data-diary-day-line]').forEach(function(node){
      lines.push({
        number: node.getAttribute('data-diary-day-line') || String(lines.length + 1),
        text: node.value || '',
        placeholder: node.getAttribute('placeholder') || ''
      });
    });
    return lines;
  }

  function collectTextareas(){
    var extras = [];
    document.querySelectorAll('textarea').forEach(function(node){
      if(node.hasAttribute('data-diary-day-line')) return;
      if(node.hidden || node.getAttribute('aria-hidden') === 'true') return;
      if(node.hasAttribute('data-diary-day')) return;
      if(node.hasAttribute('data-diary-structured-record')) return;
      if(node.hasAttribute('data-oracle-card-record')) return;
      var value = node.value || '';
      if(!value.trim()) return;
      extras.push({
        key: node.getAttribute('data-sync-key') || node.id || node.name || '記録',
        text: value
      });
    });
    return extras;
  }

  function previewPhotoDataUrl(){
    var img = document.querySelector('[data-diary-item-preview] img');
    if(img && img.src && img.src.indexOf('data:image/') === 0) return img.src;
    return '';
  }

  function baseRecord(day){
    var existing = readRecord(day);
    var record = Object.assign({}, existing, {
      day: day,
      title: (document.querySelector('.challenge-title') || {}).textContent || 'Day' + day,
      theme: (document.querySelector('.challenge-theme') || {}).textContent || '',
      profile: profile(),
      lines: collectLines(),
      extras: collectTextareas(),
      savedAtJst: jstNow()
    });
    var previewPhoto = previewPhotoDataUrl();
    if(previewPhoto) record.photoDataUrl = previewPhoto;
    return record;
  }

  function syncHiddenForSpreadsheet(day, record){
    var hidden = document.querySelector('[data-diary-structured-record]');
    if(!hidden) return;
    hidden.value = JSON.stringify({
      day: record.day,
      title: record.title,
      theme: record.theme,
      lines: record.lines,
      extras: record.extras,
      photoName: record.photoName || '',
      hasPhoto: !!record.photoDataUrl,
      savedAtJst: record.savedAtJst
    });
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function saveNow(){
    var day = dayNumber();
    if(!day) return;
    var record = baseRecord(day);
    writeRecord(day, record);
    syncHiddenForSpreadsheet(day, record);
    window.setTimeout(function(){ backupAllDaysToGas(); }, 1500);
  }

  function loadIntoPage(){
    var day = dayNumber();
    if(!day) return;
    var record = readRecord(day);
    if(!record || !record.day) return;
    if(Array.isArray(record.lines)) {
      record.lines.forEach(function(line){
        var node = document.querySelector('[data-diary-day-line="' + line.number + '"]');
        if(node && !node.value) node.value = line.text || '';
      });
    }
    if(record.photoDataUrl) {
      var preview = document.querySelector('[data-diary-item-preview]');
      if(preview) {
        preview.innerHTML = '';
        var img = document.createElement('img');
        img.src = record.photoDataUrl;
        img.alt = record.photoName || '月読み日記の写メ';
        preview.appendChild(img);
      }
    }
    syncHiddenForSpreadsheet(day, record);
  }

  function resizeImage(file, callback){
    var reader = new FileReader();
    reader.onload = function(event){
      var img = new Image();
      img.onload = function(){
        var max = 900;
        var width = img.width;
        var height = img.height;
        if(width > height && width > max) {
          height = Math.round(height * max / width);
          width = max;
        } else if(height > max) {
          width = Math.round(width * max / height);
          height = max;
        }
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function bindPhoto(){
    var input = document.querySelector('[data-diary-item-photo]');
    if(!input) return;
    input.addEventListener('change', function(){
      var file = input.files && input.files[0];
      if(!file) return;
      var day = dayNumber();
      resizeImage(file, function(dataUrl){
        var record = baseRecord(day);
        record.photoDataUrl = dataUrl;
        record.photoName = file.name || '';
        writeRecord(day, record);
        syncHiddenForSpreadsheet(day, record);
      });
    });
  }

  function bindSave(){
    document.querySelectorAll('[data-save-diary]').forEach(function(button){
      button.addEventListener('click', function(){
        window.setTimeout(saveNow, 0);
      });
    });
    document.querySelectorAll('[data-diary-day-line], textarea:not([hidden]):not([aria-hidden="true"])').forEach(function(node){
      node.addEventListener('input', function(){
        window.clearTimeout(node.__structuredSaveTimer);
        node.__structuredSaveTimer = window.setTimeout(saveNow, 350);
      });
    });
  }

  function hideTechnicalFields(){
    if(!document.getElementById('diary-technical-hide-style')) {
      var style = document.createElement('style');
      style.id = 'diary-technical-hide-style';
      style.textContent = [
        '[hidden],',
        '[aria-hidden="true"][data-diary-day],',
        '[data-diary-structured-record],',
        '[data-oracle-card-record],',
        '.daily-oracle-record{',
        'display:none!important;',
        'visibility:hidden!important;',
        'width:0!important;',
        'height:0!important;',
        'min-height:0!important;',
        'padding:0!important;',
        'margin:0!important;',
        'border:0!important;',
        'overflow:hidden!important;',
        '}'
      ].join('');
      document.head.appendChild(style);
    }
    document.querySelectorAll('[hidden], [aria-hidden="true"][data-diary-day], [data-diary-structured-record], [data-oracle-card-record], .daily-oracle-record').forEach(function(node){
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('height', '0', 'important');
      node.style.setProperty('min-height', '0', 'important');
      node.style.setProperty('padding', '0', 'important');
      node.style.setProperty('margin', '0', 'important');
      node.style.setProperty('border', '0', 'important');
    });
  }

  function addHiddenField(){
    var panel = document.querySelector('.diary-panel') || document.querySelector('.challenge-body');
    if(!panel || document.querySelector('[data-diary-structured-record]')) return;
    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.setAttribute('aria-hidden', 'true');
    hidden.setAttribute('data-diary-structured-record', '');
    hidden.setAttribute('data-sync-key', '7日間日記専用記録');
    panel.appendChild(hidden);
  }

  document.addEventListener('DOMContentLoaded', function(){
    hideTechnicalFields();
    addHiddenField();
    hideTechnicalFields();
    loadIntoPage();
    bindPhoto();
    bindSave();
    saveNow();
    // ページロード時に既存データを全日分バックアップ（3秒後・初回のみ）
    var backupDoneKey = 'tsukiyomi:gasBackupDone:' + identity();
    if(!sessionStorage.getItem(backupDoneKey)){
      sessionStorage.setItem(backupDoneKey, '1');
      window.setTimeout(function(){ backupAllDaysToGas(); }, 3000);
    }
  });
})();
