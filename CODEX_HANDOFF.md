# ツキヨミ第2の鑑定書 — Codex 引き継ぎドキュメント

## プロジェクト概要

**サービス名**: 月読みワンダーランド 7日間チャレンジ「第2の鑑定書」  
**公開URL**: https://kaiundo305-hub.github.io/thukiyomi-team-review/  
**メインページ**: `docs/moon_seed_deep_report.html`  
**ホスティング**: GitHub Pages（`docs/` フォルダから自動デプロイ）  
**ブランチ**: `main`

---

## フォルダ構成

```
/
├── docs/                          ← GitHub Pages の公開ルート（ここを編集）
│   ├── moon_seed_deep_report.html ← メイン：第2の鑑定書ページ ★最重要
│   ├── style.css                  ← 全ページ共通CSS（2952行）
│   ├── app.js                     ← メインロジック（日記・鑑定書レンダリング）
│   ├── deep_report_overrides.js   ← 参加者44名分の個別鑑定書テキスト
│   ├── shuku_report_gen.js        ← 27宿自動レポート生成エンジン
│   ├── gemini_deep_analysis.js    ← Gemini API連携（AI深層分析）
│   ├── participants_loader.js     ← 参加者プロフィール読み込み
│   ├── participants_data.js       ← 参加者データ（pid→宿・名前マッピング）
│   ├── diary_structured_save.js   ← 日記データ保存ロジック
│   ├── diary_data_sync.js         ← 日記データ同期
│   ├── kanon_messages.js          ← かのん社長メッセージ定義
│   ├── challenge_day1_sync.html   ← Day1チャレンジページ
│   ├── ...（day2〜day7も同様）
│   ├── kanon_deep_report_editor.html ← 管理者用：鑑定書編集ツール
│   ├── images/                    ← 画像フォルダ（neko-tenshi.pngなど）
│   └── participants/              ← 参加者個別JSONフォルダ（pid番号.json）
│       └── 001.json 〜 044.json
└── CODEX_HANDOFF.md               ← このファイル
```

---

## メインページ構成（moon_seed_deep_report.html）

ページ内のセクション順（上から）:

| セクション | クラス/属性 | 内容 |
|---|---|---|
| ヘッダー画像 | `.deep-report-header-img` | 第2の鑑定書ビジュアル |
| 4つのしるし冒頭 | `.deep-report-opening` | 暗紺背景★ PHOTO/WORDS/THANKS/NEXT説明 |
| タイトルブロック | `.challenge-header` | 「月読み日記 第2の鑑定書」タイトル |
| この日記でわかること | `.deep-report-intro-panel` | 紫背景★ 宿命への気づき/感謝/客観視 |
| 第一の鑑定書から | `[data-deep-first-concern]` | 旅の出発点（動的） |
| 4つのキーワード | `[data-deep-template-section]` | PHOTO/WORDS/THANKS/NEXT（動的） |
| Day別サマリー | `[data-deep-diary-summary]` | 日記記録サマリー（動的） |
| 第一章: 今のあなた | `[data-deep-current]` | 鑑定書本文1（動的） |
| 第二章: 育ち始めた願い | `[data-deep-themes]` | 鑑定書本文2（動的） |
| 第三章: 土台資質 | `[data-deep-shuku]` | 27宿鑑定（動的） |
| 第四章: 次の一歩 | `[data-deep-next]` | 鑑定書本文4（動的） |
| かのんより | `[data-deep-kanon]` | かのん社長コメント（動的） |
| 本人の言葉 | `[data-deep-voices]` | 日記引用（動的） |
| この7日間で育んだもの | `.deep-report-closing` | 静的まとめ文章（アンティーク背景） |
| AI深層分析 | `#deep-ai-analysis-section` | Gemini API分析結果 |
| 月のサイクル4フェーズ | `#moon-cycle-section` | 新月/上弦/満月/下弦の記録テキストエリア |
| ふたご座新月→山羊座満月 | `data-seal="新月から満月への旅"` | 振り返り5カード |
| 山羊座満月→次の新月 | `data-seal="満月から次の新月へ"` | 行動アドバイス5カード |
| データバックアップ | `<details>` | エクスポート/インポート機能 |

---

