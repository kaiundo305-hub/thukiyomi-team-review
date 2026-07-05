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

---

## デプロイ手順

```bash
# 公開用フォルダ（ローカル）で編集 → GitHub docs/ にコピー → push
cd /Users/kanon/Documents/GitHub/thukiyomi-team-review
git add docs/ && git commit -m "fix: ..." && git push origin main
# → GitHub Actions が自動でGitHub Pagesにデプロイ（約2〜3分）
```
