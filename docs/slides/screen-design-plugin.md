---
marp: true
theme: default
paginate: true
size: 16:9
title: screen-design plugin の紹介
style: |
  section {
    font-family: "Hiragino Sans", "Noto Sans JP", sans-serif;
    font-size: 26px;
    padding: 56px 64px;
    color: #1f2937;
  }
  h1 { font-size: 46px; color: #111827; }
  h2 { font-size: 36px; color: #111827; border-bottom: 3px solid #e5e7eb; padding-bottom: 8px; }
  h3 { font-size: 26px; color: #374151; }
  code { font-family: "SF Mono", Menlo, monospace; background: #f3f4f6; border-radius: 4px; }
  pre { font-size: 17px; line-height: 1.5; border-radius: 8px; }
  table { font-size: 20px; }
  th { background: #f3f4f6; }
  section.lead { justify-content: center; text-align: center; }
  section.lead h1 { font-size: 56px; }
  section.chapter { justify-content: center; background: #111827; color: #f9fafb; }
  section.chapter h1 { color: #f9fafb; font-size: 50px; }
  section.chapter p { color: #9ca3af; }
  section.small table { font-size: 17px; }
  section.small pre { font-size: 15px; }
  section.tiny { padding: 36px 48px; }
  section.tiny h2 { font-size: 28px; margin-bottom: 8px; }
  section.tiny .doc { font-size: 16px; line-height: 1.45; gap: 28px; }
  section.tiny .doc > div { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 16px; background: #fff; }
  section.tiny .doc h4 { font-size: 22px; margin: 2px 0 6px; }
  section.tiny .doc h5 { font-size: 17px; margin: 8px 0 3px; border-bottom: 1px solid #e5e7eb; color: #111827; }
  section.tiny .kinds { font-size: 18px; }
  section.tiny .doc.kinds table { font-size: 16px; margin: 4px 0 14px; }
  section.tiny .doc.kinds th, section.tiny .doc.kinds td { padding: 4px 8px; }
  section.tiny .kinds p { margin: 0; }
  section.tiny .doc .later { color: #6b7280; }
  section.tiny .doc p, section.tiny .doc ol { margin: 3px 0; }
  section.tiny .doc table { font-size: 14px; margin: 3px 0; }
  section.tiny .doc th, section.tiny .doc td { padding: 2px 6px; }
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; align-items: start; }
  .cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .note { color: #6b7280; font-size: 20px; }
  .flow { display: flex; align-items: center; gap: 8px; font-size: 16px; margin: 28px 0; }
  .flow div { border: 2px solid #9ca3af; border-radius: 10px; padding: 14px 8px; text-align: center; flex: 1; background: #f9fafb; white-space: nowrap; }
  .flow div b { display: block; font-size: 20px; }
  .flow span { color: #9ca3af; font-size: 28px; }
  img.shot { border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
---

<!-- _class: lead -->
<!-- _paginate: false -->

# screen-design plugin の紹介

画面の設計書を、会話しながら決まった形で作る

<span class="note">実装例: ポモドーロタイマー</span>

---

## 今日話すこと

1. screen-design plugin とは
2. 実装例: ポモドーロタイマー（デモ）
3. skill ごとに、何が作られるか
4. 感想

---

<!-- _class: chapter -->

# 1. screen-design plugin とは

---

## そもそも、プラグインとは

Claude Code に、あとから足せる拡張のまとまり。

- 中身は、**skill**（Claude への手順書）、コマンド、エージェントなど
- Git のリポジトリ（マーケットプレイス）で配る
- 入れると、`/skill 名` で呼べるようになる

```
/plugin marketplace add nebular-lab/nebular-plugins
/plugin install screen-design@nebular-plugins
```

<span class="note">skill は、Markdown で書いた手順・規則・テンプレートのまとまり。呼ばれたときに、Claude がそれを読んで、そのとおりに進める</span>

---

## 何をするプラグインか

画面の設計書を、決まった形式で作るための skill 集。上から順に使う。

| 順 | skill | 作るもの |
| --- | --- | --- |
| ① | `/write-screen-common-rules` | 全画面共通ルール　Markdown |
| ② | `/write-screen-wireframe` | ワイヤーフレーム　HTML / CSS |
| ③ | `/write-screen-spec` | 画面設計書　Markdown |
| ④ | `/write-screen-flow` | 画面遷移図　draw.io |
| ⑤ | `/write-screen-playwright-test` | Playwright テストコード（TS） + 手動テストケース　Markdown |

---

## 作られるファイル

```
docs/screens/
├── overview.md          概要と画面一覧
├── common-rules.md      全画面共通ルール
├── messages.md          メッセージ一覧
├── storage.md           ブラウザストレージ一覧
├── wireframe.css        ワイヤーフレームの共通スタイル
├── HDR-001_app-header/  共通ヘッダー
└── SCR-002_timer/       画面ごとのフォルダ
    ├── SCR-002_timer.html             ワイヤーフレーム
    ├── SCR-002_timer.md               画面設計書
    ├── SCR-002_timer.spec.ts          Playwright テスト
    └── SCR-002_timer.manual-test.md   手動テスト
```

<span class="note">1 画面 = 1 フォルダ。ID（SCR-NNN）で、すべてのファイルがつながる</span>

---

## サンプルが付いている

イベント管理の 5 画面（一覧・編集・詳細・作成・ログイン）と、共通ヘッダー 2 種類で作った例。

- 全画面共通ルール、ワイヤーフレーム、画面設計書、画面遷移図、Playwright テスト、手動テストが、ひととおりそろっている
- API 定義（OpenAPI）も入っている
- skill は、書くときに「規則よりも、まずサンプルに合わせる」

```
plugins/screen-design/examples/
├── docs/screens/   共有ファイル、画面遷移図、画面ごとのフォルダ
└── docs/api/       openapi.yaml
```

---

<!-- _class: chapter -->

# 2. 実装例: ポモドーロタイマー

---

## ポモドーロタイマー

自分専用のタイマー。タスクごとに、作業した時間を記録する。

<div class="cols">
<div>

- 画面は 4 つ + 共通ヘッダー
  - タイマー / タスク管理 / 履歴 / 設定
- ブラウザだけで動く（サーバーなし）
- React、TanStack Router、shadcn

<span class="note">このあと、デモで動かします</span>

</div>
<div>

<img class="shot" src="images/app-timer.png" width="100%">

</div>
</div>

---

<!-- _class: lead -->

# デモ

---

<!-- _class: chapter -->

# 3. skill ごとに、何が作られるか

---

## ① `/write-screen-common-rules`

全画面で同じになる扱いを、**最初に 1 回**決める。

- 項目と選択肢は、あらかじめ決まっている
- 人は、選択肢から選ぶだけ（文章でルールを書き足さない）
- 画面ごとに扱いがばらつくのを防ぐ

---

<!-- _class: small -->

## 生成されるもの: `common-rules.md`

設定ファイルのようなもの。項目（キー）ごとに、設定（値）を選んで決めていく。

| 項目 | 設定 | 選択肢 |
| --- | --- | --- |
| 改行を 1 文字と数えるか | yes | `yes` / `no` |
| 文字数のバリデーション時に前後の空白を取り除くか | yes | `yes` / `no` |
| `maxlength` のある項目への貼り付け | 受け付けない | `収める` / `受け付けない` |
| 数値を 3 桁ごとにカンマで区切るか | yes | `yes` / `no` |
| ブラウザの戻るで一覧に戻ったときに、検索条件を復元するか | yes | `yes` / `no` |

<br>

- 設計書には「共通ルールどおり」のことは書かない
- 違う扱いをする画面だけ、「**共通ルールと違う:**」と書く

---

## ② `/write-screen-wireframe`

画面の構成を、**グレーの枠と本物のフォーム部品**だけの HTML で描く。

- デザインではなく、「何が、どの順に、どこに並ぶか」を合意するための図
- 説明やスクリーンショットを渡すと、先に下書きを描いてくれる
- 部品に**番号**を振る → これが、設計書の No になる
- 状態ごとの見え方（開始前・動作中・エラー表示など）も並べて描く

---

## なぜ、簡易 HTML なのか

| 案 | 採否 | 理由 |
| --- | --- | --- |
| Figma のスクリーンショット | 却下 | 直しにくい。部品に番号を付けにくい |
| React などで実装したもの | 却下 | 実装コードから独立させたい。独立していることが、見てわかるようにしたい |
| **簡易 HTML** | **採用** | 直しやすい。番号を付けられる。実装とは別物だと、ひと目でわかる |

---

## 生成されるもの: `SCR-002_timer.html`

<div class="cols">
<div>

<img class="shot" src="images/wf-SCR-002_timer.png" width="100%">

</div>
<div>

```html
<span class="huge" data-no="1">25:00</span>
<span class="dots" data-no="2">…</span>
<div class="row center">
  <button class="round" data-no="4">▶</button>
  <button class="plain" data-no="5">▶|</button>
</div>
```

- `data-no` が部品番号
- 共通の `wireframe.css` を使うので、HTML は短い
- ブラウザで開いて、そのまま確認できる

</div>
</div>

---

## ワイヤーフレーム → 実装

<div class="cols">
<div>

<img class="shot" src="images/wf-SCR-004_history.png" style="max-height: 440px;">

<span class="note">ワイヤーフレーム（履歴）</span>

</div>
<div>

<img class="shot" src="images/app-history.png" style="max-height: 440px;">

<span class="note">実装した画面</span>

</div>
</div>

---

## ③ `/write-screen-spec`

設計書のテンプレートを決めておく。実装の前に決めておきたいことは、すべて書く。

| 項目 | 書くこと |
| --- | --- |
| 冒頭の表 | 画面 ID、URL、document.title、共通ヘッダー、初期フォーカス |
| 1. 概要 | 何の画面か |
| 2. クエリパラメータ | 受け取る値と、受け取れない値のときの扱い |
| 3. 閲覧権限 | 誰が見られるか |
| 4. 画面項目 | 入力項目 / ボタン・リンク / テキスト / その他。HTML の属性（`type`、`value`、`disabled` など）と、表示条件 |
| 5. 初期表示時の処理 | 画面を開いたときの手順 |
| 6. アクション | 操作ごとの手順 |
| 7. 未決事項 | まだ決まっていないこと |

---

<!-- _class: tiny -->

## サンプル: `SCR-005_settings.md`（省略あり）

<div class="cols doc">
<div>

#### SCR-005 設定

| 項目 | 内容 |
| --- | --- |
| 画面 ID | SCR-005 |
| URL | `/settings` |
| document.title | 設定 |
| 共通ヘッダー | HDR-001 共通ヘッダー |
| 初期フォーカス | - |

##### 1. 概要

タイマーの時間、サイクルの回数、自動スタートを変える画面。

##### 2. クエリパラメータ

なし

##### 3. 閲覧権限

| 利用者の種類 | 閲覧 |
| --- | --- |
| 利用者 | ○ |

</div>
<div>

##### 4. 画面項目

<span class="later">→ 次のスライドで説明</span>

##### 5. 初期表示時の処理

1. 共通ヘッダーの初期表示時の処理が終わったあと、設定の値を No.3、No.5、No.7、No.9、No.10、No.11 に入れる。

##### 6. アクション

<span class="later">→ 次の次のスライドで説明</span>

##### 7. 未決事項

なし

</div>
</div>

---

<!-- _class: tiny -->

## 4. 画面項目: 部品の種類ごとに、表の列が決まっている。列名は、HTML の属性名

<div class="doc kinds">

**入力項目**

| No | 項目名 | タグ | `type` | `value` | `placeholder` | `maxlength` | `autocomplete` | `inputmode` | `disabled` | 入力可能文字種 | その他の属性 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 新しいタスク | `input` | `text` | 空 | 「新しいタスクを追加」 | - | `off` | - | - | - | - | 読み上げ名: … |

**ボタン・リンク**

| No | 項目名 | タグ | `type` | `href` | `target` | 表示条件 | `disabled` | その他の属性 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | リセット | `button` | `button` | - | - | 動作が動作中か一時停止中のとき | - | - | 読み上げ名: リセット |

**テキスト**

| No | 項目名 | タグ | 表示内容 | 表示条件 | その他の属性 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 作業時間の見出し | `label` | 「作業時間」 | 常に表示 | `for`: No.3 | - |

**その他**（上のどれにも当たらない部品）

| No | 項目名 | タグ | 表示内容 | 表示条件 | その他の属性 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | サイクルの進み具合 | 実装時に決める | 設定のサイクルの数だけ、点を横に並べる | 常に表示 | - | 読み上げ名: 「サイクル 2 / 4」 |

</div>

<span class="note">No は、ワイヤーフレームの番号と同じ。実装でどの属性に何を設定するかを、読み替えずにそのまま使える</span>

---

<!-- _class: small -->

## 生成されるもの: `SCR-002_timer.md`（アクション）

```markdown
### A5. 一時停止のボタン押下

1. 「終了予定時刻 − 現在の時刻」が 0 以下のとき、一時停止せずに終了する
   （共通ヘッダーの A5 が、フェーズを完了にする）。
2. 残り秒数を「終了予定時刻 − 現在の時刻」（1 秒未満は切り上げ）にし、
   終了予定時刻を `null` にし、動作を一時停止中にする。
3. タイマーの状態を、STG-004 に保存する。
4. A7 を行う。
```

- 操作 1 つ = アクション 1 つ。手順を、番号つきで書く
- メッセージは `MSG-NNN`、保存する値は `STG-NNN` で参照する
- 境目（0 以下、1 秒未満）まで書く → そのままテストケースになる

---

<!-- _class: small -->

## 一緒に作られるもの: 共有ファイル

<div class="cols">
<div>

### `messages.md`

| ID | 種別 | 文言 |
| --- | --- | --- |
| MSG-001 | エラー | {v1}を入力してください |
| MSG-006 | エラー | {v1}は {v2} 文字以内で入力してください |

文言は 1 か所にだけ書く

</div>
<div>

### `storage.md`

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `name` | string | タスクの名前。1〜50 文字 |
| `color` | string | `#RRGGBB` |
| `archived` | boolean | アーカイブしたか |

ブラウザに保存する値の、キーと形式

</div>
</div>

<br>

<span class="note">ポモドーロタイマーは API を持たないので、データの定義は storage.md に集まっている。API があるときは、OpenAPI 定義を読んで設計書を書く</span>

---

## ④ `/write-screen-flow`

すべての画面設計書から遷移を読み取り、画面遷移図（draw.io）を作る。

<img class="shot" src="images/sample-screen-flow.png" width="100%">

<span class="note">プラグインのサンプル（イベント管理の 5 画面）の遷移図。ポモドーロタイマーは、4 画面が共通ヘッダーのリンクで行き来するだけなので、矢印のない図になる</span>

---

## ⑤ `/write-screen-playwright-test`

画面設計書から、**テストケースを洗い出して**、Playwright のテストを書く。

- 目的は「どのケースを作るか」を明確にすること
- テスト名の先頭に、**設計書のどの記述から作ったか**（出典）を付ける
  → テストコードを読めば、ケースの一覧になる
- 自動で確かめられないケースは、**手動テスト**（Markdown）に書く
- 書いたあと、別のエージェントが設計書と突き合わせて、**漏れをチェック**する

---

<!-- _class: small -->

## 生成されるもの: `SCR-002_timer.spec.ts`

```ts
const boundaries = [
  { name: '今日の 0:00:00（日本時間）',        completedAt: '2026-10-10T15:00:00.000Z', count: '1' },
  { name: '今日の 23:59:59.999（日本時間）',   completedAt: '2026-10-11T14:59:59.999Z', count: '1' },
  { name: '前の日の 23:59:59.999（日本時間）', completedAt: '2026-10-10T14:59:59.999Z', count: '0' },
  { name: '次の日の 0:00:00（日本時間）',      completedAt: '2026-10-11T15:00:00.000Z', count: '0' },
]
for (const c of boundaries) {
  test(`[今日のポモドーロ数 表示内容 / 今日に入る作業記録] 完了した時刻が${c.name}の作業記録は、${c.count} 件として数える`,
    async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle'), { records: [{ completedAt: c.completedAt, taskId: null, seconds: 1500 }] }))
      await expect(ui(page).today).toHaveText(`今日 ${c.count} ポモドーロ`)
    })
}
```

- `[出典] 条件のとき、期待する結果` の形のテスト名
- 境目（ちょうど / 1 つ外）を、必ず両側から確かめる
- 部品は、文言や読み上げ名で探す（実装の都合の属性を前提にしない）

---

<!-- _class: small -->

## 生成されるもの: `SCR-002_timer.manual-test.md`

| No | 出典 | ケース | 自動で確かめられない理由 | 確かめ方 |
| --- | --- | --- | --- | --- |
| 2 | サイクルの進み具合 表示内容 | 終えた回の点は塗る | 見た目だけで表していて、目印がない | 作業を終わらせるたびに、塗られた点が左から 1 つずつ増えることを目で確かめる |
| 7 | 作業するタスクの色 読み上げ名 | 飾りとして、読み上げない | 読み上げソフトでしか確かめられない | 読み上げソフトで順に読ませ、色の見本が読み上げられないことを聞いて確かめる |
| 9 | スキップ | 音を出さない | 音が鳴ったかどうかは、判定できない | 動作中にスキップを押し、音が鳴らないことを聞いて確かめる |

<br>

- 音・色・形など、機械では判定できないものが集まる
- 「テストがない」のではなく、「**手で確かめる**」と決めたことが残る

---

## できあがったもの（ポモドーロタイマー）

| 成果物 | 数 |
| --- | --- |
| 画面設計書 | 4 画面 + 共通ヘッダー |
| ワイヤーフレーム | 5 |
| Playwright テスト | **975 件** |
| 手動テスト | 20 件 |

<br>

| | ヘッダー | タイマー | タスク管理 | 履歴 | 設定 |
| --- | --- | --- | --- | --- | --- |
| 自動テスト | 194 | 238 | 230 | 269 | 44 |
| 手動テスト | 3 | 9 | 1 | 7 | - |

---

## 直すときも、上流から

実際にあった変更: 「ブラウザ通知をやめて、音だけで知らせる」

<div class="flow">
  <div><b>仕様書</b>通知を出さない</div><span>→</span>
  <div><b>画面設計書</b>手順から通知を消す</div><span>→</span>
  <div><b>テスト</b>通知のケース 15 件を消す</div><span>→</span>
  <div><b>実装</b>テストが通るまで</div>
</div>

- 設計書が先にあるので、**どこを直せばよいか**が番号と文言でたどれる
- テストを先に動かすと、**設計書のあいまいさ**が見つかる
  - 例: 「名前が空のタスクが保存されていたら、どう扱うか」→ 質問 → 設計書に書く

---

<!-- _class: chapter -->

# 4. 感想

---

## 感想

- （ここに書く）
- （ここに書く）
- （ここに書く）

---

<!-- _class: lead -->

# ありがとうございました

```
/plugin marketplace add nebular-lab/nebular-plugins
/plugin install screen-design@nebular-plugins
```