## 背景色とテキスト色のルール（重要）

ページには **3種類の背景** が混在している：

| セクション | 背景色 | テキスト色 |
|---|---|---|
| `.deep-report-opening`（4つのしるし） | 暗紺 `rgba(43,46,86,.96)` | 明るいクリーム `rgba(246,235,213,.92)` |
| `.deep-report-intro-panel`（日記でわかること） | 紫系ダーク | 白クリーム `#fffaf2`、ゴールド `#f1d99b` |
| `.completion-panel`（鑑定書各章） | アンティーク薄クリーム | 暗い茶 `#3d3328`、琥珀 `#a87932` |
| エピローグ | ダーク | 白クリーム `#fffaf2` |

**`<head>` 内の `<style>` ブロック**（最優先の `!important` 上書き）でこれを制御している。
セクションごとに使う色が異なるため、CSS変更時は必ずこのルールを守ること。

---

## 色変数（style.css）

```css
--gold:     #d8b56d  /* 薄ゴールド */
--gold2:    #f1d99b  /* 明るいゴールド */
--paperGold:#a87932  /* 琥珀茶金（アンティーク背景の見出し） */
--paperInk: #3d3328  /* 濃い茶インク（アンティーク背景の本文） */
--white:    #fffaf2  /* 温かみのある白 */
```

---

## 参加者データ構造

- **参加者数**: 44名（pid=001〜044、一部欠番あり）
- **URLパターン**: `?pid=001` 〜 `?pid=044`
- **鑑定書データ**: `deep_report_overrides.js` に全員分埋め込み済み
  - 各 pid に `s1`（第一章）、`s2`（第二章）、`s3`（第三章：宿曜）、`s4`（第四章）
- **日記データ**: localStorage に保存（キー: `tsukiyomi:structuredDiary:v1:{pid}:day:{1-7}`）
- **宿（しゅく）一覧**: 觜宿（ししゅく）、柳宿、井宿、軫宿など27宿

---

## Gemini API

- **キー管理**: `公開用` ローカルフォルダのみに実キー記載。GitHubには `''`（空）でコミット
- **モデル**: gemini-1.5-flash
- **用途**: `gemini_deep_analysis.js` でユーザーの信念・観念を分析

---

## 送付リスト

- `/Users/kanon/Documents/月読みワンダーランド/第二の鑑定書_送付リスト.html`
- 参加者44名分のURL一覧（コピーボタン・メッセージ作成ボタン付き）
- ※このファイルはGitHubには入っていない（ローカル管理）

---

## 直近の主な変更（2026-07）

1. **テキスト色**: 全体を茶系カラーに統一（背景別に使い分け）
2. **觜宿の読み**: しさく → ししゅく（3箇所修正済み）
3. **月のサイクルセクション**: ふたご座 → 山羊座に全面書き換え
4. **満月からのアドバイス2セクション**: 正しい月の流れ（ふたご座新月→山羊座満月→次の新月）に修正
7. **双子座新月診断の拡張 + 蟹座予告 + 12ヶ月テーマ一覧追加**（2026-07-09）
   - `runShingetsuDiagnosis()` に⑤⑥カード追加:
     - ⑤ 日記とのギャップ診断: localStorage から日記スニペットを最大4行取得し表示。「日記の言葉」と「今回の願い」の距離を「宿命の扉」として言語化
     - ⑥ 鑑定書の締め: 「— 第2の鑑定書、ここに閉じます —」クロージングメッセージ
   - `data-seal="次の新月へ"` セクション追加: 蟹座（6月新月）チャレンジ予告。テーマ・ギャップ診断の問い・感情日記のアクション
   - `data-seal="12ヶ月の旅"` セクション追加: 12星座 × 新月テーマ一覧グリッド（2列）。双子座に「← 今ここ」、蟹座に「次の月」バッジ
5. **チャプタータブナビゲーション追加**（2026-07-09）
   - `moon_seed_deep_report.html` に7タブのナビバーを追加（表紙 / 7日間の記録 / 第一章〜第四章 / あなたの言葉）
   - タブごとに1〜3パネルのみ表示することでレイアウトのズレを根本解消
   - 実装: `.deep-chapter-tab-btn` + `data-chapter-tab="N"` + `.tab-hidden` CSS
   - `sessionStorage` でページ間でも選択タブを記憶
   - 印刷時は全タブを展開表示（`@media print` で `.tab-hidden` を上書き）
