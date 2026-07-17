// 月読みワンダーランド Moon Points & Items System v1

var MOON_POINT_VALUES = {
  daily_entry:          10,  // 日記1日書く
  phase_complete_bonus: 50,  // フェーズ7日コンプリートボーナス
  reflect_complete:     30,  // フェーズ振り返り4問完了
  cycle_complete_bonus: 200  // サイクル（4フェーズ）完走ボーナス
};

// ─ 月石（フェーズ完走で1個ずつ解放）─
var MOON_GEMS = {
  shingetu: {
    id: 'gem-shingetu', name: '漆黒の月晶',
    emoji: '🖤', color: '#2a2035',
    desc: '新月のエネルギーが宿る漆黒の石。願いの種を永遠に守る。'
  },
  jougen: {
    id: 'gem-jougen', name: '蒼の半月晶',
    emoji: '💙', color: '#1a3a5c',
    desc: '上弦の意志と行動力が宿る水色の石。前へ進む勇気を与える。'
  },
  mangetsu: {
    id: 'gem-mangetsu', name: '金の満月晶',
    emoji: '💛', color: '#4a3a00',
    desc: '満月の感謝と癒しが宿る黄金の石。豊かさを引き寄せる。'
  },
  kagen: {
    id: 'gem-kagen', name: '銀の下弦晶',
    emoji: '🩶', color: '#2a2a2a',
    desc: '下弦の実りと手放しが宿る銀色の石。次のサイクルへの橋渡し。'
  }
};

// ─ 称号（サイクル完走・ポイント到達で解放）─
var MOON_TITLES = [
  { id: 'title-cycle-1', name: '月の旅人',      emoji: '🌙', type: 'cycle',
    desc: '1つの月サイクルを完走した証。月のリズムを体に刻んだ。',
    condition: 'cycle:1' },
  { id: 'title-cycle-2', name: '星詠みの旅人',  emoji: '⭐', type: 'cycle',
    desc: '2つの月サイクルを旅した証。星と月があなたの味方になっている。',
    condition: 'cycle:2' },
  { id: 'title-cycle-3', name: '天命の月詠み',  emoji: '✨', type: 'cycle',
    desc: '3ヶ月モニターを完走した証。あなたの天命が月に刻まれた。',
    condition: 'cycle:3' },
  { id: 'title-100',  name: '月の芽生え',   emoji: '🌱', type: 'points',
    desc: '100 Moon Points獲得。あなたの月の旅が動き出した。',
    condition: 'points:100' },
  { id: 'title-300',  name: '月の花',       emoji: '🌸', type: 'points',
    desc: '300 Moon Points。願いが花開いている。',
    condition: 'points:300' },
  { id: 'title-700',  name: '月の実り',     emoji: '🌾', type: 'points',
    desc: '700 Moon Points。豊かな実りの時が来た。',
    condition: 'points:700' },
  { id: 'title-1500', name: '月読みの達人', emoji: '🏆', type: 'points',
    desc: '1500 Moon Points。月のリズムを完全に体得した。',
    condition: 'points:1500' }
];

// ─ ストレージキー ─
function _pointsKey(userId)  { return 'tsukiyomi:moonPoints:v1:' + userId; }
function _itemsKey(userId)   { return 'tsukiyomi:moonItems:v1:' + userId; }
function _streakKey(userId)  { return 'tsukiyomi:moonStreak:v1:' + userId; }

// ─ ポイント取得 ─
function getMoonPoints(userId) {
  if (!userId) return 0;
  try {
    var d = JSON.parse(localStorage.getItem(_pointsKey(userId)) || '{"total":0}');
    return d.total || 0;
  } catch(e) { return 0; }
}

// ─ ポイント加算（返り値: 加算後の合計 + 新たに解放されたアイテム） ─
function addMoonPoints(userId, amount, reason) {
  if (!userId || !amount) return { total: 0, newItems: [] };
  try {
    var data = JSON.parse(localStorage.getItem(_pointsKey(userId)) || '{"total":0,"log":[]}');
    var before = data.total || 0;
    data.total = before + amount;
    if (!data.log) data.log = [];
    data.log.push({ amount: amount, reason: reason, at: new Date().toISOString() });
    if (data.log.length > 100) data.log = data.log.slice(-100);
    localStorage.setItem(_pointsKey(userId), JSON.stringify(data));

    // ポイントマイルストーン称号チェック
    var newItems = checkPointTitles(userId, before, data.total);
    return { total: data.total, newItems: newItems };
  } catch(e) { return { total: 0, newItems: [] }; }
}

// ─ アイテム取得 ─
function getMoonItems(userId) {
  if (!userId) return [];
  try {
    var d = JSON.parse(localStorage.getItem(_itemsKey(userId)) || '{"items":[]}');
    return d.items || [];
  } catch(e) { return []; }
}

// ─ アイテム付与 ─
function unlockMoonItem(userId, item) {
  if (!userId) return false;
  try {
    var data = JSON.parse(localStorage.getItem(_itemsKey(userId)) || '{"items":[]}');
    if (!data.items) data.items = [];
    var already = data.items.some(function(i){ return i.id === item.id; });
    if (already) return false;
    data.items.push(Object.assign({}, item, { unlockedAt: new Date().toISOString() }));
    localStorage.setItem(_itemsKey(userId), JSON.stringify(data));
    return true;
  } catch(e) { return false; }
}

