// gemini_deep_analysis.js
// 月読みワンダーランド — 日記テキストを Gemini API に送り個別フィードバックを生成
(function () {
  'use strict';

  var MODEL        = 'gemini-1.5-flash';   // 無料枠対応モデル
  var API_KEY_STORE = 'tsukiyomi:geminiApiKey';

  // ── ユーティリティ ──────────────────────────────────────────────────

  function getApiKey() {
    // HTML側で window.GEMINI_API_KEY を定義しておけば全員共通キーとして使える
    return (window.GEMINI_API_KEY || '').trim() ||
           (localStorage.getItem(API_KEY_STORE) || '').trim();
  }

  function getPid() {
    var p = new URLSearchParams(window.location.search || '');
    return p.get('participantId') || p.get('pid') || 'guest';
  }

  function getProfile() {
    var pid = getPid();
    var d = (window.PARTICIPANTS_DATA && window.PARTICIPANTS_DATA[pid]) || {};
    if (!d.name) {
      try {
        d = JSON.parse(
          localStorage.getItem('tsukiyomi:participantProfile:v1:' + pid) || '{}'
        );
      } catch (e) {}
    }
    return d;
  }

  function getDiaryDays(pid) {
    var prefix = 'tsukiyomi:structuredDiary:v1:' + pid + ':day:';
    var days = [];
    for (var d = 1; d <= 7; d++) {
      try {
        var raw = localStorage.getItem(prefix + d);
        if (!raw) continue;
        var rec = JSON.parse(raw);
        if (!rec || !rec.lines) continue;
        var lines = rec.lines.filter(function (l) {
          return (l.text || '').trim().length > 0;
        });
        if (!lines.length) continue;
        var block = 'Day' + d + ':\n' + lines.map(function (l) {
          return (l.label ? '【' + l.label + '】' : '') + l.text;
        }).join('\n');
        days.push(block);
      } catch (e) {}
    }
    return days;
  }

  // ── プロンプト生成 ─────────────────────────────────────────────────

  function buildPrompt(profile, days) {
    var name    = profile.name    || 'あなた';
    var shuku   = profile.shuku   || '';
    var wish    = profile.q       || '';
    var concern = profile.concern || '';

    var diaryBlock = days.length > 0
      ? days.join('\n\n')
      : '（日記の記録はありません）';

    return '月読みワンダーランドの月の鑑定士として、参加者の7日間の日記を読み、温かく誠実なフィードバックを書いてください。\n\n' +
      '【参加者プロフィール】\n' +
      '名前: ' + name + 'さん\n' +
      '27宿: ' + shuku + '\n' +
      '悩みのカテゴリ: ' + concern + '\n' +
      '新月の願い: ' + wish + '\n\n' +
      '【7日間の日記】\n' +
      diaryBlock + '\n\n' +
      '【書き方のルール】\n' +
      '- ' + name + 'さんへの手紙のように、「' + name + 'さん」と名前で呼びかける\n' +
      '- 日記の中の実際の言葉を引用しながら読み解く（「〜と書きましたね」など）\n' +
      '- ' + (shuku ? shuku + 'の特性' : '宿の特性') + 'と日記の言葉のつながりを伝える\n' +
      '- 繰り返し登場したキーワードや感情のパターンを発見して伝える\n' +
      '- 「今のあなた」「気づきのポイント」「次の7日間へのメッセージ」の3段構成\n' +
      '- 合計400〜500文字\n' +
      '- 占術の専門用語を使わず、温かく具体的に書く\n' +
      '- 最後は希望と感謝で締める';
  }

  // ── Gemini API 呼び出し ──────────────────────────────────────────────

  async function callGemini(prompt, apiKey) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              MODEL + ':generateContent?key=' + apiKey;
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 1200 }
      })
    });
    if (!res.ok) {
      var err = {};
      try { err = await res.json(); } catch (e) {}
      throw new Error((err.error && err.error.message) || 'APIエラー ' + res.status);
    }
    var data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  // ── テキスト → HTML 変換 ─────────────────────────────────────────────

  function toHtml(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g,
        '<strong style="color:#f1d99b;font-weight:700;">$1</strong>')
      .replace(/【(.*?)】/g,
        '<span style="color:#f1d99b;font-weight:600;">【$1】</span>')
      .replace(/\n/g, '<br>');
  }

  // ── UI レンダリング ──────────────────────────────────────────────────

  function renderUI(container) {
    var apiKey = getApiKey();
    var pid    = getPid();

    // APIキー未設定 → 入力フォーム
    if (!apiKey) {
      container.innerHTML =
        '<div style="background:rgba(0,0,0,0.25);border-radius:12px;padding:24px;line-height:2;">' +
          '<p style="color:#e8e0ff;font-size:13px;margin:0 0 8px;font-weight:bold;">Gemini APIキーを設定してください</p>' +
          '<p style="color:rgba(200,180,255,0.7);font-size:12px;margin:0 0 16px;">' +
            '<a href="https://aistudio.google.com/apikey" target="_blank" style="color:#f1d99b;">Google AI Studio</a>' +
            ' で無料のAPIキーを取得し、入力してください。（ブラウザに保存されます）' +
          '</p>' +
          '<input id="gemini-key-input" type="password" placeholder="AIzaSy..." ' +
            'style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.3);' +
            'border:1px solid rgba(200,180,255,0.25);border-radius:8px;color:#e8e0ff;' +
            'font-size:13px;padding:10px 12px;font-family:inherit;margin-bottom:12px;">' +
          '<button onclick="TsukiyomiGemini.saveKey()" ' +
            'style="background:rgba(168,121,50,0.35);border:1px solid rgba(168,121,50,0.6);' +
            'color:#f1d99b;border-radius:8px;padding:10px 22px;font-size:13px;' +
            'cursor:pointer;font-family:inherit;letter-spacing:0.05em;">保存</button>' +
        '</div>';
      return;
    }

    var days     = getDiaryDays(pid);
    var hasDiary = days.length > 0;
    var name     = getProfile().name || 'あなた';

    container.innerHTML =
      '<div style="text-align:center;padding:4px 0 20px;">' +
        '<p style="font-size:13px;color:rgba(200,180,255,0.75);margin:0 0 18px;line-height:1.9;">' +
          (hasDiary
            ? '7日間の日記の言葉をもとに、AIが' + name + 'さんだけのフィードバックを生成します。'
            : '日記の記録をもとに、AIが温かいフィードバックを生成します。') +
        '</p>' +
        '<button id="deep-ai-gen-btn" onclick="TsukiyomiGemini.generate()" ' +
          'style="background:linear-gradient(135deg,rgba(168,121,50,0.45),rgba(100,60,10,0.45));' +
          'border:1px solid rgba(168,121,50,0.75);color:#f1d99b;border-radius:999px;' +
          'padding:14px 36px;font-size:14px;font-weight:bold;cursor:pointer;' +
          'font-family:inherit;letter-spacing:0.1em;">' +
          '✦ 日記の言葉からフィードバックを受け取る' +
        '</button>' +
      '</div>' +
      '<div id="gemini-result"></div>' +
      '<p style="text-align:right;margin-top:6px;">' +
        '<button onclick="TsukiyomiGemini.resetKey()" ' +
          'style="background:none;border:none;color:rgba(200,180,255,0.3);' +
          'font-size:10px;cursor:pointer;font-family:inherit;">APIキーを変更</button>' +
      '</p>';
  }

  // ── グローバル公開 ───────────────────────────────────────────────────

  window.TsukiyomiGemini = {

    saveKey: function () {
      var el = document.getElementById('gemini-key-input');
      if (!el || !el.value.trim()) return;
      localStorage.setItem(API_KEY_STORE, el.value.trim());
      var container = document.getElementById('deep-ai-analysis-content');
      if (container) renderUI(container);
    },

    resetKey: function () {
      localStorage.removeItem(API_KEY_STORE);
      var container = document.getElementById('deep-ai-analysis-content');
      if (container) renderUI(container);
    },

    generate: async function () {
      var btn      = document.getElementById('deep-ai-gen-btn');
      var resultEl = document.getElementById('gemini-result');
      if (!btn || !resultEl) return;

      btn.disabled    = true;
      btn.textContent = '✦ 月が読み解いています…';
      btn.style.opacity = '0.6';
      resultEl.innerHTML =
        '<p style="text-align:center;color:rgba(200,180,255,0.5);font-size:13px;padding:20px 0;">' +
        '生成中です。少しお待ちください…</p>';

      try {
        var pid     = getPid();
        var profile = getProfile();
        var days    = getDiaryDays(pid);
        var prompt  = buildPrompt(profile, days);
        var apiKey  = getApiKey();
        var text    = await callGemini(prompt, apiKey);

        resultEl.innerHTML =
          '<div style="background:rgba(0,0,0,0.22);border:1px solid rgba(168,121,50,0.3);' +
          'border-radius:12px;padding:24px 20px;font-size:13px;color:#e8e0ff;line-height:2.1;margin-top:8px;">' +
            toHtml(text) +
          '</div>' +
          '<p style="text-align:right;font-size:11px;color:rgba(200,180,255,0.35);margin-top:6px;">' +
          '✦ Gemini AI による自動生成</p>';

        btn.textContent   = '✦ 再生成する';
        btn.disabled      = false;
        btn.style.opacity = '1';

      } catch (e) {
        resultEl.innerHTML =
          '<p style="color:rgba(255,130,130,0.8);font-size:13px;padding:12px 0;">' +
          'エラー: ' + e.message + '</p>';
        btn.textContent   = '✦ もう一度試す';
        btn.disabled      = false;
        btn.style.opacity = '1';
      }
    }
  };

  // DOM ready でUIを初期化
  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('deep-ai-analysis-content');
    if (container) renderUI(container);
  });

})();
