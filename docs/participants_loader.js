// participants_loader.js
// 参加者ごとの個別JSONファイルから取得してキャッシュする（GAS不要版）
// participants_data.js が先に読まれている場合はそのデータを優先する

var PARTICIPANTS_DATA = PARTICIPANTS_DATA || {};

(function () {
  var CACHE_PREFIX = "tsukiyomi:participantProfile:v1:";

  var params = new URLSearchParams(window.location.search);
  var pid = params.get("participantId") || params.get("pid") || "";
  if (!pid) return;

  // participants_data.js にデータがあればそれを使う
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

  // --- 個別JSONファイルから取得 ---
  var url = "participants/" + encodeURIComponent(pid) + ".json";

  document.addEventListener("DOMContentLoaded", function () {
    var statusEl = document.querySelector("[data-deep-current]");
    if (statusEl) statusEl.textContent = "情報を読み込んでいます…";

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
        } else if (statusEl) {
          statusEl.textContent = "参加者情報が見つかりませんでした。URLをご確認ください。";
        }
      })
      .catch(function () {
        if (statusEl) statusEl.textContent = "データ取得に失敗しました。URLをご確認ください。";
      });
  });
})();
