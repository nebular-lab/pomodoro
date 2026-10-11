/**
 * SCR-003 タスク管理 の Playwright テスト
 *
 * 設計書: docs/screens/SCR-003_tasks/SCR-003_tasks.md
 * ワイヤーフレーム: docs/screens/SCR-003_tasks/SCR-003_tasks.html
 * メッセージ一覧: docs/screens/messages.md
 * ブラウザストレージ一覧: docs/screens/storage.md
 * 共通ルール: docs/screens/common-rules.md
 *
 * テスト名の先頭の [...] は、設計書のどこから作ったケースかを、場面・項目名・条件で示す。
 *   [document.title]                              … 冒頭の表の document.title
 *   [Enter キーで動くボタン]                      … 冒頭の表の「Enter キーで動くボタン」
 *   [閲覧権限 利用者]                             … 3. 閲覧権限 の行
 *   [クエリパラメータ archived 省略]              … 2. クエリパラメータ の archived を省略したとき
 *   [タスクのリスト 表示内容]                     … 画面項目「タスクのリスト」の表示内容
 *   [「アーカイブ」ボタン 表示条件]               … 画面項目「「アーカイブ」」の表示条件
 *   [既定の色 1 読み上げ名]                       … 画面項目「既定の色 1」の備考の読み上げ名
 *   [初期表示 / タスク 値がない]                  … 5. 初期表示時の処理 で、タスク（ストレージ）に値がないとき
 *   [初期表示 / URL クエリを整える]               … 5. 初期表示時の処理 の、URL クエリを整える手順
 *   [「追加」ボタン押下 / 色の自動設定]           … アクション「「追加」ボタン押下」の手順のうち、色を決めるところ
 *   [新しいタスク 50 文字以内]                    … 「追加」ボタン押下のバリデーションの表の、新しいタスクの「50 文字以内」の行
 *   [タスク名 必須]                               … 「タスク名の入力欄からフォーカスが外れる」のバリデーションの表の、タスク名の「必須」の行
 *   [色を選ぶ枠 表示条件 / 「追加」ボタン押下]    … 画面項目「色を選ぶ枠」の表示条件のうち、そのアクションで非表示にするところ
 *   [保存 / 形式に合わない要素]                   … storage.md の「使わなかった要素は、次に保存するときに残さない」
 *   [共通ルール アクセシビリティ / …]            … 共通ルールの「アクセシビリティ」のルール
 *   [共通ルール ブラウザの戻るで…]               … 共通ルールの「遷移」の行
 *   [新しいタスク 共通ルールと違う / …]          … 画面項目「新しいタスク」の備考の「共通ルールと違う」
 * 2 つの出典に当たるケースは「/」で併記している。メッセージは文言をそのまま書いている。
 *
 * 実装についての前提:
 * - この画面は API を呼ばない。データは localStorage に持つ（キーと形式は storage.md）
 * - 部品は、役割と名前で探す。
 *   - 新しいタスク・タスク名は、textbox の役割と、設計書の読み上げ名（「新しいタスクの名前」「{name} の名前」）
 *   - 「追加」・タスクの色・「アーカイブ」・「アーカイブを解除」・既定の色は、button の役割と、文言か読み上げ名
 *     （「{name} の色を変更」「{name} をアーカイブ」「{name} のアーカイブを解除」「赤」…）。行ごとにある部品は、読み上げ名の {name} で、どの行のものかを区別する
 *   - タブ（タグは「実装時に決める」）は、tab の役割と、文言（「使用中」「アーカイブ済み」）
 *   - その他の色は、読み上げ名「その他の色」のラベルで探す（色の入力欄には、決まった役割がないため）
 *   - 見出しは heading の役割と文言
 * - どのタブを選んでいるかは、選択状態の目印を見ずに、結果で確かめる
 *   （リストに並ぶタスクと、行のボタンが「アーカイブ」か「アーカイブを解除」か）
 * - 色を選ぶ枠（タグは「実装時に決める」）は、枠そのものを探さず、中の部品（既定の色のボタンと、その他の色）が
 *   見えるかどうかで、表示・非表示を確かめる。どの行の枠かは、その他の色に入っている色と、色を選んだあとに保存されるタスクで確かめる
 *   （枠が、行の要素の中にあることは前提にしない）
 * - エラー表示（タグは「実装時に決める」）は、メッセージの文言と、入力欄の「説明」で確かめる
 * - タスク名の入力欄からフォーカスを外す操作は、フォーカスを外すだけにする（ほかの部品は押さない）
 * - その他の色は、ブラウザの色を選ぶ部品を自動では操作できないので、ブラウザが起こすイベントをまねる。
 *   選んでいる途中は input イベントだけ、選び終えたら input イベントのあとに change イベントを起こす。
 *   その他の色の値は、ブラウザが小文字の #rrggbb にそろえる
 * - 時刻は Playwright の時計で、日本時間の 2026-10-11 10:00 から始める。時計は止めない（画面のタイマー処理を止めないため）ので、
 *   追加したタスクの作成日時は、「今」から 1 分以内であることを確かめる
 * - 「前後の空白」は、半角の空白と全角の空白の両方とする
 * - タスクの要素が形式に合うかどうかは、storage.md の「値の構造」の決まりのとおり
 *   （必須のフィールドと型、name が前後の空白を除いて 1 文字以上、color が #RRGGBB の形、createdAt が日時として読めること。名前が 50 文字以内かや、id が UUID の形かは確かめない）
 * - タブを切り替えたときの読み上げでの通知は、しない（設計書のタブの備考）。通知しないことは、自動では確かめられないので、ケースにしていない
 * - 特定の属性（aria-*、data-*）やライブラリ固有の DOM の形は前提にしない
 * - 共通ヘッダーの中身は、ここでは確かめない（ヘッダーの設計書から別に確かめる）。別の画面へ移る操作には、共通ヘッダーの「設定」のリンクを使う
 */
import { expect, type Locator, type Page, test } from '@playwright/test'

// ---- メッセージ（docs/screens/messages.md）------------------------------------
// 変数（{v1}、{v2}…）のあるメッセージは関数にする。引数は変数の番号の順

const M = {
  MSG001: (v1: string) => `${v1}を入力してください`,
  MSG006: (v1: string, v2: number) => `${v1}は ${v2} 文字以内で入力してください`,
}

/** 新しいタスク・タスク名の「必須」のエラー */
const NAME_REQUIRED = M.MSG001('タスク名')
/** 新しいタスク・タスク名の「50 文字以内」のエラー */
const NAME_TOO_LONG = M.MSG006('タスク名', 50)

const q = (message: string) => `「${message}」`

// ---- ブラウザストレージ（docs/screens/storage.md）-----------------------------

const STG = {
  /** STG-002 タスク */
  tasks: 'pomodoro:tasks',
} as const

type Task = {
  id: string
  name: string
  color: string
  archived: boolean
  createdAt: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---- 既定の 12 色（設計書の「既定の色 1」〜「既定の色 12」） -----------------

type PresetColor = {
  /** 項目名（「既定の色 1」…） */
  item: string
  /** 読み上げ名 */
  name: string
  /** 色（#RRGGBB、英字は大文字） */
  value: string
}

const COLORS: PresetColor[] = [
  { name: '赤', value: '#EF4444' },
  { name: 'オレンジ', value: '#F97316' },
  { name: '黄', value: '#EAB308' },
  { name: '黄緑', value: '#84CC16' },
  { name: '緑', value: '#22C55E' },
  { name: '青緑', value: '#14B8A6' },
  { name: '水色', value: '#06B6D4' },
  { name: '青', value: '#3B82F6' },
  { name: '藍', value: '#6366F1' },
  { name: '紫', value: '#A855F7' },
  { name: 'ピンク', value: '#EC4899' },
  { name: '茶', value: '#92400E' },
].map((c, i) => ({ ...c, item: `既定の色 ${i + 1}` }))

const colorOf = (name: string) => (COLORS.find((c) => c.name === name) as PresetColor).value
const RED = colorOf('赤')
const ORANGE = colorOf('オレンジ')

// ---- 固定するもの ------------------------------------------------------------

const TASKS_PATH = '/tasks'
const SETTINGS_PATH = '/settings'
/** 「今日」と現在の時刻（日本時間の 2026-10-11 10:00） */
const NOW = new Date('2026-10-11T01:00:00.000Z')

// ---- テストデータ（storage.md の値の構造に合わせる） -------------------------

/** n 番目のタスク。作成日時は、n が大きいほど新しい */
const task = (n: number, over: Partial<Task> = {}): Task => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name: `タスク ${n}`,
  color: RED,
  archived: false,
  createdAt: new Date(Date.UTC(2026, 8, 1, 0, n)).toISOString(),
  ...over,
})

const SPEC = task(1, { name: '仕様書を書く', color: RED })
const REVIEW = task(2, { name: '先月の振り返り', color: colorOf('紫'), archived: true })
const DESIGN = task(3, { name: '画面設計', color: colorOf('青') })
const SURVEY = task(4, { name: '旧サイトの調査', color: colorOf('茶'), archived: true })
const MAIL = task(5, { name: 'メールの返信', color: colorOf('緑') })

/** 使用中 3 件とアーカイブ済み 2 件が、交互に並ぶ */
const TASKS: Task[] = [SPEC, REVIEW, DESIGN, SURVEY, MAIL]
const ACTIVE = [SPEC, DESIGN, MAIL]
const ARCHIVED = [REVIEW, SURVEY]
const names = (tasks: Task[]) => tasks.map((t) => t.name)

/** tasks のうち、id が同じものを置き換えた配列 */
const replaced = (tasks: Task[], changed: Task) => tasks.map((t) => (t.id === changed.id ? changed : t))

/** 追加したタスクに期待する値。id と createdAt は、形だけを確かめる（作成日時の値は、別のケースで確かめる） */
const added = (name: string, color: string) => ({
  id: expect.stringMatching(UUID),
  name,
  color,
  archived: false,
  createdAt: expect.any(String),
})

// ---- 部品（番号はワイヤーフレームの data-no） -------------------------------