6. **日記サーバーフェッチのID解決バグ修正**（`app.js`、2026-07-09）
   - 問題: URLパラメータなしでページを開くと `pid=あなた` でGASにクエリされ、スプレッドシートの日記データが取得できなかった
   - 原因: `resolveBaseProfile()` は `tsukiyomi:diarySync:cachedProfile` を読まない。一方 `diary_data_sync.js` はDay1〜7ページでメールをここに保存する
   - 修正: autoReportパスのサーバーフェッチ前に `tsukiyomi:diarySync:cachedProfile` を読み、`email` / `participantId` を補完してからGASへクエリ

---

## チャプタータブ — セクション対応表

| タブ | 内容 | `data-chapter-tab` |
|---|---|---|
| 表紙 (1) | `.deep-report-opening`, `.challenge-header`, `.deep-report-intro-panel`, ヘッダー画像 | `"1"` |
| 7日間の記録 (2) | `[data-deep-first-concern]`, `.moon-question`, `[data-deep-template-section]`, `[data-deep-diary-summary]` | `"2"` |
| 第一章 (3) | `data-seal="第一章"`, `[data-deep-current-continuation]` | `"3"` |
| 第二章 (4) | `data-seal="第二章"` | `"4"` |
| 第三章 (5) | `data-seal="第三章"` | `"5"` |
| 第四章 (6) | `data-seal="第四章"` | `"6"` |
| あなたの言葉 (7) | voices / kanon / closing / moon-cycle / sg-section / backup / epilogue | `"7"` |

---

## デプロイ手順

```bash
# 公開用フォルダ（ローカル）で編集 → GitHub docs/ にコピー → push
cd /Users/kanon/Documents/GitHub/thukiyomi-team-review
git add docs/ && git commit -m "fix: ..." && git push origin main
# → GitHub Actions が自動でGitHub Pagesにデプロイ（約2〜3分）
```

---

---

# ⚠️ 印刷CSS修正 引き継ぎ（2026-07-16 追記）

## 現在の状態（commit `582e650`、ブランチ `main`）

### 動作中
- ページ枠（`枠月透かし.png`）が全印刷ページに表示される
- 空セクションが印刷から除外される（CSS特異度修正済み）
- 月のサイクルのtextareaが全文表示される
- CTAボタンセクションが非表示で最終ページが1枚に収まる
- イントロ画像が1ページ以内に収まる
- `beforeprint`/`afterprint` JSでtextarea高さを展開

### 未解決（Codexに依頼する内容）
1. **ページ2が空白** — 4つのしるしセクションとタイトルブロックの間に空白ページが出る
2. **ページ22付近が空白** — エピローグ（3段落）が単独の空白ページに追い出される
3. **枠の下部が切れる** — `position: fixed; height: 100%` が印刷でA4高さにならないケース

---

## 根本原因（解析済み）

### 原因1: スクリーンCSSの `break-after: page !important` が印刷にも効く

`@media print` 外のスクリーンCSSに以下が存在する（約1208行目・1249行目）：

```css
/* 1208行目 */
[data-deep-report] .deep-report-closing[data-seal="双子座新月"] {
  break-after: page !important;
  page-break-after: always !important;
  /* 特異度: 0,3,0 + !important */
}

/* 1249行目 */
[data-deep-report] .deep-report-closing:is([data-seal="双子座満月"], [data-seal="双子座新月"]) {
  break-after: page !important;
  page-break-after: always !important;
  /* 特異度: 0,3,0 + !important */
}
```

これらは `data-chapter-tab="8"` の双子座新月（1663行目）・満月（1713行目）セクションに作用し、
印刷時に強制改ページを発生させてページ22付近の空白の原因となっている。

`@media print` 内で以下を追加して上書き中だが、完全に機能していない可能性がある：

```css
[data-deep-report] .deep-report-closing[data-seal="双子座新月"],
[data-deep-report] .deep-report-closing[data-seal="双子座満月"],
[data-deep-report] .deep-report-closing:is([data-seal="双子座満月"], [data-seal="双子座新月"]) {
  break-after: auto !important;
  page-break-after: auto !important;
}
```