// ─ フェーズ完走処理（7日書いたとき呼ぶ）─
// 返り値: { points: 付与pt, items: 新アイテム[], messages: string[] }
function onPhaseComplete(userId, cycleId, phase) {
  var results = { points: 0, items: [], messages: [] };
  if (!userId) return results;

  var alreadyKey = 'tsukiyomi:moonPhaseComplete:' + userId + ':' + cycleId + ':' + phase;
  try { if (localStorage.getItem(alreadyKey)) return results; } catch(e){}

  // ポイント付与
  var r = addMoonPoints(userId, MOON_POINT_VALUES.phase_complete_bonus,
    'フェーズ完走: ' + cycleId + ' ' + phase);
  results.points = MOON_POINT_VALUES.phase_complete_bonus;
  results.points += r.newItems.reduce(function(s){ return s; }, 0);
  results.items = results.items.concat(r.newItems);

  // 月石アンロック
  var gem = MOON_GEMS[phase];
  if (gem) {
    var gemWithCycle = Object.assign({}, gem, {
      id: gem.id + ':' + cycleId,
      cycleId: cycleId,
      cycleLabel: cycleId.replace('-','年') + '月'
    });
    var unlocked = unlockMoonItem(userId, gemWithCycle);
    if (unlocked) {
      results.items.push(gemWithCycle);
      results.messages.push(gem.emoji + ' 月石「' + gem.name + '」を手に入れた！');
    }
  }

  // サイクル完走チェック
  var cycleItems = checkCycleComplete(userId, cycleId);
  results.items = results.items.concat(cycleItems);

  try { localStorage.setItem(alreadyKey, '1'); } catch(e){}
  return results;
}

// ─ フェーズ振り返り完了処理 ─
function onReflectComplete(userId, cycleId, phase) {
  var results = { points: 0, items: [], messages: [] };
  if (!userId) return results;
  var alreadyKey = 'tsukiyomi:moonReflect:' + userId + ':' + cycleId + ':' + phase;
  try { if (localStorage.getItem(alreadyKey)) return results; } catch(e){}
  var r = addMoonPoints(userId, MOON_POINT_VALUES.reflect_complete,
    '振り返り完了: ' + cycleId + ' ' + phase);
  results.points = MOON_POINT_VALUES.reflect_complete;
  results.items = r.newItems;
  try { localStorage.setItem(alreadyKey, '1'); } catch(e){}
  return results;
}

// ─ サイクル完走チェック ─
function checkCycleComplete(userId, cycleId) {
  var newItems = [];
  var allDone = ['shingetu','jougen','mangetsu','kagen'].every(function(p){
    var k = 'tsukiyomi:moonPhaseComplete:' + userId + ':' + cycleId + ':' + p;
    try { return !!localStorage.getItem(k); } catch(e){ return false; }
  });
  if (!allDone) return newItems;

  var cycleCompleteKey = 'tsukiyomi:moonCycleComplete:' + userId + ':' + cycleId;
  try { if (localStorage.getItem(cycleCompleteKey)) return newItems; } catch(e){}

  // サイクル完走ボーナスポイント
  addMoonPoints(userId, MOON_POINT_VALUES.cycle_complete_bonus,
    'サイクル完走: ' + cycleId);

  // 完走サイクル数カウント
  var countKey = 'tsukiyomi:moonCycleCount:' + userId;
  var count = 0;
  try { count = parseInt(localStorage.getItem(countKey) || '0', 10); } catch(e){}
  count += 1;
  try { localStorage.setItem(countKey, String(count)); } catch(e){}

  // 称号チェック
  MOON_TITLES.filter(function(t){ return t.type === 'cycle'; }).forEach(function(t){
    var need = parseInt(t.condition.replace('cycle:',''), 10);
    if (count >= need) {
      var unlocked = unlockMoonItem(userId, t);
      if (unlocked) newItems.push(t);
    }
  });

  try { localStorage.setItem(cycleCompleteKey, '1'); } catch(e){}
  return newItems;
}

// ─ ポイントマイルストーン称号チェック ─
function checkPointTitles(userId, before, after) {
  var newItems = [];
  MOON_TITLES.filter(function(t){ return t.type === 'points'; }).forEach(function(t){
    var need = parseInt(t.condition.replace('points:',''), 10);
    if (before < need && after >= need) {
      var unlocked = unlockMoonItem(userId, t);
      if (unlocked) newItems.push(t);
    }
  });
  return newItems;
}

// ─ 連続日数（ストリーク）─
function getDailyStreak(userId) {
  if (!userId) return 0;
  try {
    var d = JSON.parse(localStorage.getItem(_streakKey(userId)) || '{"streak":0,"lastDate":""}');
    return d.streak || 0;
  } catch(e){ return 0; }
}

function recordDailyStreak(userId) {
  if (!userId) return 0;
  try {
    var today = new Date().toISOString().split('T')[0];
    var d = JSON.parse(localStorage.getItem(_streakKey(userId)) || '{"streak":0,"lastDate":""}');
    if (d.lastDate === today) return d.streak;
    var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    d.streak = (d.lastDate === yesterday) ? d.streak + 1 : 1;
    d.lastDate = today;
    localStorage.setItem(_streakKey(userId), JSON.stringify(d));
    return d.streak;
  } catch(e){ return 0; }
}