const ui = (page: Page) => ({
  heading: page.getByRole('heading', { name: 'タスク管理', exact: true }), // No.1
  newTask: page.getByRole('textbox', { name: '新しいタスクの名前', exact: true }), // No.2
  add: page.getByRole('button', { name: '追加', exact: true }), // No.4
  /** タブ（No.5）の中の、「使用中」（No.6）と「アーカイブ済み」（No.7） */
  activeTab: page.getByRole('tab', { name: '使用中', exact: true }),
  archivedTab: page.getByRole('tab', { name: 'アーカイブ済み', exact: true }),
  /** タスクのリスト（No.8）に並ぶ、すべての行のタスク名の入力欄。並び順は、リストの並び順 */
  rowNames: page.getByRole('textbox', { name: / の名前$/ }),
  /** その行のタスクの色。name は、その行のタスクの、保存されている名前 */
  color: (name: string) => page.getByRole('button', { name: `${name} の色を変更`, exact: true }), // No.9
  name: (name: string) => page.getByRole('textbox', { name: `${name} の名前`, exact: true }), // No.10
  archive: (name: string) => page.getByRole('button', { name: `${name} をアーカイブ`, exact: true }), // No.12
  unarchive: (name: string) => page.getByRole('button', { name: `${name} のアーカイブを解除`, exact: true }), // No.13
  /** すべての行の「アーカイブ」「アーカイブを解除」 */
  archiveButtons: page.getByRole('button', { name: / をアーカイブ$/ }),
  unarchiveButtons: page.getByRole('button', { name: / のアーカイブを解除$/ }),
  /** 色を選ぶ枠（No.14）の中の、既定の色（No.15〜26）。name は読み上げ名（「赤」…） */
  preset: (name: string) => page.getByRole('button', { name, exact: true }),
  otherColorLabel: page.getByText('その他の色', { exact: true }), // No.27
  otherColor: page.getByLabel('その他の色', { exact: true }), // No.28
  noData: page.getByText('タスクはありません', { exact: true }), // No.29
  /** エラー表示（No.3、No.11）は、タグが「実装時に決める」なので、メッセージの文言で探す */
  error: (message: string) => page.getByText(message, { exact: true }),
  /** 共通ヘッダーの「設定」のリンク。別の画面へ移る操作に使う */
  settingsLink: page.getByRole('link', { name: '設定', exact: true }),
})

type Ui = ReturnType<typeof ui>

// ---- ストレージの読み書き ----------------------------------------------------

/**
 * 画面を開く前に、ストレージに値を入れておく。入れなかったものは、値がない状態にする。
 * 入れるのは、このテストで最初にページを開いたときの 1 回だけ（再読み込みや遷移では入れ直さない）
 */
async function seed(page: Page, entries: [string, string][]) {
  await page.addInitScript((items) => {
    if (sessionStorage.getItem('__seeded')) return
    localStorage.clear()
    for (const [key, value] of items) localStorage.setItem(key, value)
    sessionStorage.setItem('__seeded', '1')
  }, entries)
}

/** ストレージの値を、JSON として読む（値がなければ null） */
async function read<T>(page: Page, key: string): Promise<T | null> {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k)
    return raw === null ? null : JSON.parse(raw)
  }, key)
}

/** タスク（STG-002）が、期待する値になるのを待つ */
async function expectTasks(page: Page, want: unknown[]) {
  await expect.poll(() => read<unknown[]>(page, STG.tasks)).toEqual(want)
}

// ---- 画面を開く -------------------------------------------------------------

type OpenOptions = {
  /** タスク（STG-002）に入れる値。省略すると TASKS。配列でない値や、形式に合わない要素も入れられる */
  tasks?: unknown
  /** true なら、タスク（STG-002）に値がない状態にする */
  noTasks?: boolean
  /** タスク（STG-002）に、そのまま入れる文字列（JSON として読めない値を入れるケースで使う） */
  rawTasks?: string
  /** URL の ? 以降（? を含む） */
  query?: string
  /** 先に開いておく画面のパス（ブラウザの履歴を確かめるケースで使う） */
  from?: string
}

/** ストレージに値を入れて、タスク管理画面を開く */
async function open(page: Page, opts: OpenOptions = {}) {
  await page.clock.install({ time: NOW })
  const value = opts.rawTasks ?? JSON.stringify(opts.tasks === undefined ? TASKS : opts.tasks)
  await seed(page, opts.noTasks ? [] : [[STG.tasks, value]])
  if (opts.from) await page.goto(opts.from)
  await page.goto(`${TASKS_PATH}${opts.query ?? ''}`)
  await expect(ui(page).heading).toBeVisible()
}

const ARCHIVED_QUERY = '?archived=true'

// ---- 確かめ方 ---------------------------------------------------------------

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const containing = (text: string) => new RegExp(escapeRegExp(text))

/** タスクのリストに、この名前のタスクが、この順に並んでいる */
async function expectRows(page: Page, want: string[]) {
  const rows = ui(page).rowNames
  await expect(rows).toHaveCount(want.length)
  for (const [i, name] of want.entries()) await expect(rows.nth(i)).toHaveValue(name)
}

/** 「使用中」のタブを選んでいる（使用中のタスクが並び、行のボタンは「アーカイブ」） */
async function expectActiveTab(page: Page, want: string[] = names(ACTIVE)) {
  await expectRows(page, want)
  await expect(ui(page).archiveButtons).toHaveCount(want.length)
  await expect(ui(page).unarchiveButtons).toHaveCount(0)
}

/** 「アーカイブ済み」のタブを選んでいる（アーカイブ済みのタスクが並び、行のボタンは「アーカイブを解除」） */
async function expectArchivedTab(page: Page, want: string[] = names(ARCHIVED)) {
  await expectRows(page, want)
  await expect(ui(page).unarchiveButtons).toHaveCount(want.length)
  await expect(ui(page).archiveButtons).toHaveCount(0)
}

/** URL が、タスク管理画面で、クエリ archived がこの値（null なら、付いていない） */
async function expectArchivedQuery(page: Page, want: string | null) {
  await expect(page).toHaveURL((url) => url.pathname === TASKS_PATH && url.searchParams.get('archived') === want)
}

/** 色を選ぶ枠を表示している（中の、既定の色とその他の色が見える） */
async function expectPickerOpen(page: Page) {
  await expect(ui(page).preset('赤')).toBeVisible()
  await expect(ui(page).otherColor).toBeVisible()
}

/** 色を選ぶ枠を表示していない */
async function expectPickerClosed(page: Page) {
  await expect(ui(page).preset('赤')).toBeHidden()
  await expect(ui(page).otherColor).toBeHidden()
}

/** その行のタスクの色のボタンを押して、色を選ぶ枠を表示する */
async function openPicker(page: Page, name: string) {
  await ui(page).color(name).click()
  await expectPickerOpen(page)
}

/** その他の色に入っている色。ブラウザは小文字にそろえるので、大文字・小文字を区別しない */
const colorValue = (color: string) => new RegExp(`^${escapeRegExp(color)}$`, 'i')

/**
 * その他の色で、色を選ぶ。ブラウザの色を選ぶ部品が起こすイベントをまねる。
 * finish が false なら、選んでいる途中（input イベントだけ）。true なら、選び終える（そのあとに change イベント）
 */
async function pickOtherColor(input: Locator, color: string, finish: boolean) {
  await input.evaluate(
    (el, arg) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(el, arg.color)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      if (arg.finish) el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    { color, finish },
  )
}

/** タスク名の入力欄に値を入れて、フォーカスを外す */
async function rename(input: ReturnType<Ui['name']>, value: string) {
  await input.fill(value)
  await input.blur()
}

/** 新しいタスクに値を入れて、「追加」を押す */
async function addTask(page: Page, value: string) {
  await ui(page).newTask.fill(value)
  await ui(page).add.click()
}

// ---- テスト -----------------------------------------------------------------

test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 1280, height: 720 } })

