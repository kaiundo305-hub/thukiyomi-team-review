(function(){
  function params(){
    return new URLSearchParams(window.location.search || '');
  }

  function identity(){
    var p = params();
    return p.get('participantId') || p.get('birth') || p.get('name') || 'guest';
  }

  function storageKey(){
    return 'tsukiyomi:dailyItemOracle:v1:day2:' + identity();
  }

  function todayJst(){
    return new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function pickCard(){
    var cards = window.TsukiyomiDailyItemOracleCards || [];
    if(!cards.length) return null;
    return cards[Math.floor(Math.random() * cards.length)];
  }

  function saveCard(card){
    if(!card) return;
    var record = {
      card: card,
      drawnAtJst: todayJst()
    };
    localStorage.setItem(storageKey(), JSON.stringify(record));
  }

  function loadCard(){
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey()) || '{}');
      return saved.card ? saved : null;
    } catch(error) {
      return null;
    }
  }

  function setText(root, selector, value){
    var node = root.querySelector(selector);
    if(node) node.textContent = value || '';
  }

  function cardImageCandidates(card){
    if(!card || !card.id) return [];
    var base = 'images/oracle/' + card.id;
    var shukuName = String(card.shuku || '').replace('宿', '');
    if(shukuName === '虚') shukuName = '虚空';
    var shukuBase = shukuName ? 'images/oracle/' + shukuName : '';
    var candidates = [
      card.image,
      shukuBase ? shukuBase + '.png' : '',
      shukuBase ? shukuBase + '.jpg' : '',
      shukuBase ? shukuBase + '.jpeg' : '',
      shukuBase ? shukuBase + '.webp' : '',
      base + '.png',
      base + '.jpg',
      base + '.jpeg',
      base + '.webp'
    ];
    return candidates.filter(function(src, index){
      return src && candidates.indexOf(src) === index;
    });
  }

  function setCardImage(image, card){
    if(!image || !card) return;
    var sources = cardImageCandidates(card);
    var index = 0;

    image.alt = card.cardName || '日用品オラクルカード';
    image.parentElement.classList.remove('no-card-image');

    image.onerror = function(){
      index += 1;
      if(index < sources.length) {
        image.src = sources[index];
        return;
      }
      image.removeAttribute('src');
      image.alt = '';
      image.parentElement.classList.add('no-card-image');
    };

    if(sources.length) {
      image.src = sources[index];
    } else {
      image.removeAttribute('src');
      image.alt = '';
      image.parentElement.classList.add('no-card-image');
    }
  }

  function updateHidden(root, card){
    var hidden = root.querySelector('[data-oracle-card-record]');
    if(!hidden || !card) return;
    hidden.value = [
      '日用品オラクルカード：' + card.cardName,
      '宿：' + card.shuku,
      'アイテム：' + card.item,
      'キーワード：' + card.keyword,
      'メッセージ：' + card.message,
      '整えアクション：' + card.action,
      '日記の問い：' + card.question,
      '感謝の言葉：' + card.gratitude
    ].join('\n');
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function showCard(root, record){
    if(!record || !record.card) return;
    var card = record.card;
    root.classList.add('has-oracle-card');
    setText(root, '[data-card-name]', card.cardName);
    setText(root, '[data-card-item]', card.item);
    setText(root, '[data-card-keyword]', card.keyword);
    setText(root, '[data-card-shuku]', card.shuku + ' / ' + card.type);
    setText(root, '[data-card-message]', card.message);
    setText(root, '[data-card-action]', card.action);
    setText(root, '[data-card-question]', card.question);
    setText(root, '[data-card-gratitude]', card.gratitude);
    setText(root, '[data-card-drawn-at]', record.drawnAtJst ? '受け取った日時：' + record.drawnAtJst : '');
    updateHidden(root, card);

    var image = root.querySelector('[data-card-image]');
    setCardImage(image, card);
  }

  function applyToDiary(root, card){
    var status = root.querySelector('[data-card-status]');
    if(!card) return;
    var line = document.querySelector('[data-diary-day-line="4"]');
    var text = '今日受け取った日用品オラクルは「' + card.cardName + '」。' + card.question;
    if(line && !line.value.trim()) {
      line.value = text;
      line.dispatchEvent(new Event('input', { bubbles: true }));
      if(status) status.textContent = 'Day2の日記に反映しました';
    } else if(status) {
      status.textContent = 'カードの内容を下の記録として保存しました';
    }
    updateHidden(root, card);
  }

  document.addEventListener('DOMContentLoaded', function(){
    var root = document.querySelector('[data-daily-item-oracle]');
    if(!root) return;
    var drawButton = root.querySelector('[data-draw-oracle-card]');
    var applyButton = root.querySelector('[data-apply-oracle-card]');
    var currentRecord = loadCard();
    if(currentRecord) showCard(root, currentRecord);

    if(drawButton) {
      drawButton.addEventListener('click', function(){
        var card = pickCard();
        if(!card) return;
        currentRecord = { card: card, drawnAtJst: todayJst() };
        saveCard(card);
        showCard(root, currentRecord);
        var status = root.querySelector('[data-card-status]');
        if(status) status.textContent = 'カードを受け取りました';
      });
    }

    if(applyButton) {
      applyButton.addEventListener('click', function(){
        if(!currentRecord || !currentRecord.card) {
          currentRecord = loadCard();
        }
        applyToDiary(root, currentRecord && currentRecord.card);
      });
    }
  });
})();
