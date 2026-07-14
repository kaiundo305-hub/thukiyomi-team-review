// participants_loader.js
// participants_data.js に既にデータがある場合はそれを使用し、
// ない場合のみ個別JSONファイルからの取得を試みる

if (typeof PARTICIPANTS_DATA === 'undefined') {
  var PARTICIPANTS_DATA = {};
}

(function () {
  var CACHE_PREFIX = "tsukiyomi:participantProfile:v1:";

  var params = new URLSearchParams(window.location.search);
  var pid = params.get("participantId") || params.get("pid") || "";
  if (!pid) return;

  // participants_data.js で既に読み込み済みならスキップ
  if (PARTICIPANTS_DATA[pid]) return;

  // --- localStorageキャッシュ確認 ---
  var CACHE_KEY = CACHE_PREFIX + pid;
  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.pid) {
      PARTICIPANTS_DATA[pid] = cached;
      return;
    }
  } catch (e) {}

  // --- 個別JSONファイルから取得（サイレントフォールバック） ---
  var url = "participants/" + encodeURIComponent(pid) + ".json";

  document.addEventListener("DOMContentLoaded", function () {
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then(function (data) {
        if (data && data.pid) {
          PARTICIPANTS_DATA[data.pid] = data;
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          location.reload();
        }
      })
      .catch(function () {
        // JSONファイルが存在しない場合はサイレントに無視
      });
  });
})();