test.describe('SCR-003 タスク管理', () => {
  test.describe('冒頭の表・閲覧権限', () => {
    test('[document.title] タイマーが動作中でないとき、「タスク管理」にする', async ({ page }) => {
      await open(page)
      await expect(page).toHaveTitle('タスク管理')
    })

    test('[閲覧権限 利用者] タスク管理画面を開ける', async ({ page }) => {
      await open(page)
      await expect(page).toHaveURL((url) => url.pathname === TASKS_PATH)
      await expect(ui(page).heading).toBeVisible()
    })

    test('[Enter キーで動くボタン] 新しいタスクにフォーカスがあるときに Enter キーを押すと、「追加」を押したときと同じく、タスクを足して保存する', async ({ page }) => {
      await open(page)
      await ui(page).newTask.fill('レビュー')
      await ui(page).newTask.press('Enter')
      await expectTasks(page, [...TASKS, added('レビュー', ORANGE)])
      await expectActiveTab(page, [...names(ACTIVE), 'レビュー'])
    })

    test('[Enter キーで動くボタン / タスク名] タスク名にフォーカスがあるときに Enter キーを押しても、何も起きない（フォーカスは外れず、保存も追加もしない。フォーカスを外すと保存する）', async ({ page }) => {
      await open(page)
      const input = ui(page).name(SPEC.name)
      await input.fill('仕様書を直す')
      await input.press('Enter')
      await expect(input).toBeFocused()
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
      // フォーカスを外すと、名前だけが変わる（タスクは増えていない）
      await input.blur()
      await expectTasks(page, replaced(TASKS, { ...SPEC, name: '仕様書を直す' }))
    })
  })

  test.describe('クエリパラメータ', () => {
    test('[クエリパラメータ archived] archived=true を付けて開くと、「アーカイブ済み」のタブを選ぶ', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await expectArchivedTab(page)
    })

    test('[クエリパラメータ archived 省略] archived を省略して開くと、「使用中」のタブを選ぶ', async ({ page }) => {
      await open(page)
      await expectActiveTab(page)
    })

    const notTrueCases = [
      { name: 'false', query: '?archived=false' },
      { name: '大文字の TRUE', query: '?archived=TRUE' },
      { name: '1', query: '?archived=1' },
      { name: '空', query: '?archived=' },
      { name: '後ろに空白の付いた true', query: '?archived=true%20' },
      { name: '後ろに文字の付いた truex', query: '?archived=truex' },
    ]
    for (const c of notTrueCases) {
      test(`[クエリパラメータ archived true と完全に一致しない値] archived を${c.name}にして開くと、省略したときと同じく「使用中」のタブを選ぶ`, async ({ page }) => {
        await open(page, { query: c.query })
        await expectActiveTab(page)
      })

      test(`[初期表示 / URL クエリを整える] archived を${c.name}にして開くと、URL クエリから archived を消す`, async ({ page }) => {
        await open(page, { query: c.query })
        await expectActiveTab(page)
        await expectArchivedQuery(page, null)
      })
    }

    test('[初期表示 / URL クエリを整える（変えるところがないとき）] archived=true を付けて開くと、URL クエリを変えない', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await expectArchivedTab(page)
      await expect(page).toHaveURL((url) => url.pathname === TASKS_PATH && url.search === ARCHIVED_QUERY)
    })

    test('[初期表示 / URL クエリを整える / ブラウザの履歴] ブラウザの履歴を置き換えるので、ブラウザの戻るで、整える前の URL クエリではなく、この画面を開く前に見ていた設定画面に戻る', async ({ page }) => {
      await open(page, { from: SETTINGS_PATH, query: '?archived=false' })
      await expectArchivedQuery(page, null)
      await page.goBack()
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
    })
  })

  test.describe('画面項目の条件・値', () => {
    test('[見出し 表示内容] 「タスク管理」と表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).heading).toBeVisible()
    })

    test('[新しいタスク 初期値 / 読み上げ名] 「新しいタスクの名前」という名前で見つかり、空で表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).newTask).toHaveValue('')
    })

    test('[新しいタスク プレースホルダー] 「新しいタスクを追加」を表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).newTask).toHaveAttribute('placeholder', '新しいタスクを追加')
    })

    test('[「追加」ボタン 表示条件] タスクが 0 件でも表示する', async ({ page }) => {
      await open(page, { tasks: [] })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).add).toBeVisible()
      await expect(ui(page).add).toBeEnabled()
    })

    test('[タブ 表示条件] タスクが 0 件でも、「使用中」と「アーカイブ済み」のタブを表示する', async ({ page }) => {
      await open(page, { tasks: [] })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).activeTab).toBeVisible()
      await expect(ui(page).archivedTab).toBeVisible()
    })

    test('[タスクのリスト 表示内容] 「使用中」のタブでは、タスクのうち archived が false のものだけを表示する', async ({ page }) => {
      await open(page)
      await expectRows(page, names(ACTIVE))
    })

    test('[タスクのリスト 表示内容（「アーカイブ済み」）] 「アーカイブ済み」のタブでは、タスクのうち archived が true のものだけを表示する', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await expectRows(page, names(ARCHIVED))
    })

    test('[タスクのリスト 並び順] 作成日時で並べ直さず、保存されている配列の並び順のまま表示する', async ({ page }) => {
      // 配列の並び順と、作成日時の順が違う
      const later = task(9, { name: 'あとで作ったタスク' })
      const earlier = task(1, { name: '先に作ったタスク' })
      await open(page, { tasks: [later, earlier] })
      await expectRows(page, [later.name, earlier.name])
    })

    test('[タスクのリスト 表示条件 / データなしの表示 表示条件] 「使用中」のタブに表示するタスクが 0 件のとき、リストを表示せず、「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: ARCHIVED })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    test('[タスクのリスト 表示条件 / データなしの表示 表示条件（「アーカイブ済み」）] 「アーカイブ済み」のタブに表示するタスクが 0 件のとき、リストを表示せず、同じ文言の「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: ACTIVE, query: ARCHIVED_QUERY })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    test('[データなしの表示 表示条件] 選んでいるタブに表示するタスクが 1 件以上のとき、「タスクはありません」を表示しない', async ({ page }) => {
      await open(page, { tasks: [SPEC] })
      await expectRows(page, [SPEC.name])
      await expect(ui(page).noData).toBeHidden()
    })

    test('[タスク名 初期値 / 読み上げ名] 行ごとに、「{タスクの名前} の名前」という名前で見つかり、その行のタスクの名前を入れて表示する', async ({ page }) => {
      await open(page)
      for (const t of ACTIVE) await expect(ui(page).name(t.name)).toHaveValue(t.name)
    })

    test('[タスクの色 表示条件 / 読み上げ名] 行ごとに、「{タスクの名前} の色を変更」という名前で見つかる（「使用中」のタブ）', async ({ page }) => {
      await open(page)
      for (const t of ACTIVE) await expect(ui(page).color(t.name)).toBeVisible()
    })

    test('[タスクの色 表示条件 / 読み上げ名（「アーカイブ済み」）] 「アーカイブ済み」のタブでも、行ごとに、「{タスクの名前} の色を変更」という名前で見つかる', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      for (const t of ARCHIVED) await expect(ui(page).color(t.name)).toBeVisible()
    })

    test.fixme('[タスクの色 表示内容 / 既定の色 表示内容] タスクの色のボタンは、その行のタスクの色の見本を、既定の色のボタンは、それぞれの色の見本を表示する（見本の色には、見た目のほかに目印がないため、自動では確かめられない。保存される色は [既定の色のボタン押下]、枠を開き直したときの色は [タスクの色のボタン押下] で確かめる）', async () => {})

    test('[「アーカイブ」ボタン 表示条件 / 読み上げ名] 「使用中」のタブを選んでいるとき、行ごとに、文言が「アーカイブ」で、「{タスクの名前} をアーカイブ」という名前のボタンを表示する', async ({ page }) => {
      await open(page)
      for (const t of ACTIVE) await expect(ui(page).archive(t.name)).toHaveText('アーカイブ')
    })

    test('[「アーカイブ」ボタン 表示条件] 「アーカイブ済み」のタブを選んでいるときは、表示しない', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await expectRows(page, names(ARCHIVED))
      await expect(ui(page).archiveButtons).toHaveCount(0)
    })

    test('[「アーカイブを解除」ボタン 表示条件 / 読み上げ名] 「アーカイブ済み」のタブを選んでいるとき、行ごとに、文言が「アーカイブを解除」で、「{タスクの名前} のアーカイブを解除」という名前のボタンを表示する', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      for (const t of ARCHIVED) await expect(ui(page).unarchive(t.name)).toHaveText('アーカイブを解除')
    })

    test('[「アーカイブを解除」ボタン 表示条件] 「使用中」のタブを選んでいるときは、表示しない', async ({ page }) => {
      await open(page)
      await expectRows(page, names(ACTIVE))
      await expect(ui(page).unarchiveButtons).toHaveCount(0)
    })

    for (const c of COLORS) {
      test(`[${c.item} 表示条件 / 読み上げ名] 色を選ぶ枠を表示しているとき、「${c.name}」という名前のボタンを表示する`, async ({ page }) => {
        await open(page)
        await ui(page).color(SPEC.name).click()
        await expect(ui(page).preset(c.name)).toBeVisible()
        await expect(ui(page).preset(c.name)).toBeEnabled()
      })
    }

    test('[その他の色の見出し 表示内容 / 表示条件] 色を選ぶ枠を表示しているとき、「その他の色」と表示する', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await expect(ui(page).otherColorLabel).toBeVisible()
    })

    test('[その他の色 読み上げ名] 色を選ぶ枠を表示しているとき、「その他の色」という名前の、色の入力欄が見つかる', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await expect(ui(page).otherColor).toHaveAttribute('type', 'color')
      await expect(ui(page).otherColor).toBeEnabled()
    })

    test('[新しいタスクのエラー 表示条件 / タスク名のエラー 表示条件 / 色を選ぶ枠 表示条件] 初期表示では、エラー表示も、色を選ぶ枠（既定の色、「その他の色」）も表示しない', async ({ page }) => {
      await open(page)
      await expectRows(page, names(ACTIVE))
      await expect(ui(page).error(NAME_REQUIRED)).toBeHidden()
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
      await expectPickerClosed(page)
      await expect(ui(page).otherColorLabel).toBeHidden()
    })
  })

  test.describe('初期表示時の処理', () => {
    test('[初期表示 / タスク 値がない] タスクに値がないとき、0 件として扱い、「使用中」のタブに「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { noTasks: true })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    test('[初期表示 / タスク 値がない（「アーカイブ済み」）] タスクに値がないとき、「アーカイブ済み」のタブにも「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { noTasks: true, query: ARCHIVED_QUERY })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    const unreadableCases = [
      { name: '途中で切れた JSON', raw: '[{"id":' },
      { name: 'JSON でない文字列', raw: 'タスク' },
      { name: '空の文字列', raw: '' },
    ]
    for (const c of unreadableCases) {
      test(`[初期表示 / タスク JSON として読めない] タスクの値が${c.name}のとき、値がないときと同じく 0 件として扱い、「タスクはありません」を表示する`, async ({ page }) => {
        await open(page, { rawTasks: c.raw })
        await expect(ui(page).noData).toBeVisible()
        await expect(ui(page).rowNames).toHaveCount(0)
      })
    }

    const notArrayCases: { name: string; value: unknown }[] = [
      { name: 'オブジェクト', value: { 0: SPEC } },
      { name: '文字列', value: 'tasks' },
      { name: '数値', value: 1 },
      { name: 'null', value: null },
    ]
    for (const c of notArrayCases) {
      test(`[初期表示 / タスク 配列でない] タスクの値が${c.name}のとき、0 件として扱い、「タスクはありません」を表示する`, async ({ page }) => {
        await open(page, { tasks: c.value })
        await expect(ui(page).noData).toBeVisible()
        await expect(ui(page).rowNames).toHaveCount(0)
      })
    }

    test('[初期表示 / タスク 0 件の配列] タスクの値が空の配列のとき、「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: [] })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    /** 形式に合わない要素（必須のフィールドがない、型が違う、name が空か空白だけ、color が #RRGGBB の形でない、createdAt が日時として読めない） */
    const broken = task(8, { name: '形式に合わないタスク' })
    const without = (field: keyof Task) => {
      const { [field]: _removed, ...rest } = broken
      return rest
    }
    const brokenCases: { name: string; value: unknown }[] = [
      ...(['id', 'name', 'color', 'archived', 'createdAt'] as const).map((field) => ({
        name: `${field} がない要素`,
        value: without(field),
      })),
      { name: 'id が数値の要素', value: { ...broken, id: 8 } },
      { name: 'name が数値の要素', value: { ...broken, name: 123 } },
      { name: 'color が数値の要素', value: { ...broken, color: 0 } },
      { name: 'archived が文字列の "false" の要素', value: { ...broken, archived: 'false' } },
      { name: 'createdAt が数値の要素', value: { ...broken, createdAt: 1790000000000 } },
      { name: 'archived が数値の 0 の要素', value: { ...broken, archived: 0 } },
      { name: 'name が空の要素', value: { ...broken, name: '' } },
      { name: 'name が半角の空白だけの要素', value: { ...broken, name: '   ' } },
      { name: 'name が全角の空白だけの要素', value: { ...broken, name: '　　' } },
      { name: 'color が #RGB の 3 桁の要素', value: { ...broken, color: '#F00' } },
      { name: 'color が # のない 6 桁の要素', value: { ...broken, color: 'EF4444' } },
      { name: 'color が 16 進数でない 6 桁（#GGGGGG）の要素', value: { ...broken, color: '#GGGGGG' } },
      { name: 'color が 7 桁の要素', value: { ...broken, color: '#EF44444' } },
      { name: 'color が色の名前（red）の要素', value: { ...broken, color: 'red' } },
      { name: 'createdAt が日時でない文字列の要素', value: { ...broken, createdAt: 'きのう' } },
      { name: 'null の要素', value: null },
      { name: '文字列の要素', value: '形式に合わないタスク' },
    ]
    for (const c of brokenCases) {
      test(`[初期表示 / タスク 形式に合わない要素] ${c.name}は、ないものとして扱い、ほかのタスクだけを表示する`, async ({ page }) => {
        await open(page, { tasks: [SPEC, c.value, DESIGN] })
        await expectRows(page, [SPEC.name, DESIGN.name])
      })
    }

    /** 内容の範囲は確かめないので、形式に合うものとして使う要素 */
    const usableCases: { name: string; value: Task }[] = [
      { name: 'name が 1 文字の要素', value: task(8, { name: 'あ' }) },
      { name: 'name の前後に空白がある要素', value: task(8, { name: ' 前後に空白 ' }) },
      { name: 'name が 51 文字の要素', value: task(8, { name: 'あ'.repeat(51) }) },
      { name: 'id が UUID の形でない要素', value: task(8, { id: 'task-8', name: 'UUID でないタスク' }) },
      { name: 'color の英字が小文字（#ef4444）の要素', value: task(8, { name: '小文字の色のタスク', color: '#ef4444' }) },
    ]
    for (const c of usableCases) {
      test(`[初期表示 / タスク 形式に合う要素] ${c.name}は、形式に合うものとして使い、ほかのタスクと並べて、保存されている名前のまま表示する`, async ({ page }) => {
        await open(page, { tasks: [SPEC, c.value, DESIGN] })
        await expectRows(page, [SPEC.name, c.value.name, DESIGN.name])
      })
    }

    test('[初期表示 / タスク 形式に合う要素 / タスクの色のボタン押下] color の英字が小文字（#ef4444）の要素も、色を選ぶ枠を表示すると、その他の色に、その色を入れる', async ({ page }) => {
      const lower = task(8, { name: '小文字の色のタスク', color: '#12abef' })
      await open(page, { tasks: [lower] })
      await openPicker(page, lower.name)
      await expect(ui(page).otherColor).toHaveValue(colorValue('#12ABEF'))
    })

    test('[初期表示 / タスク 形式に合わない要素だけ] 形式に合わない要素しかないとき、0 件として扱い、「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: [without('name'), null] })
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })
  })

  test.describe('「追加」ボタン押下', () => {
    test('[「追加」ボタン押下 / 保存] タスクを 1 件、配列の最後に足して保存する（name は入力値、archived は false、id は新しい UUID、color は #RRGGBB の大文字）', async ({ page }) => {
      await open(page)
      await addTask(page, 'レビュー')
      await expectTasks(page, [...TASKS, added('レビュー', ORANGE)])
      const saved = (await read<Task[]>(page, STG.tasks)) as Task[]
      const last = saved[saved.length - 1]
      expect(TASKS.map((t) => t.id)).not.toContain(last.id)
      expect(last.color).toMatch(/^#[0-9A-F]{6}$/)
    })

    test('[「追加」ボタン押下 / 保存（createdAt）] createdAt は、現在の時刻（2026-10-11 10:00 の日本時間）を、UTC の ISO 8601 で保存する', async ({ page }) => {
      await open(page)
      await addTask(page, 'レビュー')
      await expectTasks(page, [...TASKS, added('レビュー', ORANGE)])
      const saved = (await read<Task[]>(page, STG.tasks)) as Task[]
      const { createdAt } = saved[saved.length - 1]
      expect(createdAt).toMatch(/^2026-10-11T01:0\d:\d{2}(\.\d+)?Z$/)
      // 時計は止めていないので、「今」から 1 分以内であることを確かめる
      const elapsed = new Date(createdAt).getTime() - NOW.getTime()
      expect(elapsed).toBeGreaterThanOrEqual(0)
      expect(elapsed).toBeLessThan(60_000)
    })

    test('[「追加」ボタン押下 / 保存（id）] 続けて 2 件を足すと、それぞれに違う id を作る', async ({ page }) => {
      await open(page, { tasks: [] })
      await addTask(page, '1 件目')
      await expectRows(page, ['1 件目'])
      await addTask(page, '2 件目')
      await expectTasks(page, [added('1 件目', RED), added('2 件目', ORANGE)])
      const saved = (await read<Task[]>(page, STG.tasks)) as Task[]
      expect(saved[0].id).not.toBe(saved[1].id)
    })

    test('[「追加」ボタン押下 / タスク 値がない] タスクに値がない状態で足すと、足した 1 件だけの配列を保存する', async ({ page }) => {
      await open(page, { noTasks: true })
      await addTask(page, 'レビュー')
      await expectTasks(page, [added('レビュー', RED)])
    })

    test('[「追加」ボタン押下 / タスク JSON として読めない] タスクの値が JSON として読めない状態で足すと、値がないときと同じく、足した 1 件だけの配列を保存する', async ({ page }) => {
      await open(page, { rawTasks: '[{"id":' })
      await expect(ui(page).noData).toBeVisible()
      await addTask(page, 'レビュー')
      await expectTasks(page, [added('レビュー', RED)])
    })

    test('[「追加」ボタン押下 / 新しいタスクを空にする] 足したあと、新しいタスクを空にする', async ({ page }) => {
      await open(page)
      await addTask(page, 'レビュー')
      await expectRows(page, [...names(ACTIVE), 'レビュー'])
      await expect(ui(page).newTask).toHaveValue('')
    })

    test('[「追加」ボタン押下 / 「使用中」のタブを選んでいるとき] 足したタスクを、リストの最後に足して表示する', async ({ page }) => {
      await open(page)
      await addTask(page, 'レビュー')
      await expectActiveTab(page, [...names(ACTIVE), 'レビュー'])
      await expectArchivedQuery(page, null)
    })

    test('[「追加」ボタン押下 / 「使用中」のタブを選んでいるとき（0 件）] 「タスクはありません」を表示していたら非表示にし、リストを表示する', async ({ page }) => {
      await open(page, { tasks: ARCHIVED })
      await expect(ui(page).noData).toBeVisible()
      await addTask(page, 'レビュー')
      await expectActiveTab(page, ['レビュー'])
      await expect(ui(page).noData).toBeHidden()
    })

    test('[「追加」ボタン押下 / 「アーカイブ済み」のタブを選んでいるとき] 「使用中」のタブに切り替え、URL クエリの archived を消して、足したタスクを最後に並べた使用中のタスクを表示する', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await expectArchivedTab(page)
      await addTask(page, 'レビュー')
      await expectActiveTab(page, [...names(ACTIVE), 'レビュー'])
      await expectArchivedQuery(page, null)
      await expectTasks(page, [...TASKS, added('レビュー', ORANGE)])
    })

    test('[「追加」ボタン押下 / 「アーカイブ済み」のタブを選んでいるとき / ブラウザの履歴] タブの切り替えと同じく、ブラウザの履歴に追加するので、ブラウザの戻るで「アーカイブ済み」のタブに戻る', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await expectArchivedTab(page)
      await addTask(page, 'レビュー')
      await expectArchivedQuery(page, null)
      await page.goBack()
      await expectArchivedQuery(page, 'true')
      await expectArchivedTab(page)
    })

    // ---- 色の自動設定 ----

    /** 既定の 12 色を、1 件ずつ使っている使用中のタスク */
    const oneEach = COLORS.map((c, i) => task(i + 1, { color: c.value }))
    const colorCases: { name: string; tasks: Task[]; want: string }[] = [
      { name: 'タスクが 0 件のとき', tasks: [], want: '赤' },
      { name: '使用中のタスクが赤を 1 件使っているとき', tasks: [task(1, { color: RED })], want: 'オレンジ' },
      { name: '赤を使っているのが、アーカイブ済みのタスクだけのとき', tasks: [task(1, { color: RED, archived: true })], want: '赤' },
      {
        name: '使用中のタスクが赤を、アーカイブ済みのタスクがオレンジを使っているとき',
        tasks: [task(1, { color: RED }), task(2, { color: ORANGE, archived: true })],
        want: 'オレンジ',
      },
      { name: '12 色のうち、黄だけが使われていないとき', tasks: oneEach.filter((t) => t.color !== colorOf('黄')), want: '黄' },
      { name: '12 色のうち、茶だけが使われていないとき', tasks: oneEach.filter((t) => t.color !== colorOf('茶')), want: '茶' },
      { name: '12 色すべてが 1 件ずつ使われているとき（同じ数なので、並び順で先のもの）', tasks: oneEach, want: '赤' },
      { name: '赤が 2 件、ほかの 11 色が 1 件ずつ使われているとき', tasks: [...oneEach, task(13, { color: RED })], want: 'オレンジ' },
      {
        name: '青緑だけが 1 件で、ほかの 11 色が 2 件ずつ使われているとき',
        tasks: [...oneEach, ...oneEach.filter((t) => t.color !== colorOf('青緑')).map((t, i) => task(20 + i, { color: t.color }))],
        want: '青緑',
      },
      { name: '使用中のタスクが、既定の 12 色にない色だけを使っているとき', tasks: [task(1, { color: '#123456' })], want: '赤' },
    ]
    for (const c of colorCases) {
      test(`[「追加」ボタン押下 / 色の自動設定] ${c.name}、足したタスクの color を${c.want}（${colorOf(c.want)}）にする`, async ({ page }) => {
        await open(page, { tasks: c.tasks })
        await addTask(page, 'レビュー')
        await expectTasks(page, [...c.tasks, added('レビュー', colorOf(c.want))])
      })
    }

    // ---- バリデーション ----

    const blankCases = [
      { name: '空', value: '' },
      { name: '半角の空白だけ', value: '   ' },
      { name: '全角の空白だけ', value: '　　' },
    ]
    for (const c of blankCases) {
      test(`[新しいタスク 必須] 新しいタスクを${c.name}にして「追加」を押すと、${q(NAME_REQUIRED)}を表示し、保存しない`, async ({ page }) => {
        await open(page)
        await addTask(page, c.value)
        await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
        expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
        await expectRows(page, names(ACTIVE))
      })
    }

    test(`[新しいタスク 50 文字以内] 新しいタスクに 51 文字を入れて「追加」を押すと、${q(NAME_TOO_LONG)}を表示し、保存せず、入力値も残す`, async ({ page }) => {
      await open(page)
      await addTask(page, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
      await expect(ui(page).newTask).toHaveValue('あ'.repeat(51))
    })

    test('[新しいタスク 50 文字以内 境目] 新しいタスクに 50 文字ちょうどを入れて「追加」を押すと、エラーを表示せず、その名前で保存する', async ({ page }) => {
      await open(page)
      await addTask(page, 'あ'.repeat(50))
      await expectTasks(page, [...TASKS, added('あ'.repeat(50), ORANGE)])
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
    })

    test('[新しいタスク 50 文字以内 前後の空白 / 共通ルール 文字数のバリデーション時に前後の空白を取り除くか] 前後の空白を除いて 50 文字なら、エラーにならず、空白を除いた名前で保存する', async ({ page }) => {
      await open(page)
      await addTask(page, `  ${'あ'.repeat(50)}　`)
      await expectTasks(page, [...TASKS, added('あ'.repeat(50), ORANGE)])
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
    })

    test('[新しいタスク 50 文字以内 前後の空白 境目] 前後の空白を除いて 51 文字なら、エラーにする', async ({ page }) => {
      await open(page)
      await addTask(page, ` ${'あ'.repeat(51)} `)
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    test('[「追加」ボタン押下 / 保存（前後の空白） / 共通ルール 送信時に前後の空白を取り除くか] 前後に半角・全角の空白を付けて足すと、空白を除いた名前を保存し、名前の途中の空白は残す', async ({ page }) => {
      await open(page)
      await addTask(page, ' 　設計 レビュー　 ')
      await expectTasks(page, [...TASKS, added('設計 レビュー', ORANGE)])
      await expectRows(page, [...names(ACTIVE), '設計 レビュー'])
    })

    test('[新しいタスク エラーの消去] エラーのあと、正しい値にして「追加」を押すと、新しいタスクのエラー表示を非表示にして、タスクを足す', async ({ page }) => {
      await open(page)
      await addTask(page, '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      await addTask(page, 'レビュー')
      await expectRows(page, [...names(ACTIVE), 'レビュー'])
      await expect(ui(page).error(NAME_REQUIRED)).toBeHidden()
    })

    test('[新しいタスク エラーの切り替え] 「必須」のエラーのあと、51 文字を入れて「追加」を押すと、エラー表示を「50 文字以内」のメッセージに変える', async ({ page }) => {
      await open(page)
      await addTask(page, '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      await addTask(page, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await expect(ui(page).error(NAME_REQUIRED)).toBeHidden()
    })

    test('[新しいタスク 同じ名前] すでにあるタスクと同じ名前でも、エラーにせずに足す（名前の重複は、バリデーションの表にない）', async ({ page }) => {
      await open(page, { tasks: [SPEC] })
      await addTask(page, SPEC.name)
      await expectTasks(page, [SPEC, added(SPEC.name, ORANGE)])
    })
  })

  test.describe('タブの切り替え', () => {
    test('[タブの切り替え / 「アーカイブ済み」] 「アーカイブ済み」のタブを押すと、URL クエリの archived を true にし、アーカイブ済みのタスクを表示する', async ({ page }) => {
      await open(page)
      await expectActiveTab(page)
      await ui(page).archivedTab.click()
      await expectArchivedQuery(page, 'true')
      await expectArchivedTab(page)
    })

    test('[タブの切り替え / 「使用中」] 「使用中」のタブを押すと、URL クエリの archived を消し、使用中のタスクを表示する', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await expectArchivedTab(page)
      await ui(page).activeTab.click()
      await expectArchivedQuery(page, null)
      await expectActiveTab(page)
    })

    test('[タブの切り替え / ブラウザの履歴] ブラウザの履歴に追加するので、ブラウザの戻るで、切り替える前のタブに戻る', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedQuery(page, 'true')
      await page.goBack()
      await expectArchivedQuery(page, null)
      await expectActiveTab(page)
    })

    test('[タブの切り替え / すでに選んでいるタブ（「使用中」）] 選んでいる「使用中」のタブを押しても、ブラウザの履歴に追加しない（そのあとタブを切り替えて、戻るを 2 回押すと、この画面を開く前の設定画面に戻る）', async ({ page }) => {
      await open(page, { from: SETTINGS_PATH })
      await expectActiveTab(page)
      await ui(page).activeTab.click()
      await ui(page).archivedTab.click()
      await expectArchivedQuery(page, 'true')
      await page.goBack()
      await expectArchivedQuery(page, null)
      await page.goBack()
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
    })

    test('[タブの切り替え / すでに選んでいるタブ（「アーカイブ済み」）] 選んでいる「アーカイブ済み」のタブを押しても、ブラウザの履歴に追加しない（そのあとタブを切り替えて、戻るを 2 回押すと、この画面を開く前の設定画面に戻る）', async ({ page }) => {
      await open(page, { from: SETTINGS_PATH, query: ARCHIVED_QUERY })
      await expectArchivedTab(page)
      await ui(page).archivedTab.click()
      await ui(page).activeTab.click()
      await expectArchivedQuery(page, null)
      await page.goBack()
      await expectArchivedQuery(page, 'true')
      await page.goBack()
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
    })

    test('[タブの切り替え / データなしの表示] 切り替えた先のタブに表示するタスクが 0 件なら、リストを非表示にして「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: ACTIVE })
      await expectActiveTab(page)
      await ui(page).archivedTab.click()
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    test('[タブの切り替え / データなしの表示（戻る側）] 「タスクはありません」を表示しているタブから、タスクが 1 件以上あるタブに切り替えると、「タスクはありません」を非表示にしてリストを表示する', async ({ page }) => {
      await open(page, { tasks: ACTIVE, query: ARCHIVED_QUERY })
      await expect(ui(page).noData).toBeVisible()
      await ui(page).activeTab.click()
      await expectActiveTab(page)
      await expect(ui(page).noData).toBeHidden()
    })

    test('[タブの切り替え / 新しいタスクの入力途中の値] 新しいタスクに入力途中の値があっても、タブを切り替えたあと、そのまま残す', async ({ page }) => {
      await open(page)
      await ui(page).newTask.fill('書きかけ')
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await expect(ui(page).newTask).toHaveValue('書きかけ')
    })

    test('[タブの切り替え / 新しいタスクのエラーの消去] 新しいタスクのエラーを表示したあとタブを切り替えると、エラー表示を非表示にし、入力した値は残す', async ({ page }) => {
      await open(page)
      await addTask(page, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
      await expect(ui(page).newTask).toHaveValue('あ'.repeat(51))
      await expect(ui(page).newTask).toHaveAccessibleDescription('')
    })

    test('[タブの切り替え / すでに選んでいるタブ / 新しいタスクのエラー] 新しいタスクのエラーを表示したあと、すでに選んでいるタブを押しても、エラー表示は消さない', async ({ page }) => {
      await open(page)
      await addTask(page, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await ui(page).activeTab.click()
      await expectActiveTab(page)
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
    })

    test('[タブの切り替え / 一覧を作り直す] 保存されていないタスク名の値と、行のエラー表示は、タブを切り替えると残らない（もとのタブに戻すと、保存されている名前を、エラーなしで表示する）', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
      await ui(page).activeTab.click()
      await expectActiveTab(page)
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
      await expect(ui(page).name(SPEC.name)).toHaveAccessibleDescription('')
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    test('[タブの切り替え / 保存しない] タブを切り替えても、タスクは書き換えない', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })
  })

  test.describe('タスクの色のボタン押下', () => {
    test('[タスクの色のボタン押下 / 表示] タスクの色のボタンを押すと、色を選ぶ枠（既定の 12 色と「その他の色」）を表示する', async ({ page }) => {
      await open(page)
      await ui(page).color(SPEC.name).click()
      for (const c of COLORS) await expect(ui(page).preset(c.name)).toBeVisible()
      await expect(ui(page).otherColorLabel).toBeVisible()
      await expect(ui(page).otherColor).toBeVisible()
    })

    test('[タスクの色のボタン押下 / その他の色 初期値] 色を選ぶ枠を表示するとき、その他の色に、押した行のタスクの色を入れる', async ({ page }) => {
      await open(page)
      await openPicker(page, DESIGN.name)
      await expect(ui(page).otherColor).toHaveValue(colorValue(DESIGN.color))
    })

    test('[タスクの色のボタン押下 / その他の色 初期値（既定の 12 色にない色）] タスクの色が既定の 12 色にない色でも、その他の色に、その色を入れる', async ({ page }) => {
      const custom = task(1, { name: '特別な色のタスク', color: '#12ABEF' })
      await open(page, { tasks: [custom] })
      await openPicker(page, custom.name)
      await expect(ui(page).otherColor).toHaveValue(colorValue('#12ABEF'))
    })

    test('[タスクの色のボタン押下 / 表示している行をもう一度押す] 色を選ぶ枠を表示している行のボタンをもう一度押すと、枠を非表示にする（表示し直さない）', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).color(SPEC.name).click()
      await expectPickerClosed(page)
    })

    test('[タスクの色のボタン押下 / 非表示のあと、もう一度押す] 枠を非表示にしたあと、同じ行のボタンをもう一度押すと、枠を表示する', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).color(SPEC.name).click()
      await expectPickerClosed(page)
      await ui(page).color(SPEC.name).click()
      await expectPickerOpen(page)
    })

    test('[タスクの色のボタン押下 / ほかの行に表示しているとき / 色を選ぶ枠 同時に表示するのは 1 つだけ] ほかの行のボタンを押すと、前の枠を非表示にして、押した行の枠だけを表示する（その他の色は、押した行のタスクの色）', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).color(DESIGN.name).click()
      await expect(ui(page).otherColor).toHaveValue(colorValue(DESIGN.color))
      // 枠は 1 つだけ（既定の色も、その他の色も、1 つずつ）
      await expect(ui(page).preset('赤')).toHaveCount(1)
      await expect(ui(page).otherColor).toHaveCount(1)
    })

    test('[タスクの色のボタン押下 / ほかの行に表示しているとき（色を選ぶ）] ほかの行のボタンを押したあとに既定の色を選ぶと、あとから押した行のタスクの色だけを変える', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).color(DESIGN.name).click()
      await expect(ui(page).otherColor).toHaveValue(colorValue(DESIGN.color))
      await ui(page).preset('ピンク').click()
      await expectTasks(page, replaced(TASKS, { ...DESIGN, color: colorOf('ピンク') }))
    })

    test('[タスクの色のボタン押下 / 「アーカイブ済み」] 「アーカイブ済み」のタブでも、タスクの色のボタンを押すと、色を選ぶ枠を表示し、色を変えられる', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await openPicker(page, REVIEW.name)
      await expect(ui(page).otherColor).toHaveValue(colorValue(REVIEW.color))
      await ui(page).preset('水色').click()
      await expectTasks(page, replaced(TASKS, { ...REVIEW, color: colorOf('水色') }))
    })

    test('[タスクの色のボタン押下 / 保存しない] 色を選ぶ枠を表示しただけでは、タスクは書き換えない', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })
  })

  test.describe('タスク名の入力欄からフォーカスが外れる', () => {
    test('[タスク名の入力欄からフォーカスが外れる / 保存] 名前を書き換えてフォーカスを外すと、その行のタスクの name だけを変えて保存し、入力欄にもその名前を入れる', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), '仕様書を直す')
      await expectTasks(page, replaced(TASKS, { ...SPEC, name: '仕様書を直す' }))
      await expect(ui(page).name('仕様書を直す')).toHaveValue('仕様書を直す')
      await expectRows(page, ['仕様書を直す', DESIGN.name, MAIL.name])
    })

    test('[タスク名の入力欄からフォーカスが外れる / 保存（前後の空白） / 共通ルール 送信時に前後の空白を取り除くか] 前後に半角・全角の空白を付けてフォーカスを外すと、空白を除いた名前を保存し、入力欄にも、空白を除いた名前を入れる', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), ' 　仕様書を 直す　 ')
      await expectTasks(page, replaced(TASKS, { ...SPEC, name: '仕様書を 直す' }))
      await expect(ui(page).name('仕様書を 直す')).toHaveValue('仕様書を 直す')
    })

    test('[タスク名の入力欄からフォーカスが外れる / 保存（「アーカイブ済み」）] 「アーカイブ済み」のタブでも、名前を書き換えてフォーカスを外すと、その行のタスクの name だけを変えて保存する', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await rename(ui(page).name(REVIEW.name), '9 月の振り返り')
      await expectTasks(page, replaced(TASKS, { ...REVIEW, name: '9 月の振り返り' }))
      await expectArchivedTab(page, ['9 月の振り返り', SURVEY.name])
    })

    test('[タスク名の入力欄からフォーカスが外れる / 保存されている名前と同じ] 保存されている名前の前後に空白を付けただけでフォーカスを外すと、入力欄を保存されている名前に戻す（保存はしない）', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), `  ${SPEC.name}　`)
      await expect(ui(page).name(SPEC.name)).toHaveValue(SPEC.name)
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    test('[タスク名の入力欄からフォーカスが外れる / 保存されている名前と同じ / タスク名 エラーの消去] エラーを表示したあと、保存されている名前に戻してフォーカスを外すと、その行のエラー表示を非表示にする', async ({ page }) => {
      await open(page)
      const input = ui(page).name(SPEC.name)
      await rename(input, '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      await rename(input, SPEC.name)
      await expect(ui(page).error(NAME_REQUIRED)).toBeHidden()
      await expect(input).toHaveValue(SPEC.name)
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    test(`[タスク名 必須] タスク名を空にしてフォーカスを外すと、その行に${q(NAME_REQUIRED)}を表示し、保存せず、入力欄は空のまま残す`, async ({ page }) => {
      await open(page)
      const input = ui(page).name(SPEC.name)
      await rename(input, '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      await expect(input).toHaveValue('')
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    const blankCases = [
      { name: '半角の空白だけ', value: '   ' },
      { name: '全角の空白だけ', value: '　　' },
    ]
    for (const c of blankCases) {
      test(`[タスク名 必須 空白だけ] タスク名を${c.name}にしてフォーカスを外すと、未入力とみなして${q(NAME_REQUIRED)}を表示し、保存せず、入力値はそのまま残す`, async ({ page }) => {
        await open(page)
        const input = ui(page).name(SPEC.name)
        await rename(input, c.value)
        await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
        await expect(input).toHaveValue(c.value)
        expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
      })
    }

    test(`[タスク名 50 文字以内] タスク名に 51 文字を入れてフォーカスを外すと、その行に${q(NAME_TOO_LONG)}を表示し、保存せず、入力値はそのまま残す`, async ({ page }) => {
      await open(page)
      const input = ui(page).name(SPEC.name)
      await rename(input, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await expect(input).toHaveValue('あ'.repeat(51))
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    test('[タスク名 50 文字以内 境目] タスク名に 50 文字ちょうどを入れてフォーカスを外すと、エラーを表示せず、その名前で保存する', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), 'あ'.repeat(50))
      await expectTasks(page, replaced(TASKS, { ...SPEC, name: 'あ'.repeat(50) }))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
    })

    test('[タスク名 50 文字以内 前後の空白 / 共通ルール 文字数のバリデーション時に前後の空白を取り除くか] 前後の空白を除いて 50 文字なら、エラーにならず、空白を除いた名前で保存する', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), `  ${'あ'.repeat(50)}　`)
      await expectTasks(page, replaced(TASKS, { ...SPEC, name: 'あ'.repeat(50) }))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
    })

    test('[タスク名 50 文字以内 前後の空白 境目] 前後の空白を除いて 51 文字なら、エラーにし、入力値は、空白を付けたまま残す', async ({ page }) => {
      await open(page)
      const input = ui(page).name(SPEC.name)
      await rename(input, ` ${'あ'.repeat(51)} `)
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await expect(input).toHaveValue(` ${'あ'.repeat(51)} `)
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    test('[タスク名 エラーの消去] エラーのあと、正しい値にしてフォーカスを外すと、その行のエラー表示を非表示にして、その名前で保存する', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      // 保存されている名前は変わっていないので、読み上げ名も「仕様書を書く の名前」のまま
      await rename(ui(page).name(SPEC.name), '仕様書を直す')
      await expectTasks(page, replaced(TASKS, { ...SPEC, name: '仕様書を直す' }))
      await expect(ui(page).error(NAME_REQUIRED)).toBeHidden()
    })

    test('[タスク名のエラー 行ごと] 2 つの行で別々のエラーになると、それぞれの行に、その行のメッセージを表示する（エラーの内容は、その行の入力欄の説明として伝わる）', async ({ page }) => {
      await open(page)
      const first = ui(page).name(SPEC.name)
      const second = ui(page).name(DESIGN.name)
      await rename(first, '')
      await rename(second, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_REQUIRED)).toHaveCount(1)
      await expect(ui(page).error(NAME_TOO_LONG)).toHaveCount(1)
      await expect(first).toHaveAccessibleDescription(containing(NAME_REQUIRED))
      await expect(second).toHaveAccessibleDescription(containing(NAME_TOO_LONG))
      await expect(ui(page).name(MAIL.name)).toHaveAccessibleDescription('')
    })

    test('[タスク名 読み上げ名 / タスクの色 読み上げ名 / 「アーカイブ」ボタン 読み上げ名（保存したあと）] 名前を保存すると、その行の読み上げ名を、新しい名前を使ったものに変える', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), '仕様書を直す')
      await expect(ui(page).name('仕様書を直す')).toBeVisible()
      await expect(ui(page).color('仕様書を直す')).toBeVisible()
      await expect(ui(page).archive('仕様書を直す')).toBeVisible()
      await expect(ui(page).name(SPEC.name)).toHaveCount(0)
    })

    test('[タスク名 読み上げ名 / タスクの色 読み上げ名 / 「アーカイブ」ボタン 読み上げ名（保存されていない値）] エラーになって保存されていない値が入っていても、その行の読み上げ名は、保存されている名前のままにする', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await expect(ui(page).name(SPEC.name)).toHaveValue('あ'.repeat(51))
      await expect(ui(page).color(SPEC.name)).toBeVisible()
      await expect(ui(page).archive(SPEC.name)).toBeVisible()
    })

    test('[タスク名 同じ名前] ほかのタスクと同じ名前でも、エラーにせずに保存する（名前の重複は、バリデーションの表にない）', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), DESIGN.name)
      await expectTasks(page, replaced(TASKS, { ...SPEC, name: DESIGN.name }))
    })
  })

  test.describe('「アーカイブ」ボタン押下', () => {
    test('[「アーカイブ」ボタン押下 / 保存] その行のタスクの archived だけを true にして保存する（配列の並び順は変えない）', async ({ page }) => {
      await open(page)
      await ui(page).archive(DESIGN.name).click()
      await expectTasks(page, replaced(TASKS, { ...DESIGN, archived: true }))
    })

    test('[「アーカイブ」ボタン押下 / 行を消す] その行をリストから消し、ほかの行は残す', async ({ page }) => {
      await open(page)
      await ui(page).archive(DESIGN.name).click()
      await expectActiveTab(page, [SPEC.name, MAIL.name])
      await expect(ui(page).noData).toBeHidden()
    })

    test('[「アーカイブ」ボタン押下 / 0 件になったとき] 最後の 1 件をアーカイブすると、リストを非表示にして「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: [SPEC, REVIEW] })
      await expectActiveTab(page, [SPEC.name])
      await ui(page).archive(SPEC.name).click()
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    test('[「アーカイブ」ボタン押下 / 「アーカイブ済み」のタブ] アーカイブしたタスクは、「アーカイブ済み」のタブに、配列の並び順の位置で表示する', async ({ page }) => {
      await open(page)
      await ui(page).archive(DESIGN.name).click()
      await expectActiveTab(page, [SPEC.name, MAIL.name])
      await ui(page).archivedTab.click()
      // 配列の並び順は、先月の振り返り → 画面設計 → 旧サイトの調査
      await expectArchivedTab(page, [REVIEW.name, DESIGN.name, SURVEY.name])
    })

    test('[「アーカイブ」ボタン押下 / URL クエリ] アーカイブしても、タブは「使用中」のままで、URL クエリを変えない', async ({ page }) => {
      await open(page)
      await ui(page).archive(DESIGN.name).click()
      await expectActiveTab(page, [SPEC.name, MAIL.name])
      await expectArchivedQuery(page, null)
    })
  })

  test.describe('「アーカイブを解除」ボタン押下', () => {
    test('[「アーカイブを解除」ボタン押下 / 保存] その行のタスクの archived だけを false にして保存する（配列の並び順は変えない）', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await ui(page).unarchive(REVIEW.name).click()
      await expectTasks(page, replaced(TASKS, { ...REVIEW, archived: false }))
    })

    test('[「アーカイブを解除」ボタン押下 / 行を消す] その行をリストから消し、ほかの行は残す', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await ui(page).unarchive(REVIEW.name).click()
      await expectArchivedTab(page, [SURVEY.name])
      await expect(ui(page).noData).toBeHidden()
    })

    test('[「アーカイブを解除」ボタン押下 / 0 件になったとき] 最後の 1 件のアーカイブを解除すると、リストを非表示にして「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: [SPEC, REVIEW], query: ARCHIVED_QUERY })
      await expectArchivedTab(page, [REVIEW.name])
      await ui(page).unarchive(REVIEW.name).click()
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    test('[「アーカイブを解除」ボタン押下 / 「使用中」のタブ] アーカイブを解除したタスクは、「使用中」のタブに、配列の並び順の位置で表示する', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await ui(page).unarchive(REVIEW.name).click()
      await expectArchivedTab(page, [SURVEY.name])
      await ui(page).activeTab.click()
      // 配列の並び順は、仕様書を書く → 先月の振り返り → 画面設計 → メールの返信
      await expectActiveTab(page, [SPEC.name, REVIEW.name, DESIGN.name, MAIL.name])
    })

    test('[「アーカイブを解除」ボタン押下 / URL クエリ] アーカイブを解除しても、タブは「アーカイブ済み」のままで、URL クエリを変えない', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await ui(page).unarchive(REVIEW.name).click()
      await expectArchivedTab(page, [SURVEY.name])
      await expectArchivedQuery(page, 'true')
    })

    test('[「アーカイブを解除」ボタン押下 / 色の自動設定] アーカイブを解除したタスクの色は、そのあとに足すタスクの色を決めるときに、使われている色として数える', async ({ page }) => {
      // 赤を使っているのは、アーカイブ済みのタスクだけ
      const archivedRed = task(1, { name: '赤のタスク', color: RED, archived: true })
      await open(page, { tasks: [archivedRed], query: ARCHIVED_QUERY })
      await ui(page).unarchive(archivedRed.name).click()
      await expect(ui(page).noData).toBeVisible()
      await addTask(page, 'レビュー')
      await expectTasks(page, [{ ...archivedRed, archived: false }, added('レビュー', ORANGE)])
    })
  })

  test.describe('既定の色のボタン押下', () => {
    for (const c of COLORS) {
      // もとの色と違う色に変えるため、「赤」を選ぶケースだけ、青のタスクで行う
      const target = c.name === '赤' ? DESIGN : SPEC
      test(`[既定の色のボタン押下 / ${c.item}] 「${c.name}」を押すと、色を選ぶ枠を表示している行のタスクの color だけを ${c.value} にして保存する`, async ({ page }) => {
        await open(page)
        await openPicker(page, target.name)
        await ui(page).preset(c.name).click()
        await expectTasks(page, replaced(TASKS, { ...target, color: c.value }))
      })
    }

    test('[既定の色のボタン押下 / 色を選ぶ枠を非表示にする] 既定の色を押すと、色を選ぶ枠を非表示にする', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).preset('青緑').click()
      await expectPickerClosed(page)
    })

    test('[既定の色のボタン押下 / タスクの色] 既定の色を選んだあと、同じ行の色を選ぶ枠を開き直すと、その他の色に、選んだ色が入っている（再読み込みはしない）', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).preset('青緑').click()
      await expectPickerClosed(page)
      await openPicker(page, SPEC.name)
      await expect(ui(page).otherColor).toHaveValue(colorValue(colorOf('青緑')))
    })

    test('[既定の色のボタン押下 / 色の自動設定] 変えた色は、そのあとに足すタスクの色を決めるときに、使われている色として数える', async ({ page }) => {
      // 赤の 1 件を、オレンジに変える。使われていない色のうち、並び順で先のものは赤になる
      const only = task(1, { name: '赤のタスク', color: RED })
      await open(page, { tasks: [only] })
      await openPicker(page, only.name)
      await ui(page).preset('オレンジ').click()
      await expectPickerClosed(page)
      await addTask(page, 'レビュー')
      await expectTasks(page, [{ ...only, color: ORANGE }, added('レビュー', RED)])
    })
  })

  test.describe('その他の色で、色を選び終える', () => {
    test('[その他の色で、色を選び終える / 保存] 色を選び終えると、色を選ぶ枠を表示している行のタスクの color だけを、選んだ色の英字を大文字にそろえた #RRGGBB にして保存する', async ({ page }) => {
      await open(page)
      await openPicker(page, DESIGN.name)
      await pickOtherColor(ui(page).otherColor, '#12abef', true)
      await expectTasks(page, replaced(TASKS, { ...DESIGN, color: '#12ABEF' }))
    })

    test('[その他の色で、色を選び終える / 色を選ぶ枠を非表示にする] 色を選び終えると、色を選ぶ枠を非表示にする', async ({ page }) => {
      await open(page)
      await openPicker(page, DESIGN.name)
      await pickOtherColor(ui(page).otherColor, '#12abef', true)
      await expectPickerClosed(page)
    })

    test('[その他の色で、色を選び終える / タスクの色] 色を選び終えたあと、同じ行の色を選ぶ枠を開き直すと、その他の色に、選んだ色が入っている（再読み込みはしない）', async ({ page }) => {
      await open(page)
      await openPicker(page, DESIGN.name)
      await pickOtherColor(ui(page).otherColor, '#12abef', true)
      await expectPickerClosed(page)
      await openPicker(page, DESIGN.name)
      await expect(ui(page).otherColor).toHaveValue(colorValue('#12ABEF'))
    })

    test('[その他の色で、色を選び終える / 選んでいる途中] 色を選んでいる途中は、保存せず、色を選ぶ枠も表示したままにする。選び終えたときに、最後に選んだ色だけを保存する', async ({ page }) => {
      await open(page)
      await openPicker(page, DESIGN.name)
      const input = ui(page).otherColor
      await pickOtherColor(input, '#111111', false)
      await pickOtherColor(input, '#12abef', false)
      await expectPickerOpen(page)
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
      await pickOtherColor(input, '#fedcba', true)
      await expectTasks(page, replaced(TASKS, { ...DESIGN, color: '#FEDCBA' }))
    })

    test('[その他の色で、色を選び終える / 色の自動設定] その他の色で選んだ、既定の 12 色にない色は、そのあとに足すタスクの色を決めるときに、数えない（赤が使われなくなるので、足したタスクは赤になる）', async ({ page }) => {
      const only = task(1, { name: '赤のタスク', color: RED })
      await open(page, { tasks: [only] })
      await openPicker(page, only.name)
      await pickOtherColor(ui(page).otherColor, '#12abef', true)
      await expectPickerClosed(page)
      await addTask(page, 'レビュー')
      await expectTasks(page, [{ ...only, color: '#12ABEF' }, added('レビュー', RED)])
    })
  })

  test.describe('ブラウザの戻る・進むで、この画面の URL クエリが変わる', () => {
    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 戻る] 「アーカイブ済み」に切り替えたあとブラウザの戻るで戻ると、戻ったあとの URL クエリで「使用中」のタブを選び直し、使用中のタスクを表示する', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await page.goBack()
      await expectArchivedQuery(page, null)
      await expectActiveTab(page)
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 進む] ブラウザの戻るで戻ったあと、ブラウザの進むで進むと、進んだあとの URL クエリで「アーカイブ済み」のタブを選び直し、アーカイブ済みのタスクを表示する', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await page.goBack()
      await expectActiveTab(page)
      await page.goForward()
      await expectArchivedQuery(page, 'true')
      await expectArchivedTab(page)
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / データなしの表示] 戻ったあとのタブに表示するタスクが 0 件なら、「タスクはありません」を表示する', async ({ page }) => {
      await open(page, { tasks: ACTIVE, query: ARCHIVED_QUERY })
      await expect(ui(page).noData).toBeVisible()
      await ui(page).activeTab.click()
      await expectActiveTab(page)
      await page.goBack()
      await expect(ui(page).noData).toBeVisible()
      await expect(ui(page).rowNames).toHaveCount(0)
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 新しいタスクのエラーの消去] 新しいタスクのエラーを表示したあとブラウザの戻るで戻ると、エラー表示を非表示にし、入力した値は残す', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await addTask(page, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await page.goBack()
      await expectActiveTab(page)
      await expect(ui(page).error(NAME_TOO_LONG)).toBeHidden()
      await expect(ui(page).newTask).toHaveValue('あ'.repeat(51))
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 一覧を作り直す] 保存されていないタスク名の値と、行のエラー表示は、ブラウザの戻るで戻ると残らない（ブラウザの進むで進むと、保存されている名前を、エラーなしで表示する）', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await rename(ui(page).name(REVIEW.name), '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      await page.goBack()
      await expectActiveTab(page)
      await expect(ui(page).error(NAME_REQUIRED)).toBeHidden()
      await page.goForward()
      await expectArchivedTab(page)
      await expect(ui(page).error(NAME_REQUIRED)).toBeHidden()
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / タスクを読み直す] タブを切り替えてから変えた内容（アーカイブ）は、ブラウザの戻るで戻ったあとのリストにも反映する', async ({ page }) => {
      await open(page, { query: ARCHIVED_QUERY })
      await ui(page).activeTab.click()
      await expectActiveTab(page)
      await ui(page).archive(DESIGN.name).click()
      await expectActiveTab(page, [SPEC.name, MAIL.name])
      await page.goBack()
      await expectArchivedTab(page, [REVIEW.name, DESIGN.name, SURVEY.name])
    })
  })

  test.describe('色を選ぶ枠を非表示にする操作', () => {
    test('[色を選ぶ枠の外を押す、または Esc キーを押す / 枠の外を押す] 色を選ぶ枠を表示している間に、枠の外（見出しの「タスク管理」）を押すと、枠を非表示にする', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).heading.click()
      await expectPickerClosed(page)
    })

    test('[色を選ぶ枠の外を押す、または Esc キーを押す / Esc キー] 色を選ぶ枠を表示している間に Esc キーを押すと、枠を非表示にする', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await page.keyboard.press('Escape')
      await expectPickerClosed(page)
    })

    test('[色を選ぶ枠の外を押す、または Esc キーを押す / 保存しない] 枠の外を押して非表示にしても、タスクの色は変えない（枠を開き直すと、その他の色は、もとの色のまま）', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await ui(page).heading.click()
      await expectPickerClosed(page)
      expect(await read<Task[]>(page, STG.tasks)).toEqual(TASKS)
      await openPicker(page, SPEC.name)
      await expect(ui(page).otherColor).toHaveValue(colorValue(SPEC.color))
    })

    test('[色を選ぶ枠の外を押す、または Esc キーを押す / 枠を表示していないとき] 色を選ぶ枠を表示していないときに Esc キーを押しても、何も起きない（新しいタスクの入力値は残り、そのあと色を選ぶ枠も表示できる）', async ({ page }) => {
      await open(page)
      await ui(page).newTask.fill('書きかけ')
      await page.keyboard.press('Escape')
      await openPicker(page, SPEC.name)
      await expect(ui(page).newTask).toHaveValue('書きかけ')
      await expectRows(page, names(ACTIVE))
    })

    // 色を選ぶ枠の表示条件に並ぶ、「非表示にする」アクション。
    // タスクの色のボタン・既定の色・その他の色・枠の外・Esc キーは、それぞれのアクションのケースで確かめる
    const closingCases: { action: string; query?: string; row: string; act: (page: Page, u: Ui) => Promise<unknown>; after: (page: Page) => Promise<unknown> }[] = [
      {
        // 新しいタスクを押すと「枠の外を押す」になるので、押さずに値を入れて、Enter キーで追加する
        action: '「追加」ボタン押下',
        row: SPEC.name,
        act: async (_page, u) => {
          await u.newTask.fill('レビュー')
          await u.newTask.press('Enter')
        },
        after: (page) => expectRows(page, [...names(ACTIVE), 'レビュー']),
      },
      {
        action: 'タブの切り替え',
        row: SPEC.name,
        act: (_page, u) => u.archivedTab.click(),
        after: (page) => expectArchivedTab(page),
      },
      {
        action: '「アーカイブ」ボタン押下',
        row: SPEC.name,
        act: (_page, u) => u.archive(SPEC.name).click(),
        after: (page) => expectActiveTab(page, [DESIGN.name, MAIL.name]),
      },
      {
        action: '「アーカイブを解除」ボタン押下',
        query: ARCHIVED_QUERY,
        row: REVIEW.name,
        act: (_page, u) => u.unarchive(REVIEW.name).click(),
        after: (page) => expectArchivedTab(page, [SURVEY.name]),
      },
    ]
    for (const c of closingCases) {
      test(`[色を選ぶ枠 表示条件 / ${c.action}] 色を選ぶ枠を表示しているときに行うと、枠を非表示にする`, async ({ page }) => {
        await open(page, { query: c.query })
        await openPicker(page, c.row)
        await c.act(page, ui(page))
        await c.after(page)
        await expectPickerClosed(page)
      })
    }

    test('[色を選ぶ枠 表示条件 / ブラウザの戻る・進むで、この画面の URL クエリが変わる] 色を選ぶ枠を表示しているときにブラウザの戻るで戻ると、枠を非表示にする', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await openPicker(page, REVIEW.name)
      await page.goBack()
      await expectActiveTab(page)
      await expectPickerClosed(page)
    })

    test('[色を選ぶ枠 表示条件 / 初期表示] 色を選ぶ枠を表示しているときに再読み込みすると、枠を表示していない状態で開く', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      await page.reload()
      await expectRows(page, names(ACTIVE))
      await expectPickerClosed(page)
    })
  })

  test.describe('保存するときの、形式に合わない要素の扱い', () => {
    /** 形式に合わない要素（name が数値・空・空白だけ、color が 3 桁、null）が混ざっている */
    const stored = [SPEC, { ...DESIGN, name: 123 }, { ...SURVEY, name: '' }, REVIEW, { ...MAIL, color: '#F00' }, task(9, { name: ' 　' }), null]
    const readable = [SPEC, REVIEW]

    const saveCases: { action: string; query?: string; act: (page: Page, u: Ui) => Promise<unknown>; want: unknown[] }[] = [
      {
        action: '「追加」ボタン押下',
        act: (page) => addTask(page, 'レビュー'),
        want: [...readable, added('レビュー', ORANGE)],
      },
      {
        action: 'タスク名の入力欄からフォーカスが外れる',
        act: (_page, u) => rename(u.name(SPEC.name), '仕様書を直す'),
        want: replaced(readable, { ...SPEC, name: '仕様書を直す' }),
      },
      {
        action: '「アーカイブ」ボタン押下',
        act: (_page, u) => u.archive(SPEC.name).click(),
        want: replaced(readable, { ...SPEC, archived: true }),
      },
      {
        action: '「アーカイブを解除」ボタン押下',
        query: ARCHIVED_QUERY,
        act: (_page, u) => u.unarchive(REVIEW.name).click(),
        want: replaced(readable, { ...REVIEW, archived: false }),
      },
      {
        action: '既定の色のボタン押下',
        act: async (page, u) => {
          await openPicker(page, SPEC.name)
          await u.preset('紫').click()
        },
        want: replaced(readable, { ...SPEC, color: colorOf('紫') }),
      },
      {
        action: 'その他の色で、色を選び終える',
        act: async (page, u) => {
          await openPicker(page, SPEC.name)
          await pickOtherColor(u.otherColor, '#12abef', true)
        },
        want: replaced(readable, { ...SPEC, color: '#12ABEF' }),
      },
    ]
    for (const c of saveCases) {
      test(`[保存 / 形式に合わない要素 / ${c.action}] タスクに形式に合わない要素がある状態で保存すると、形式に合わない要素は残さず、読めた分だけを保存する`, async ({ page }) => {
        await open(page, { tasks: stored, query: c.query })
        await c.act(page, ui(page))
        await expectTasks(page, c.want)
      })
    }

    test('[保存 / 形式に合わない要素 / 色の自動設定] 形式に合わない要素の色は、足すタスクの色を決めるときに、数えない', async ({ page }) => {
      // 赤を使っているのは、name のない要素だけ
      const { name: _name, ...noName } = task(1, { color: RED })
      await open(page, { tasks: [noName] })
      await expect(ui(page).noData).toBeVisible()
      await addTask(page, 'レビュー')
      await expectTasks(page, [added('レビュー', RED)])
    })

    test('[保存 / 再読み込み] 追加・名前の変更・色の変更・アーカイブのあとで再読み込みしても、変えた内容を表示する', async ({ page }) => {
      await open(page)
      await addTask(page, 'レビュー')
      await expectRows(page, [...names(ACTIVE), 'レビュー'])
      await rename(ui(page).name(SPEC.name), '仕様書を直す')
      await expect(ui(page).color('仕様書を直す')).toBeVisible()
      await openPicker(page, '仕様書を直す')
      await ui(page).preset('ピンク').click()
      await expectPickerClosed(page)
      await ui(page).archive(MAIL.name).click()
      await expectTasks(page, [
        { ...SPEC, name: '仕様書を直す', color: colorOf('ピンク') },
        REVIEW,
        DESIGN,
        SURVEY,
        { ...MAIL, archived: true },
        added('レビュー', ORANGE),
      ])
      await page.reload()
      await expectActiveTab(page, ['仕様書を直す', DESIGN.name, 'レビュー'])
      await openPicker(page, '仕様書を直す')
      await expect(ui(page).otherColor).toHaveValue(colorValue(colorOf('ピンク')))
    })
  })

  test.describe('共通ルール', () => {
    test('[共通ルール アクセシビリティ / 入力項目のエラーの説明 / 新しいタスク] 新しいタスクのエラーの内容は、新しいタスクの入力欄の説明として伝わる', async ({ page }) => {
      await open(page)
      await addTask(page, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      // どの属性で結び付けているかは見ない。読み上げソフトに伝わる「説明」にエラーの文言が入っていることを確かめる
      await expect(ui(page).newTask).toHaveAccessibleDescription(containing(NAME_TOO_LONG))
    })

    test('[共通ルール アクセシビリティ / 入力項目のエラーの説明 / タスク名] タスク名のエラーの内容は、その行のタスク名の入力欄の説明として伝わる', async ({ page }) => {
      await open(page)
      const input = ui(page).name(SPEC.name)
      await rename(input, '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      await expect(input).toHaveAccessibleDescription(containing(NAME_REQUIRED))
    })

    test('[共通ルール アクセシビリティ / 入力項目のエラーの説明（消したあと）] エラー表示を非表示にしたあとは、新しいタスクの入力欄の説明に、エラーの内容を残さない', async ({ page }) => {
      await open(page)
      await addTask(page, '')
      await expect(ui(page).newTask).toHaveAccessibleDescription(containing(NAME_REQUIRED))
      await addTask(page, 'レビュー')
      await expectRows(page, [...names(ACTIVE), 'レビュー'])
      await expect(ui(page).newTask).toHaveAccessibleDescription('')
    })

    test('[共通ルール アクセシビリティ / 送信時のエラーでのフォーカス / 「追加」ボタン] エラーがあるまま「追加」を押すと、最初のエラー項目の、新しいタスクにフォーカスを移す', async ({ page }) => {
      await open(page)
      await addTask(page, 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await expect(ui(page).newTask).toBeFocused()
    })

    test('[共通ルール アクセシビリティ / Tab キーの順序 / 新しいタスクからタブまで] 新しいタスクから Tab キーを押すと、「追加」、選んでいる「使用中」のタブの順にフォーカスが移る', async ({ page }) => {
      await open(page)
      await ui(page).newTask.focus()
      await page.keyboard.press('Tab')
      await expect(ui(page).add).toBeFocused()
      await page.keyboard.press('Tab')
      // タブはタグが「実装時に決める」なので、フォーカスのある部品の文言で確かめる
      await expect(page.locator(':focus')).toHaveText('使用中')
    })

    test('[共通ルール アクセシビリティ / Tab キーの順序 / タスクのリスト] 行のタスクの色から Tab キーを押すと、その行のタスク名、「アーカイブ」、次の行のタスクの色の順にフォーカスが移る', async ({ page }) => {
      await open(page)
      const u = ui(page)
      await u.color(SPEC.name).focus()
      for (const next of [u.name(SPEC.name), u.archive(SPEC.name), u.color(DESIGN.name), u.name(DESIGN.name), u.archive(DESIGN.name)]) {
        await page.keyboard.press('Tab')
        await expect(next).toBeFocused()
      }
    })

    test('[共通ルール アクセシビリティ / Tab キーの順序 / 色を選ぶ枠] 「赤」から Tab キーを押すと、既定の色を赤から茶まで並び順に進み、最後にその他の色へフォーカスが移る', async ({ page }) => {
      await open(page)
      await openPicker(page, SPEC.name)
      const u = ui(page)
      await u.preset('赤').focus()
      for (const c of COLORS.slice(1)) {
        await page.keyboard.press('Tab')
        await expect(u.preset(c.name)).toBeFocused()
      }
      await page.keyboard.press('Tab')
      await expect(u.otherColor).toBeFocused()
    })

    test('[新しいタスク 共通ルールと違う / ブラウザの戻るでの復元] 新しいタスクに入力したまま設定画面へ移り、ブラウザの戻るで戻ると、入力した値は復元せず、空で表示する', async ({ page }) => {
      await open(page)
      await ui(page).newTask.fill('書きかけ')
      await ui(page).settingsLink.click()
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
      // URL が変わったあと、画面が切り替わるのを待ってから戻る
      await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible()
      await page.goBack()
      await expectRows(page, names(ACTIVE))
      await expect(ui(page).newTask).toHaveValue('')
    })

    test('[タスク名 共通ルールと違う / ブラウザの戻るでの復元] エラーになって保存されていない値を残したまま設定画面へ移り、ブラウザの戻るで戻ると、保存されていない値は復元せず、保存されている名前を表示する', async ({ page }) => {
      await open(page)
      await rename(ui(page).name(SPEC.name), 'あ'.repeat(51))
      await expect(ui(page).error(NAME_TOO_LONG)).toBeVisible()
      await ui(page).settingsLink.click()
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
      // URL が変わったあと、画面が切り替わるのを待ってから戻る
      await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible()
      await page.goBack()
      await expectRows(page, names(ACTIVE))
    })

    test('[新しいタスク 共通ルールと違う / 離脱確認] 新しいタスクに入力した値が残っていても、離脱確認をせずに、設定画面へ移る', async ({ page }) => {
      await open(page)
      const dialogs: string[] = []
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.type())
        void dialog.accept()
      })
      await ui(page).newTask.fill('書きかけ')
      await ui(page).settingsLink.click()
      // 画面の中に確認を出して止めていれば、設定画面へは移らない
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
      expect(dialogs).toEqual([])
    })

    test('[タスク名 共通ルールと違う / 離脱確認] エラーになって保存されていない値がタスク名に残っていても、離脱確認をせずに、設定画面へ移る', async ({ page }) => {
      await open(page)
      const dialogs: string[] = []
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.type())
        void dialog.accept()
      })
      await rename(ui(page).name(SPEC.name), '')
      await expect(ui(page).error(NAME_REQUIRED)).toBeVisible()
      await ui(page).settingsLink.click()
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
      expect(dialogs).toEqual([])
    })

    test('[新しいタスク 共通ルールと違う / 離脱確認（再読み込み）] 新しいタスクに入力した値が残っていても、離脱確認をせずに、再読み込みできる', async ({ page }) => {
      await open(page)
      const dialogs: string[] = []
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.type())
        void dialog.accept()
      })
      await ui(page).newTask.fill('書きかけ')
      await page.reload()
      await expectRows(page, names(ACTIVE))
      expect(dialogs).toEqual([])
    })

    test('[共通ルール 再読み込みやブラウザの戻るで一覧に戻ったときに、検索条件とページを復元するか] 「アーカイブ済み」のタブを選んで設定画面へ移り、ブラウザの戻るで戻ると、「アーカイブ済み」のタブを選んだ状態で表示する', async ({ page }) => {
      await open(page)
      await ui(page).archivedTab.click()
      await expectArchivedTab(page)
      await ui(page).settingsLink.click()
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
      // URL が変わったあと、画面が切り替わるのを待ってから戻る
      await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible()
      await page.goBack()
      await expectArchivedQuery(page, 'true')
      await expectArchivedTab(page)
    })

    test('[共通ルール ブラウザの戻るで画面に戻ったときに、スクロール位置を復元するか] リストをスクロールしてから設定画面へ移り、ブラウザの戻るで戻ると、離れたときのスクロール位置で表示する', async ({ page }) => {
      const many = Array.from({ length: 40 }, (_, i) => task(i + 1))
      await open(page, { tasks: many })
      await expectRows(page, names(many))
      await page.mouse.wheel(0, 400)
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      const before = await page.evaluate(() => window.scrollY)
      // 共通ヘッダーのリンクは画面のいちばん上にあり、押すためにスクロールしてしまうので、URL を開いて移る
      await page.goto(SETTINGS_PATH)
      await page.goBack()
      await expectRows(page, names(many))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before)
    })
  })
})