→ 同じ特異度（0,3,0）で後から書いているため理論上は勝つはずだが、確認が必要。

### 原因2: ページ2の空白（原因未特定）

`.deep-report-opening`（4つのしるしセクション）の後に1枚の空白ページが発生し、
タイトルブロック（`deep-report-title-block`）がページ3に追い出される。

試みた修正（いずれも効果不十分）：
- `.deep-report-opening` から `break-after: page` を削除 → 効果なし
- `.deep-report-opening` に `position: relative; z-index: 1` 追加 → 効果なし（後で削除）
- `.deep-opening-banner` の `max-height` を 150mm → 110mm → 100mm に縮小 → 効果なし

考えられる原因：
- `break-inside: avoid` + コンテンツ高さの組み合わせでブラウザが幽霊ページを生成している
- タイトルブロックの `padding: 14mm 0 12mm` が原因で、ページ2に14mmの不可視パディングだけが残り、テキストはページ3に追い出されている
- Chrome固有の印刷レンダリングバグ

### 原因3: 枠の下部切れ

```css
#print-page-frame {
  position: fixed; top: 0; left: 0;
  width: 210mm; height: 297mm;  /* 現在はA4明示（以前は 100% で切れていた）*/
}
#print-page-frame img {
  width: 210mm; height: 297mm;
  object-fit: fill;
}
```

現在は `210mm × 297mm` + `object-fit: fill` に変更済み。ただし確認が必要。

---

## タブシステムと特異度（重要）

```css
/* スクリーン: 非アクティブタブを非表示 */
[data-deep-report] [data-chapter-tab].tab-hidden { display: none !important; }
/* 特異度: 0,3,0 */

/* 印刷: 全タブを強制表示 */
@media print {
  [data-deep-report] [data-chapter-tab].tab-hidden { display: block !important; }
  /* 特異度: 0,3,0 */
}
```

**ルール**: 印刷時に特定要素を非表示にするには特異度 **≥ 0,4,0** が必要。

現在の空セクション非表示ルール（動作中）：
```css
[data-deep-report] [data-chapter-tab][data-kanon-panel]:not([data-has-content]),
[data-deep-report] [data-chapter-tab][data-deep-voices-section]:not([data-has-content]),
[data-deep-report] [data-chapter-tab][data-deep-voices-section-cont]:not([data-has-content]),
[data-deep-report] [data-chapter-tab][data-deep-template-section]:not([data-has-content]) {
  display: none !important;
  /* 特異度: 0,4,0 — タブ表示ルール(0,3,0)に勝つ */
}
```

---

## DOMの印刷順序

```
main[data-deep-report]
└── article.challenge-card
    ├── nav.deep-chapter-tabs          ← 印刷非表示
    ├── div.moon-mark                  ← 印刷非表示
    │
    ├── [PAGE 1 想定]
    │   section.deep-report-opening[data-chapter-tab="1"]
    │     img.deep-opening-banner (max-height:100mm)
    │     h2, p, p
    │
    ├── [PAGE 2 想定 — 現在 PAGE 3 に追い出されている]
    │   header.deep-report-title-block[data-chapter-tab="1"]
    │     "SECOND READING / 月読み日記 第2の鑑定書"
    │
    ├── [PAGE 3 想定]
    │   section.deep-report-intro-image-panel[data-chapter-tab="1"]
    │     img.deep-report-intro-image (max-height:220mm)
    │
    ├── section.challenge-body
    │   ├── [data-chapter-tab="2〜7"] 各章セクション
    │   │
    │   ├── ⚠️ 問題セクション (data-chapter-tab="8")
    │   │   section.deep-report-closing[data-seal="双子座新月"]  ← break-after:page!
    │   │   section.deep-report-closing[data-seal="双子座満月"]  ← break-after:page!
    │   │
    │   ├── section.deep-report-closing[data-seal="次の新月へ"][data-chapter-tab="9"]
    │   ├── section.deep-report-closing[data-seal="12ヶ月の旅"][data-chapter-tab="1"]
    │   ├── section#data-backup-section                ← 印刷非表示
    │   ├── div[data-chapter-tab="9"] (更新ボタン)     ← ボタン・ステータス非表示
    │   ├── section.deep-report-epilogue[data-chapter-tab="9"]  ← エピローグ3段落
    │   └── section[data-no-diary-cta]                ← 印刷非表示
    └── nav.challenge-nav              ← 印刷非表示
```

---

## 現在の `@media print` 主要ルール（582e650時点）

```css
@media print {
  /* 非表示要素 */
  #global-nav, #apikey-panel, #corner-ornament, [data-no-diary-cta], .challenge-nav,
  #data-backup-section, #refresh-status, button[onclick*="refreshDeepReport"],
  #chapter-bottom-nav, #sg-btn, #sg-fetch-status, #sg-diary-preview { display: none !important; }

  /* 全タブを展開 */
  .tab-hidden { display: block !important; }
  [data-deep-report] [data-chapter-tab].tab-hidden { display: block !important; }

  /* 空セクション非表示（特異度0,4,0） */
  [data-deep-report] [data-chapter-tab][data-kanon-panel]:not([data-has-content]) { display: none !important; }
  /* ...同パターンで voices-section, voices-section-cont, template-section も同様 */

  /* 枠：A4固定サイズ */
  #print-page-frame { position:fixed; top:0; left:0; width:210mm; height:297mm; z-index:0; }
  #print-page-frame img { width:210mm; height:297mm; object-fit:fill; }

  /* コンテンツエリア */
  main.challenge-shell { width:100%; padding:36mm 30mm 34mm; position:relative; z-index:1; }

  /* 4つのしるし（冒頭） */
  .deep-report-opening { break-inside:avoid; padding-bottom:0; }
  .deep-opening-banner { max-height:100mm; object-fit:contain; }

  /* タイトルブロック */
  .deep-report-title-block { padding:14mm 0 12mm; display:block; }
  .deep-report-title-block h1, h1 span { color:#3d2808; }

  /* イントロ画像 */
  .deep-report-intro-image { max-height:220mm; object-fit:contain; }

  /* 双子座セクションの強制改ページを無効化（スクリーンCSS上書き） */
  [data-deep-report] .deep-report-closing[data-seal="双子座新月"],
  [data-deep-report] .deep-report-closing[data-seal="双子座満月"],
  [data-deep-report] .deep-report-closing:is([data-seal="双子座満月"], [data-seal="双子座新月"]) {
    break-after: auto !important;
    page-break-after: auto !important;
    padding-top: 24px !important;
    padding-bottom: 24px !important;
  }

  /* エピローグ：直前セクションと同ページに */
  .deep-report-epilogue { break-before:avoid; }

  /* textarea：内容が全部見えるよう高さ自動展開 */
  [data-deep-report] textarea { height:auto; min-height:0; overflow:visible; }
}
```

`beforeprint`/`afterprint` JSが `</body>` 直前にあり、`textarea.scrollHeight` で高さを設定する。

---

## ロールバック方法

万が一修正が失敗した場合：

```bash
# バックアップブランチから復元
git checkout backup/print-css-stable -- docs/moon_seed_deep_report.html
git commit -m "revert: restore from backup/print-css-stable"
git push origin main

# または特定タグに戻す
git checkout print-css-baseline-20260716 -- docs/moon_seed_deep_report.html
git commit -m "revert: restore to print-css-baseline-20260716"
git push origin main
```

---

## セキュリティ制約（必須）

APIキー（`AQ.Ab8RN6...` 形式）は**絶対にコードにハードコードしない**。  
ユーザーがUIの入力フィールドに入力し、localStorageに保存される設計。  
`git commit` 前に `grep -r "AQ\." docs/` で漏れていないことを確認すること。

---

## テスト方法

1. `https://kaiundo305-hub.github.io/thukiyomi-team-review/?participantId=tsukiyomi_test` を開く
2. 日記データが読み込まれるのを待つ
3. Cmd+P → PDF保存
4. 確認ポイント：
   - **ページ2が空白でない**（タイトルブロックが表示される）
   - **ページ22付近が空白でない**（エピローグが前ページと続いている）
   - **枠が全ページでA4フル表示**（下が切れていない）
   - **双子座セクション後に余分な空白ページが出ない**
