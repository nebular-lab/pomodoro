/**
 * SCR-004 履歴 の Playwright テスト
 *
 * 設計書: docs/screens/SCR-004_history/SCR-004_history.md
 * ワイヤーフレーム: docs/screens/SCR-004_history/SCR-004_history.html
 * ブラウザストレージ一覧: docs/screens/storage.md
 * 共通ルール: docs/screens/common-rules.md
 *
 * テスト名の先頭の [...] は、設計書のどこから作ったケースかを、場面・項目名・条件で示す。
 *   [document.title]                              … 冒頭の表の document.title
 *   [閲覧権限 利用者]                             … 3. 閲覧権限 の行
 *   [クエリパラメータ view 受け取れない値]        … 2. クエリパラメータ の view に、受け取れない値が来たとき
 *   [期間 表示内容（週）]                         … 画面項目「期間」の表示内容を、「週」の単位で見たとき
 *   [「次の期間へ」 活性条件（月）]               … 画面項目「次の期間へ」の活性条件を、「月」の単位で見たとき
 *   [初期表示 / 作業記録 形式に合わない要素]      … 5. 初期表示時の処理 で、作業記録（ストレージ）に形式に合わない要素があるとき
 *   [初期表示 / 期間に入る作業記録（日）]         … 5. 初期表示時の処理 の、期間に入る作業記録を集める手順
 *   [タブの切り替え / URL クエリの書き換え]       … アクション「タブの切り替え」の手順
 *   [前の期間へのボタン押下 / 月]                 … アクション「前の期間へのボタン押下」の、ずらし方の表の month の行
 *   [ブラウザの戻る・進むで、この画面の URL クエリが変わる / 戻る] … アクション「ブラウザの戻る・進むで、この画面の URL クエリが変わる」の手順
 *   [共通ルール アクセシビリティ / Tab キーの順序] … 共通ルールの「アクセシビリティ」のルール
 * 2 つの出典に当たるケースは「/」で併記している。
 *
 * 実装についての前提:
 * - この画面は API を呼ばない。データは localStorage に持つ（キーと形式は storage.md）。この画面は、タスクと作業記録を読むだけ
 * - タブはタグが「実装時に決める」なので、役割（tab）と名前（「日」「週」「月」「年」）で探す。
 *   「月」「日」は、棒グラフの目盛りにも出るので、文言だけでは探さない。
 *   どのタブを選んでいるかは、役割 tab の「選択中」の状態（getByRole の selected）で確かめ、あわせて、期間の書式でも確かめる
 * - 「前の期間へ」「次の期間へ」は、役割 button と読み上げ名（「前の期間」「次の期間」）で探す
 * - 棒グラフはタグが「実装時に決める」なので、読み上げ名「作業時間のグラフ」で探す（役割は、img・figure のどちらでも、名前を付けただけの要素でもよい）。
 *   目盛りの文字は、棒グラフの要素の中にある
 * - タスクごとのリストの行は、役割 listitem で、時間（「◯ 分」「◯ 時間」）を含むものを探す。行の中のタスク名と時間は、文言で探す
 * - 期間、ポモドーロの数、合計作業時間、データなしの表示は、文言で探す。
 *   合計作業時間は、同じ文言がリストの行にも出ることがあるので、「リストの行にある数 + 1 個」が画面にあることで確かめる
 * - 特定の属性（data-* など）やライブラリ固有の DOM の形は前提にしない
 * - 共通ヘッダーの中身は、ここでは確かめない（ヘッダーの設計書から別に確かめる）。
 *   ヘッダーが作業記録を足したときに、この画面の表示を作り直すことも、ヘッダーのテストの側
 * - 時刻は Playwright の時計で固定する。「今」は、日本時間の 2026-10-11 10:00（日曜日）。「今」を変えるケースは、テスト名に書いている
 * - タスクと作業記録の要素は、必須のフィールドと型だけを確かめる（storage.md の「値の構造」の前書き）。
 *   名前の文字数と ID の形は確かめない。color は #RRGGBB の形（大文字と小文字は区別しない）、日時は日時として読めること、seconds は 0 より大きい数値
 * - 「今日」は、表示を作るときの日付。画面を開いたまま日付が変わるケースは、時計を進めて確かめる
 * - `view`・`date` 以外のクエリパラメータと、同じパラメータが 2 つ付いたときの扱いは、決めないことなので、ケースにしていない
 */
import { expect, type Page, test } from '@playwright/test'

// ---- ブラウザストレージ（docs/screens/storage.md）-----------------------------

const STG = {
  /** STG-002 タスク */
  tasks: 'pomodoro:tasks',
  /** STG-003 作業記録 */
  records: 'pomodoro:records',
} as const

type Task = {
  id: string
  name: string
  color: string
  archived: boolean
  createdAt: string
}

type WorkRecord = {
  completedAt: string
  taskId: string | null
  seconds: number
}

/** タスク。配列の並び順は、作成日時の古い順 */
const specTask: Task = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '仕様書を書く',
  color: '#EF4444',
  archived: false,
  createdAt: '2026-09-01T00:00:00.000Z',
}
const designTask: Task = {
  id: '22222222-2222-4222-8222-222222222222',
  name: '画面設計',
  color: '#3B82F6',
  archived: false,
  createdAt: '2026-09-02T00:00:00.000Z',
}
/** アーカイブしたタスク */
const archivedTask: Task = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'リリース準備',
  color: '#22C55E',
  archived: true,
  createdAt: '2026-09-03T00:00:00.000Z',
}
/** タスクの中にない ID */
const UNKNOWN_TASK_ID = '99999999-9999-4999-8999-999999999999'

const NO_TASK = 'タスクなし'
const NO_DATA = 'この期間の作業記録はありません'
const CHART_NAME = '作業時間のグラフ'

// ---- 固定するもの ------------------------------------------------------------

const HISTORY_PATH = '/history'
/** 「今日」と現在の時刻（日本時間の 2026-10-11 10:00、日曜日） */
const NOW = new Date('2026-10-11T01:00:00.000Z')
const TODAY = '2026-10-11'

/** 日本時間の日時（`YYYY-MM-DDTHH:mm` か、秒・ミリ秒まで）を、UTC の文字列にする */
const at = (jst: string) => new Date(`${jst}+09:00`).toISOString()

/** 作業記録 1 件。completedAt は、日本時間で書く */
const rec = (jst: string, seconds: number, taskId: string | null = null): WorkRecord => ({
  completedAt: at(jst),
  taskId,
  seconds,
})

/** 今日（日本時間 2026-10-11）の 09:00 に完了した作業記録 */
const todayRec = (seconds: number, taskId: string | null = null) => rec(`${TODAY}T09:00`, seconds, taskId)

/** 合計が seconds 秒になる、今日の「タスクなし」の作業記録。1 件は、長くても 120 分（設定できる作業時間の上限） */
const todayRecsOf = (seconds: number): WorkRecord[] => {
  const max = 120 * 60
  const full = Array.from({ length: Math.floor(seconds / max) }, () => todayRec(max))
  return seconds % max === 0 ? full : [...full, todayRec(seconds % max)]
}

// ---- 期間の単位 --------------------------------------------------------------

type View = 'day' | 'week' | 'month' | 'year'

const views: { view: View; tab: string }[] = [
  { view: 'day', tab: '日' },
  { view: 'week', tab: '週' },
  { view: 'month', tab: '月' },
  { view: 'year', tab: '年' },
]
const tabOf = (view: View) => views.find((v) => v.view === view)?.tab as string

/** 期間の文言。書式そのものは、[期間 表示内容] のケースで、文言を直接書いて確かめている */
function periodOf(view: View, date: string) {
  const slash = (d: string) => d.replaceAll('-', '/')
  if (view === 'day') return slash(date)
  if (view === 'month') return slash(date.slice(0, 7))
  if (view === 'year') return date.slice(0, 4)
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d))
  const monday = new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * 86_400_000)
  const sunday = new Date(monday.getTime() + 6 * 86_400_000)
  return `${slash(monday.toISOString().slice(0, 10))}〜${slash(sunday.toISOString().slice(0, 10))}`
}

// ---- URL クエリ ---------------------------------------------------------------

type Query = { view?: string; date?: string }

/** URL の `?` 以降を作る。day は、view を付けない（付けるときは、テストの中で直接書く） */
const q = (query: Query) => {
  const params = new URLSearchParams()
  if (query.view !== undefined) params.set('view', query.view)
  if (query.date !== undefined) params.set('date', query.date)
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** 単位と日付から、URL の `?` 以降を作る。day は view を省略し、date が null なら date を省略する */
const queryOf = (view: View, date: string | null): Query => ({
  ...(view === 'day' ? {} : { view }),
  ...(date === null ? {} : { date }),
})

/** 履歴画面の URL で、クエリパラメータが expected とちょうど同じ（余分なパラメータもない） */
const hasQuery = (expected: Query) => (url: URL) => {
  const actual = Object.fromEntries(url.searchParams)
  const want = Object.entries(expected).filter(([, value]) => value !== undefined)
  return (
    url.pathname === HISTORY_PATH &&
    Object.keys(actual).length === want.length &&
    want.every(([key, value]) => actual[key] === value)
  )
}

// ---- 部品（番号はワイヤーフレームの data-no） -------------------------------

const ui = (page: Page) => {
  /** 棒グラフ（No.11）。タグが「実装時に決める」なので、読み上げ名で探す */
  const chart = page
    .getByLabel(CHART_NAME, { exact: true })
    .or(page.getByRole('img', { name: CHART_NAME, exact: true }))
    .or(page.getByRole('figure', { name: CHART_NAME, exact: true }))
  return {
    heading: page.getByRole('heading', { name: '履歴', exact: true }), // No.1
    /** 期間の単位のタブ（No.2）の中のタブ（No.3〜6）。並び順のまま */
    tabs: page.getByRole('tab'),
    tab: (name: string) => page.getByRole('tab', { name, exact: true }), // No.3〜6
    /** 選んでいるタブ */
    selectedTab: page.getByRole('tab', { selected: true }),
    prev: page.getByRole('button', { name: '前の期間', exact: true }), // No.7
    period: (text: string) => page.getByText(text, { exact: true }), // No.8
    count: (text: string) => page.getByText(text, { exact: true }), // No.9
    next: page.getByRole('button', { name: '次の期間', exact: true }), // No.10
    chart,
    /** 棒グラフの目盛りのうち、数字だけのもの（day の時、month の日） */
    numberTicks: chart.getByText(/^\s*\d+\s*$/),
    /** 棒グラフの目盛りのうち、曜日（week） */
    weekdayTicks: chart.getByText(/^\s*[月火水木金土日]\s*$/),
    /** 棒グラフの目盛りのうち、月（year） */
    monthTicks: chart.getByText(/^\s*\d+\s*月\s*$/),
    totalLabel: page.getByText('合計作業時間', { exact: true }), // No.12
    /** 合計作業時間（No.13）と同じ文言の部品すべて。リストの行（No.17）に同じ文言があれば、それも含む */
    sameAsTotal: (text: string) => page.getByText(text, { exact: true }),
    /** タスクごとのリスト（No.14）の行。時間（No.17）を含む listitem */
    rows: page.getByRole('listitem').filter({ hasText: /\d\s*(時間|分)/ }),
    noData: page.getByText(NO_DATA, { exact: true }), // No.18
    // タスクの色（No.15）は、文言も読み上げ名もない色の見本で、目印がない
  }
}

// ---- ストレージの読み書き ----------------------------------------------------

/** JSON にせず、そのままストレージに入れる文字列 */
type Raw = { raw: string }
const raw = (text: string): Raw => ({ raw: text })

type Seed = { tasks?: unknown[] | Raw; records?: unknown[] | Raw }

const toText = (value: unknown[] | Raw) => (Array.isArray(value) ? JSON.stringify(value) : value.raw)

/**
 * 画面を開く前に、ストレージに値を入れておく。指定しなかったものは、値がない状態にする。
 * 入れるのは、このテストで最初にページを開いたときの 1 回だけ（再読み込みや遷移では入れ直さない）
 */
async function seed(page: Page, values: Seed) {
  const entries: [string, string][] = []
  if (values.tasks) entries.push([STG.tasks, toText(values.tasks)])
  if (values.records) entries.push([STG.records, toText(values.records)])
  await page.addInitScript((items) => {
    if (sessionStorage.getItem('__seeded')) return
    localStorage.clear()
    for (const [key, value] of items) localStorage.setItem(key, value)
    sessionStorage.setItem('__seeded', '1')
  }, entries)
}

/** ストレージの値を、文字列のまま読む（値がなければ null） */
const readText = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key)

// ---- 画面を開く -------------------------------------------------------------

type OpenOptions = Seed & {
  /** URL の `?` 以降（`?` を含む） */
  query?: string
  /** 「今」。省略したときは、日本時間の 2026-10-11 10:00 */
  now?: Date
}

/** 時計を固定し、ストレージに値を入れて、履歴画面を開く */
async function open(page: Page, opts: OpenOptions = {}) {
  await page.clock.install({ time: opts.now ?? NOW })
  await seed(page, opts)
  await page.goto(`${HISTORY_PATH}${opts.query ?? ''}`)
  await expect(ui(page).heading).toBeVisible()
}

// ---- 確かめ方 ---------------------------------------------------------------

/** タスクごとのリストの 1 行（タスク名、タスクの合計時間） */
type Row = [name: string, time: string]

/** タスクごとのリストが、rows の並び順と文言になっている */
async function expectRows(page: Page, rows: Row[]) {
  const u = ui(page)
  await expect(u.rows).toHaveCount(rows.length)
  for (const [i, [name, time]] of rows.entries()) {
    await expect(u.rows.nth(i).getByText(name, { exact: true })).toBeVisible()
    await expect(u.rows.nth(i).getByText(time, { exact: true })).toBeVisible()
  }
}

/**
 * 合計作業時間が、text になっている。
 * 同じ文言がリストの行にも出るので、rows のうち同じ文言の行の数 + 1 個（合計作業時間の分）があることで確かめる
 */
async function expectTotal(page: Page, text: string, rows: Row[]) {
  const u = ui(page)
  await expect(u.totalLabel).toBeVisible()
  await expectRows(page, rows)
  await expect(u.sameAsTotal(text)).toHaveCount(rows.filter(([, time]) => time === text).length + 1)
}

/** 作業記録のある期間の表示（ポモドーロの数、合計作業時間、タスクごとのリスト）になっている */
async function expectResult(page: Page, want: { count: string; total: string; rows: Row[] }) {
  await expect(ui(page).count(want.count)).toBeVisible()
  await expectTotal(page, want.total, want.rows)
  await expect(ui(page).noData).toBeHidden()
}

/** 作業記録のない期間の表示（0 ポモドーロ、データなしの表示）になっている */
async function expectNoData(page: Page) {
  const u = ui(page)
  await expect(u.count('0 ポモドーロ')).toBeVisible()
  await expect(u.noData).toBeVisible()
  await expect(u.totalLabel).toBeHidden()
  await expect(u.rows).toHaveCount(0)
}

/** 単位 view のタブを選び、期間を、date を含む期間にしている */
async function expectPeriod(page: Page, view: View, date: string) {
  const u = ui(page)
  await expect(u.period(periodOf(view, date))).toBeVisible()
  await expect(u.selectedTab).toHaveText(tabOf(view))
}

/** その部品に、いまフォーカスがあるか */
const isFocused = (locator: ReturnType<Page['locator']>) => locator.evaluate((el) => el === document.activeElement)

// ---- テスト -----------------------------------------------------------------

test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 1280, height: 720 } })

test.describe('SCR-004 履歴', () => {
  test.describe('冒頭の表・閲覧権限', () => {
    test('[document.title] タイマーが動作中でないとき、「履歴」にする', async ({ page }) => {
      await open(page)
      await expect(page).toHaveTitle('履歴')
    })

    test('[閲覧権限 利用者] 履歴画面を開ける', async ({ page }) => {
      await open(page)
      await expect(page).toHaveURL((url) => url.pathname === HISTORY_PATH)
      await expect(ui(page).heading).toBeVisible()
    })
  })

  test.describe('クエリパラメータ', () => {
    for (const v of views) {
      test(`[クエリパラメータ view] view=${v.view} を付けて開くと、「${v.tab}」のタブを選び、今日を含む期間（${periodOf(v.view, TODAY)}）を表示して、view は URL から取り除かない`, async ({ page }) => {
        await open(page, { query: q({ view: v.view }) })
        await expectPeriod(page, v.view, TODAY)
        await expect(page).toHaveURL(hasQuery({ view: v.view }))
      })
    }

    test('[クエリパラメータ view 省略 / date 省略] view も date も省略して開くと、「日」のタブを選び、今日（2026/10/11）を表示する', async ({ page }) => {
      await open(page)
      await expectPeriod(page, 'day', TODAY)
      await expect(page).toHaveURL(hasQuery({}))
    })

    const badViews = [
      { value: 'WEEK', name: '大文字の WEEK' },
      { value: 'Week', name: '先頭だけ大文字の Week' },
      { value: 'weeks', name: 'weeks（余分な文字がある）' },
      { value: 'week ', name: '後ろに空白のある week' },
      { value: '週', name: 'タブの文言の「週」' },
      { value: '', name: '空' },
    ]
    for (const c of badViews) {
      test(`[クエリパラメータ view 受け取れない値] view を${c.name}にして開くと、省略したときと同じく「日」のタブを選び、view を URL から取り除く（date は残す）`, async ({ page }) => {
        await open(page, { query: q({ view: c.value, date: '2026-10-01' }) })
        await expectPeriod(page, 'day', '2026-10-01')
        await expect(page).toHaveURL(hasQuery({ date: '2026-10-01' }))
      })
    }

    const goodDates = [
      { value: '2026-10-10', name: 'きのう（2026-10-10）' },
      { value: TODAY, name: '今日（2026-10-11）' },
      { value: '2024-02-29', name: 'うるう年の 2 月 29 日（2024-02-29）' },
      { value: '2026-02-28', name: 'うるう年でない年の 2 月 28 日（2026-02-28）' },
      { value: '2026-09-30', name: '30 日まである月の 30 日（2026-09-30）' },
    ]
    for (const c of goodDates) {
      test(`[クエリパラメータ date] date を${c.name}にして開くと、その日を表示し、date は URL から取り除かない`, async ({ page }) => {
        await open(page, { query: q({ date: c.value }) })
        await expectPeriod(page, 'day', c.value)
        await expect(page).toHaveURL(hasQuery({ date: c.value }))
      })
    }

    const badDates = [
      { value: '2026/10/10', name: 'スラッシュ区切り（2026/10/10）' },
      { value: '2026-10-1', name: '日が 1 桁（2026-10-1）' },
      { value: '2026-1-10', name: '月が 1 桁（2026-1-10）' },
      { value: '20261010', name: '区切りなし（20261010）' },
      { value: '2026-10-10T00:00:00', name: '時刻付き（2026-10-10T00:00:00）' },
      { value: 'today', name: '日付でない文字（today）' },
      { value: '', name: '空' },
      { value: '2026-02-29', name: 'うるう年でない年の 2 月 29 日（2026-02-29）' },
      { value: '2026-02-30', name: '実在しない 2 月 30 日（2026-02-30）' },
      { value: '2026-09-31', name: '実在しない 9 月 31 日（2026-09-31）' },
      { value: '2026-13-01', name: '実在しない 13 月（2026-13-01）' },
      { value: '2026-00-10', name: '実在しない 0 月（2026-00-10）' },
      { value: '2026-10-00', name: '実在しない 0 日（2026-10-00）' },
      { value: '2026-10-12', name: '今日より後のあした（2026-10-12）' },
      { value: '2027-01-01', name: '今日より後の来年（2027-01-01）' },
    ]
    for (const c of badDates) {
      test(`[クエリパラメータ date 受け取れない値] date を${c.name}にして開くと、省略したときと同じく今日（2026/10/11）を表示し、date を URL から取り除く`, async ({ page }) => {
        await open(page, { query: q({ date: c.value }) })
        await expectPeriod(page, 'day', TODAY)
        await expect(page).toHaveURL(hasQuery({}))
      })
    }

    test('[クエリパラメータ date 受け取れない値（view は受け取れる値）] date だけが受け取れない値のとき、date だけを URL から取り除き、view は残す', async ({ page }) => {
      await open(page, { query: q({ view: 'week', date: '2026-13-01' }) })
      await expectPeriod(page, 'week', TODAY)
      await expect(page).toHaveURL(hasQuery({ view: 'week' }))
    })

    test('[クエリパラメータ view・date 受け取れない値] view も date も受け取れない値のとき、どちらも URL から取り除く', async ({ page }) => {
      await open(page, { query: q({ view: 'xxx', date: '2026-13-01' }) })
      await expectPeriod(page, 'day', TODAY)
      await expect(page).toHaveURL(hasQuery({}))
    })

    test('[クエリパラメータ 受け取れる値] 省略したときの値と同じ view=day と今日の date を付けて開いても、どちらも URL から取り除かない', async ({ page }) => {
      await open(page, { query: q({ view: 'day', date: TODAY }) })
      await expectPeriod(page, 'day', TODAY)
      await expect(page).toHaveURL(hasQuery({ view: 'day', date: TODAY }))
    })

    test('[クエリパラメータ date 省略（日本時間の日付の境目）] 今が日本時間の 2026-10-11 00:00（UTC では前日の 15:00）のとき、date を省略して開くと、2026/10/11 を表示する', async ({ page }) => {
      await open(page, { now: new Date(at('2026-10-11T00:00:00.000')) })
      await expectPeriod(page, 'day', '2026-10-11')
    })

    test('[クエリパラメータ date 省略（日本時間の日付の境目）] 今が日本時間の 2026-10-10 23:59 のとき、date を省略して開くと、2026/10/10 を表示する', async ({ page }) => {
      // 時計は進むので、日付が変わる 1 分前にしている
      await open(page, { now: new Date(at('2026-10-10T23:59:00.000')) })
      await expectPeriod(page, 'day', '2026-10-10')
    })

    test('[クエリパラメータ date 今日より後（日本時間の日付の境目）] 今が日本時間の 2026-10-11 00:00（UTC では前日の 15:00）のとき、date=2026-10-11 は今日なので受け取り、URL から取り除かない', async ({ page }) => {
      await open(page, { now: new Date(at('2026-10-11T00:00:00.000')), query: q({ date: '2026-10-11' }) })
      await expectPeriod(page, 'day', '2026-10-11')
      await expect(page).toHaveURL(hasQuery({ date: '2026-10-11' }))
    })

    test('[クエリパラメータ date 今日より後（日本時間の日付の境目）] 今が日本時間の 2026-10-10 23:59 のとき、date=2026-10-11 は今日より後なので、2026/10/10 を表示し、date を URL から取り除く', async ({ page }) => {
      await open(page, { now: new Date(at('2026-10-10T23:59:00.000')), query: q({ date: '2026-10-11' }) })
      await expectPeriod(page, 'day', '2026-10-10')
      await expect(page).toHaveURL(hasQuery({}))
    })

    test('[クエリパラメータ view 受け取れない値 / ブラウザの履歴] view を取り除くときは、ブラウザの履歴を置き換えるので、ブラウザの戻るで、受け取れない値の URL ではなく、その前の URL に戻る', async ({ page }) => {
      await open(page, { query: q({ view: 'week' }) })
      await expectPeriod(page, 'week', TODAY)
      await page.goto(`${HISTORY_PATH}${q({ view: 'xxx', date: '2026-10-01' })}`)
      await expect(page).toHaveURL(hasQuery({ date: '2026-10-01' }))
      await expectPeriod(page, 'day', '2026-10-01')
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'week' }))
      await expectPeriod(page, 'week', TODAY)
    })

    test('[クエリパラメータ date 受け取れない値 / ブラウザの履歴] date を取り除くときは、ブラウザの履歴を置き換えるので、ブラウザの戻るで、受け取れない値の URL ではなく、その前の URL に戻る', async ({ page }) => {
      await open(page, { query: q({ view: 'month', date: '2026-08-15' }) })
      await expectPeriod(page, 'month', '2026-08-15')
      await page.goto(`${HISTORY_PATH}${q({ view: 'year', date: '2026-10-12' })}`)
      await expect(page).toHaveURL(hasQuery({ view: 'year' }))
      await expectPeriod(page, 'year', TODAY)
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'month', date: '2026-08-15' }))
      await expectPeriod(page, 'month', '2026-08-15')
    })
  })

  test.describe('画面項目の条件・値', () => {
    test('[見出し 表示内容] 「履歴」と表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).heading).toBeVisible()
    })

    test('[期間の単位のタブ 表示条件] 作業記録が 0 件でも、「日」「週」「月」「年」のタブを、この順に表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).tabs).toHaveText(['日', '週', '月', '年'])
    })

    for (const v of views) {
      test(`[「${v.tab}」のタブ 表示条件・活性条件] 作業記録が 0 件でも表示し、活性にする`, async ({ page }) => {
        await open(page)
        await expect(ui(page).tab(v.tab)).toBeVisible()
        await expect(ui(page).tab(v.tab)).toBeEnabled()
      })

      test(`[「前の期間へ」 表示条件・活性条件（${v.tab}）] 「${v.tab}」の単位で、作業記録が 0 件でも、読み上げ名「前の期間」のボタンを表示し、活性にする`, async ({ page }) => {
        await open(page, { query: q(queryOf(v.view, null)) })
        await expectPeriod(page, v.view, TODAY)
        await expect(ui(page).prev).toBeVisible()
        await expect(ui(page).prev).toBeEnabled()
      })

      test(`[「次の期間へ」 活性条件（${v.tab}・date 省略）] 「${v.tab}」の単位で date を省略すると、今日を含む期間なので、読み上げ名「次の期間」のボタンを表示したまま、非活性にする`, async ({ page }) => {
        await open(page, { query: q(queryOf(v.view, null)) })
        await expectPeriod(page, v.view, TODAY)
        await expect(ui(page).next).toBeVisible()
        await expect(ui(page).next).toBeDisabled()
      })
    }

    // 今日は 2026-10-11（日曜日）。今日を含む週は 2026/10/05〜2026/10/11
    const nextEnabledCases: { view: View; before: string; beforeName: string; current: string; currentName: string }[] = [
      { view: 'day', before: '2026-10-10', beforeName: 'きのう', current: '2026-10-11', currentName: '今日' },
      { view: 'week', before: '2026-10-04', beforeName: '前の週の日曜日', current: '2026-10-05', currentName: '今日を含む週の月曜日' },
      { view: 'month', before: '2026-09-30', beforeName: '前の月の最後の日', current: '2026-10-01', currentName: '今日を含む月の 1 日' },
      { view: 'year', before: '2025-12-31', beforeName: '前の年の最後の日', current: '2026-01-01', currentName: '今日を含む年の 1 月 1 日' },
    ]
    for (const c of nextEnabledCases) {
      const tab = tabOf(c.view)

      test(`[「次の期間へ」 活性条件（${tab}）] 「${tab}」の単位で date が ${c.before}（${c.beforeName}）なら、今日を含む期間より前なので、活性にする`, async ({ page }) => {
        await open(page, { query: q(queryOf(c.view, c.before)) })
        await expectPeriod(page, c.view, c.before)
        await expect(ui(page).next).toBeEnabled()
      })

      test(`[「次の期間へ」 活性条件（${tab}）] 「${tab}」の単位で date が ${c.current}（${c.currentName}）なら、今日を含む期間なので、表示したまま非活性にする`, async ({ page }) => {
        await open(page, { query: q(queryOf(c.view, c.current)) })
        await expectPeriod(page, c.view, c.current)
        await expect(ui(page).next).toBeVisible()
        await expect(ui(page).next).toBeDisabled()
      })
    }

    test('[「次の期間へ」 活性条件 / フォーカス] 非活性のとき、「前の期間へ」から Tab キーを押しても、「次の期間へ」にフォーカスが当たらない', async ({ page }) => {
      await open(page)
      const u = ui(page)
      await expect(u.next).toBeDisabled()
      await u.prev.focus()
      await expect(u.prev).toBeFocused()
      await page.keyboard.press('Tab')
      // フォーカスが「前の期間へ」から動いたのを待ってから、確かめる
      await expect(u.prev).not.toBeFocused()
      await expect(u.next).not.toBeFocused()
    })

    const periodCases: { view: View; date: string; dateName: string; text: string }[] = [
      { view: 'day', date: '2026-10-11', dateName: '2026-10-11', text: '2026/10/11' },
      { view: 'day', date: '2026-01-05', dateName: '2026-01-05（月も日も 1 桁）', text: '2026/01/05' },
      { view: 'week', date: '2026-10-07', dateName: '2026-10-07（水曜日）', text: '2026/10/05〜2026/10/11' },
      { view: 'week', date: '2026-10-05', dateName: '2026-10-05（月曜日。週の最初の日）', text: '2026/10/05〜2026/10/11' },
      { view: 'week', date: '2026-10-04', dateName: '2026-10-04（日曜日。週の最後の日）', text: '2026/09/28〜2026/10/04' },
      { view: 'week', date: '2026-01-01', dateName: '2026-01-01（木曜日。年をまたぐ週）', text: '2025/12/29〜2026/01/04' },
      { view: 'month', date: '2026-10-11', dateName: '2026-10-11', text: '2026/10' },
      { view: 'month', date: '2026-01-31', dateName: '2026-01-31（月が 1 桁）', text: '2026/01' },
      { view: 'year', date: '2026-10-11', dateName: '2026-10-11', text: '2026' },
      { view: 'year', date: '2025-12-31', dateName: '2025-12-31', text: '2025' },
    ]
    for (const c of periodCases) {
      test(`[期間 表示内容（${tabOf(c.view)}）] 「${tabOf(c.view)}」の単位で date が ${c.dateName} のとき、「${c.text}」と表示する`, async ({ page }) => {
        await open(page, { query: q(queryOf(c.view, c.date)) })
        await expect(ui(page).period(c.text)).toBeVisible()
      })
    }

    const countCases = [
      { count: 0, text: '0 ポモドーロ' },
      { count: 1, text: '1 ポモドーロ' },
      { count: 999, text: '999 ポモドーロ' },
      { count: 1000, text: '1,000 ポモドーロ' },
    ]
    for (const c of countCases) {
      test(`[ポモドーロの数 表示内容] 期間内の作業記録が ${c.count} 件のとき、「${c.text}」と表示する`, async ({ page }) => {
        await open(page, { records: Array.from({ length: c.count }, () => todayRec(300)) })
        await expect(ui(page).count(c.text)).toBeVisible()
      })
    }

    test('[合計作業時間の見出し 表示内容・表示条件 / 合計作業時間 表示条件 / タスクごとのリスト 表示条件 / データなしの表示 表示条件] 期間内の作業記録が 1 件のとき、「合計作業時間」、合計作業時間、タスクごとのリストを表示し、データなしの表示は出さない', async ({ page }) => {
      await open(page, { records: [todayRec(1500)] })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })

    test('[データなしの表示 表示内容・表示条件 / 合計作業時間の見出し 表示条件 / 合計作業時間 表示条件 / タスクごとのリスト 表示条件] 期間内の作業記録が 0 件のとき、「この期間の作業記録はありません」を表示し、「合計作業時間」、合計作業時間、タスクごとのリストは出さない', async ({ page }) => {
      // きのうの作業記録はあるが、今日の作業記録はない
      await open(page, { records: [rec('2026-10-10T09:00', 1500)] })
      await expectNoData(page)
    })

    const durationCases = [
      { seconds: 59, name: '59 秒（1 分未満）', text: '0 分' },
      { seconds: 60, name: '60 秒（ちょうど 1 分）', text: '1 分' },
      { seconds: 119, name: '1 分 59 秒', text: '1 分' },
      { seconds: 3599, name: '59 分 59 秒（1 時間に 1 秒足りない）', text: '59 分' },
      { seconds: 3600, name: 'ちょうど 1 時間（分が 0）', text: '1 時間' },
      { seconds: 3659, name: '1 時間 0 分 59 秒（切り捨てると分が 0）', text: '1 時間' },
      { seconds: 3660, name: '1 時間 1 分', text: '1 時間 1 分' },
      { seconds: 4500, name: '1 時間 15 分', text: '1 時間 15 分' },
      { seconds: 999 * 3600 + 59 * 60 + 59, name: '999 時間 59 分 59 秒', text: '999 時間 59 分' },
      { seconds: 1000 * 3600, name: 'ちょうど 1000 時間', text: '1,000 時間' },
      { seconds: 1000 * 3600 + 60, name: '1000 時間 1 分', text: '1,000 時間 1 分' },
    ]
    for (const c of durationCases) {
      test(`[合計作業時間 表示内容] 期間内の作業記録の seconds の合計が ${c.name} のとき、「${c.text}」と表示する`, async ({ page }) => {
        await open(page, { records: todayRecsOf(c.seconds) })
        await expectTotal(page, c.text, [[NO_TASK, c.text]])
      })
    }

    test('[合計作業時間 表示内容（切り捨て）] 1 分未満は、作業記録ごとではなく、合計してから切り捨てる（90 秒が 2 件なら「3 分」）', async ({ page }) => {
      await open(page, { records: [todayRec(90), todayRec(90)] })
      await expectTotal(page, '3 分', [[NO_TASK, '3 分']])
    })

    test('[合計作業時間 表示内容（タスクをまたぐ合計）] タスクの違う作業記録も、期間内のものはすべて合計する', async ({ page }) => {
      await open(page, {
        tasks: [specTask, designTask],
        records: [todayRec(1500, specTask.id), todayRec(3000, designTask.id), todayRec(600)],
      })
      await expectResult(page, {
        count: '3 ポモドーロ',
        total: '1 時間 25 分',
        rows: [
          [specTask.name, '25 分'],
          [designTask.name, '50 分'],
          [NO_TASK, '10 分'],
        ],
      })
    })

    test('[タスク名 表示内容] そのタスクの name を表示する', async ({ page }) => {
      await open(page, { tasks: [specTask], records: [todayRec(1500, specTask.id)] })
      await expectRows(page, [[specTask.name, '25 分']])
    })

    test('[タスク名 表示内容（アーカイブしたタスク）] アーカイブしたタスクも、名前を表示する', async ({ page }) => {
      await open(page, { tasks: [archivedTask], records: [todayRec(1500, archivedTask.id)] })
      await expectRows(page, [[archivedTask.name, '25 分']])
    })

    test('[タスク名 表示内容（タスクなし）] taskId が null の作業記録をまとめた行では、「タスクなし」と表示する', async ({ page }) => {
      await open(page, { tasks: [specTask], records: [todayRec(1500, null), todayRec(1500, null)] })
      await expectRows(page, [[NO_TASK, '50 分']])
    })

    test('[タスクの合計時間 表示内容] 期間内の、そのタスクの作業記録の seconds だけを合計し、1 分未満は合計してから切り捨てて、合計作業時間と同じ書式で表示する', async ({ page }) => {
      await open(page, {
        tasks: [specTask, designTask],
        records: [
          todayRec(1500, specTask.id),
          todayRec(1500, specTask.id),
          todayRec(3600, designTask.id),
          // 25 分 30 秒が 2 件で、51 分（記録ごとに切り捨てると 50 分になる）
          todayRec(1530),
          todayRec(1530),
          // 期間の外（きのう）の作業記録は、数えない
          rec('2026-10-10T09:00', 1500, specTask.id),
        ],
      })
      await expectRows(page, [
        [specTask.name, '50 分'],
        [designTask.name, '1 時間'],
        [NO_TASK, '51 分'],
      ])
    })

    test('[タスクの合計時間 表示内容（3 桁ごとのカンマ）] タスクの合計が 1000 時間 1 分のとき、「1,000 時間 1 分」と表示する', async ({ page }) => {
      await open(page, {
        tasks: [specTask],
        records: todayRecsOf(1000 * 3600 + 60).map((r) => ({ ...r, taskId: specTask.id })),
      })
      await expectRows(page, [[specTask.name, '1,000 時間 1 分']])
    })

    test('[タスクごとのリスト 並び順] 作業記録の並び順や時間の長さではなく、タスク（ストレージ）の配列の並び順に並べ、「タスクなし」は最後にする', async ({ page }) => {
      await open(page, {
        tasks: [specTask, designTask, archivedTask],
        records: [
          todayRec(300),
          todayRec(600, archivedTask.id),
          todayRec(3600, designTask.id),
          todayRec(900, specTask.id),
        ],
      })
      await expectResult(page, {
        count: '4 ポモドーロ',
        total: '1 時間 30 分',
        rows: [
          [specTask.name, '15 分'],
          [designTask.name, '1 時間'],
          [archivedTask.name, '10 分'],
          [NO_TASK, '5 分'],
        ],
      })
    })

    test('[タスクごとのリスト 表示内容] 期間内に作業記録のないタスクの行は、出さない（タスクがあっても、作業記録が期間の外にあっても）', async ({ page }) => {
      await open(page, {
        tasks: [specTask, designTask, archivedTask],
        // 「仕様書を書く」は作業記録がない。「リリース準備」は、きのうの作業記録だけがある
        records: [todayRec(1500, designTask.id), rec('2026-10-10T09:00', 1500, archivedTask.id)],
      })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[designTask.name, '25 分']] })
    })

    test('[タスクごとのリスト 表示内容（タスクなしだけがない）] 期間内に「タスクなし」の作業記録がないとき、「タスクなし」の行は出さない', async ({ page }) => {
      await open(page, { tasks: [specTask], records: [todayRec(1500, specTask.id), rec('2026-10-10T09:00', 1500)] })
      await expectRows(page, [[specTask.name, '25 分']])
    })

    test('[棒グラフ 表示条件・読み上げ名] 期間内に作業記録があるとき、読み上げ名「作業時間のグラフ」のグラフを表示する', async ({ page }) => {
      await open(page, { records: [todayRec(1500)] })
      await expect(ui(page).count('1 ポモドーロ')).toBeVisible()
      await expect(ui(page).chart).toBeVisible()
    })

    test('[棒グラフ 表示条件・読み上げ名（作業記録が 0 件）] 期間内の作業記録が 0 件でも、読み上げ名「作業時間のグラフ」のグラフを表示する', async ({ page }) => {
      await open(page)
      await expectNoData(page)
      await expect(ui(page).chart).toBeVisible()
    })

    test('[棒グラフ 目盛り（日）] 「日」の単位では、棒の下の目盛りに「4」「8」「12」「16」「20」を、この順に表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).numberTicks).toHaveText(['4', '8', '12', '16', '20'])
    })

    test('[棒グラフ 目盛り（週）] 「週」の単位では、棒の下の目盛りに「月」「火」「水」「木」「金」「土」「日」を、月曜始まりの順に表示する', async ({ page }) => {
      await open(page, { query: q({ view: 'week' }) })
      await expect(ui(page).weekdayTicks).toHaveText(['月', '火', '水', '木', '金', '土', '日'])
    })

    const monthTickCases = [
      { date: '2026-10-11', name: '31 日まである月（2026 年 10 月）', ticks: ['1', '5', '10', '15', '20', '25', '30'], note: '「30」まで表示する' },
      { date: '2026-09-15', name: '30 日まである月（2026 年 9 月）', ticks: ['1', '5', '10', '15', '20', '25', '30'], note: '「30」まで表示する' },
      { date: '2024-02-15', name: '29 日まである月（2024 年 2 月）', ticks: ['1', '5', '10', '15', '20', '25'], note: '30 日がないので、「30」は表示しない' },
      { date: '2026-02-15', name: '28 日まである月（2026 年 2 月）', ticks: ['1', '5', '10', '15', '20', '25'], note: '30 日がないので、「30」は表示しない' },
    ]
    for (const c of monthTickCases) {
      test(`[棒グラフ 目盛り（月）] 「月」の単位で ${c.name} のとき、棒の下の目盛りは ${c.ticks.map((t) => `「${t}」`).join('')}（${c.note}）`, async ({ page }) => {
        await open(page, { query: q({ view: 'month', date: c.date }) })
        await expectPeriod(page, 'month', c.date)
        await expect(ui(page).numberTicks).toHaveText(c.ticks)
      })
    }

    test('[棒グラフ 目盛り（年）] 「年」の単位では、棒の下の目盛りに「1 月」から「12 月」までを、この順に表示する', async ({ page }) => {
      await open(page, { query: q({ view: 'year' }) })
      await expect(ui(page).monthTicks).toHaveText(Array.from({ length: 12 }, (_, i) => `${i + 1} 月`))
    })

    test.fixme('[棒グラフ 表示内容（棒の数）] 棒を、「日」は 1 時間ごとの 24 本、「週」は 1 日ごとの 7 本、「月」はその月の日数、「年」は 1 か月ごとの 12 本、左から順に並べる（棒に、文言も読み上げ名もなく、目印が設計書にないため。タグも「実装時に決める」）', async () => {})

    test.fixme('[棒グラフ 表示内容（作業のない棒）] 作業のない棒も、空の棒として表示する（棒に目印が設計書にないため）', async () => {})

    test.fixme('[棒グラフ 表示内容（数える棒）] 作業記録は、completedAt（日本時間）が入る棒に、seconds のすべてを数える（棒の境目で分けない）（棒ごとの時間は読み上げない設計で、棒の長さを確かめる目印がないため。どの期間に入るかは [初期表示 / 期間に入る作業記録] で確かめている）', async () => {})

    test.fixme('[棒グラフ 表示内容（積み上げ）] 棒の中は、タスクごとの合計を、タスクごとのリストと同じ並び順で下から積み上げ、色をそのタスクの色（「タスクなし」は固定の灰色）にする（積み上げた区切りに目印がなく、色は見た目のため）', async () => {})

    test.fixme('[棒グラフ 表示内容（棒の長さの上限）] 棒の長さの上限を、期間内でいちばん長い棒の合計時間にする（棒の長さは見た目で、確かめる目印がないため）', async () => {})

    test.fixme('[棒グラフ 読み上げ名（棒ごとの時間）] 棒ごとの時間は読み上げない（読み上げソフトでしか確かめられないため。手で確かめる）', async () => {})

    test.fixme('[タスクの色 表示内容・読み上げ名] 行の先頭に、そのタスクの color（「タスクなし」は固定の灰色）の色の見本を表示し、読み上げない（文言も読み上げ名もない飾りで、目印がないため。色は見た目）', async () => {})
  })

  test.describe('初期表示時の処理', () => {
    test('[初期表示 / タスク・作業記録 値がない] タスクにも作業記録にも値がないとき、どちらも 0 件として扱い、「0 ポモドーロ」とデータなしの表示を出す', async ({ page }) => {
      await open(page, {})
      await expectNoData(page)
    })

    test('[初期表示 / 作業記録 値がない] タスクはあっても、作業記録に値がないとき、0 件として扱う', async ({ page }) => {
      await open(page, { tasks: [specTask] })
      await expectNoData(page)
    })

    test('[初期表示 / タスク 値がない] タスクに値がないとき、タスクは 0 件として扱い、taskId のある作業記録は「タスクなし」として扱う', async ({ page }) => {
      await open(page, { records: [todayRec(1500, specTask.id)] })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })

    const notArrays = [
      { name: 'オブジェクト', text: '{"a":1}' },
      { name: '文字列', text: '"abc"' },
      { name: '数値', text: '123' },
      { name: 'null', text: 'null' },
      { name: 'JSON として読めない文字列', text: '[{' },
    ]
    for (const c of notArrays) {
      test(`[初期表示 / 作業記録 配列でない] 作業記録の値が${c.name}のとき、0 件として扱う`, async ({ page }) => {
        await open(page, { tasks: [specTask], records: raw(c.text) })
        await expectNoData(page)
      })

      test(`[初期表示 / タスク 配列でない] タスクの値が${c.name}のとき、タスクは 0 件として扱い、taskId のある作業記録は「タスクなし」として扱う`, async ({ page }) => {
        await open(page, { tasks: raw(c.text), records: [todayRec(1500, specTask.id)] })
        await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
      })
    }

    // 形式に合っていれば、今日の期間に入って、10 分として数える作業記録
    const good = todayRec(600)
    const badRecords: { name: string; value: unknown }[] = [
      { name: 'completedAt がない要素', value: { taskId: good.taskId, seconds: good.seconds } },
      { name: 'completedAt が数値の要素', value: { ...good, completedAt: Date.parse(good.completedAt) } },
      { name: 'completedAt が日時として読めない文字列の要素', value: { ...good, completedAt: 'abc' } },
      { name: 'taskId がない要素', value: { completedAt: good.completedAt, seconds: good.seconds } },
      { name: 'taskId が数値の要素', value: { ...good, taskId: 1 } },
      { name: 'seconds がない要素', value: { completedAt: good.completedAt, taskId: good.taskId } },
      { name: 'seconds が文字列の要素', value: { ...good, seconds: '600' } },
      { name: 'seconds が null の要素', value: { ...good, seconds: null } },
      { name: 'seconds が 0 の要素', value: { ...good, seconds: 0 } },
      { name: 'seconds が負の数（-600）の要素', value: { ...good, seconds: -600 } },
      { name: 'null の要素', value: null },
      { name: '文字列の要素', value: 'abc' },
      { name: '配列の要素', value: [] },
    ]
    for (const c of badRecords) {
      test(`[初期表示 / 作業記録 形式に合わない要素] 作業記録に、${c.name}があるとき、その要素はないものとして扱い、ほかの要素は数える`, async ({ page }) => {
        await open(page, { records: [c.value, todayRec(1500)] })
        await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
      })
    }

    const goodRecords: { name: string; value: unknown; total: string }[] = [
      { name: 'completedAt が UTC の書き方でない（+09:00 付きの 2026-10-11T09:00:00+09:00）要素', value: { ...good, completedAt: '2026-10-11T09:00:00+09:00' }, total: '35 分' },
      { name: 'seconds が小数（600.5）の要素', value: { ...good, seconds: 600.5 }, total: '35 分' },
      { name: 'seconds が 0 よりわずかに大きい（1）要素', value: { ...good, seconds: 1 }, total: '25 分' },
    ]
    for (const c of goodRecords) {
      test(`[初期表示 / 作業記録 形式に合う要素] 作業記録に、${c.name}があるとき、形式に合うものとして数える`, async ({ page }) => {
        await open(page, { records: [c.value, todayRec(1500)] })
        await expectResult(page, { count: '2 ポモドーロ', total: c.total, rows: [[NO_TASK, c.total]] })
      })
    }

    const badTasks: { name: string; value: unknown }[] = [
      { name: 'name がない要素', value: { id: designTask.id, color: designTask.color, archived: false, createdAt: designTask.createdAt } },
      { name: 'name が数値の要素', value: { ...designTask, name: 1 } },
      { name: 'color がない要素', value: { id: designTask.id, name: designTask.name, archived: false, createdAt: designTask.createdAt } },
      { name: 'color が #RRGGBB の形でない（red）要素', value: { ...designTask, color: 'red' } },
      { name: 'color が #RRGGBB の形でない（桁の足りない #EF444）要素', value: { ...designTask, color: '#EF444' } },
      { name: 'archived がない要素', value: { id: designTask.id, name: designTask.name, color: designTask.color, createdAt: designTask.createdAt } },
      { name: 'archived が文字列の要素', value: { ...designTask, archived: 'false' } },
      { name: 'createdAt がない要素', value: { id: designTask.id, name: designTask.name, color: designTask.color, archived: false } },
      { name: 'createdAt が日時として読めない文字列の要素', value: { ...designTask, createdAt: 'abc' } },
      { name: 'id が数値の要素', value: { ...designTask, id: 1 } },
    ]
    for (const c of badTasks) {
      test(`[初期表示 / タスク 形式に合わない要素] タスクに、${c.name}があるとき、その要素はないものとして扱い、そのタスクの作業記録は「タスクなし」として扱う（ほかのタスクは使う）`, async ({ page }) => {
        await open(page, {
          tasks: [c.value, specTask],
          records: [todayRec(600, designTask.id), todayRec(1500, specTask.id)],
        })
        await expectResult(page, {
          count: '2 ポモドーロ',
          total: '35 分',
          rows: [
            [specTask.name, '25 分'],
            [NO_TASK, '10 分'],
          ],
        })
      })
    }

    // 内容の範囲（名前の文字数、ID の形）は確かめないので、形式に合うものとして使う
    const goodTasks: { name: string; value: { id: string; name: string }; shown: boolean }[] = [
      { name: 'name が 51 文字の要素', value: { ...designTask, name: 'あ'.repeat(51) }, shown: true },
      { name: 'name が空文字の要素', value: { ...designTask, name: '' }, shown: false },
      { name: 'name が空白だけの要素', value: { ...designTask, name: '   ' }, shown: false },
      { name: 'id が UUID の形でない（abc）要素', value: { ...designTask, id: 'abc' }, shown: true },
      { name: 'color の英字が小文字（#3b82f6）の要素', value: { ...designTask, color: '#3b82f6' }, shown: true },
      { name: 'createdAt が UTC の書き方でない（+09:00 付き）要素', value: { ...designTask, createdAt: '2026-09-02T09:00:00+09:00' }, shown: true },
    ]
    for (const c of goodTasks) {
      test(`[初期表示 / タスク 形式に合う要素] タスクに、${c.name}があるとき、形式に合うものとして使い、そのタスクの作業記録は「タスクなし」にしない`, async ({ page }) => {
        await open(page, { tasks: [c.value], records: [todayRec(600, c.value.id)] })
        const u = ui(page)
        await expect(u.count('1 ポモドーロ')).toBeVisible()
        // そのタスクの 1 行だけがあり、「タスクなし」の行はない
        await expect(u.rows).toHaveCount(1)
        await expect(u.rows.getByText('10 分', { exact: true })).toBeVisible()
        if (c.shown) await expect(u.rows.getByText(c.value.name, { exact: true })).toBeVisible()
        await expect(u.rows.getByText(NO_TASK, { exact: true })).toHaveCount(0)
      })
    }

    test('[初期表示 / 作業記録のタスクが見つからない] 作業記録の taskId が、読んだタスクの中にないとき、「タスクなし」として扱い、taskId が null の作業記録と同じ 1 行にまとめる', async ({ page }) => {
      await open(page, {
        tasks: [specTask],
        records: [todayRec(1500, UNKNOWN_TASK_ID), todayRec(1500, null), todayRec(600, specTask.id)],
      })
      await expectResult(page, {
        count: '3 ポモドーロ',
        total: '1 時間',
        rows: [
          [specTask.name, '10 分'],
          [NO_TASK, '50 分'],
        ],
      })
    })

    test('[初期表示 / タスク・作業記録 読むだけ] 形式に合わない要素があっても、タスクと作業記録のストレージの値は書き換えない', async ({ page }) => {
      const tasks = JSON.stringify([{ ...designTask, name: '' }, specTask])
      const records = JSON.stringify([{ ...good, seconds: '600' }, todayRec(1500, specTask.id)])
      await open(page, { tasks: raw(tasks), records: raw(records) })
      // 読み終わって、表示するのを待ってから、確かめる
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[specTask.name, '25 分']] })
      expect(await readText(page, STG.tasks)).toBe(tasks)
      expect(await readText(page, STG.records)).toBe(records)
    })

    // 期間の最初の瞬間・最後の瞬間と、その 1 ミリ秒外。日付と期間の区切りは日本時間で、completedAt は UTC の文字列
    const rangeCases: { view: View; date: string; middle: string; first: string; last: string; before: string; after: string }[] = [
      {
        view: 'day',
        date: '2026-10-10',
        middle: '2026-10-10T12:00',
        first: '2026-10-10T00:00:00.000',
        last: '2026-10-10T23:59:59.999',
        before: '2026-10-09T23:59:59.999',
        after: '2026-10-11T00:00:00.000',
      },
      {
        // 月をまたぐ週（2026/09/28〜2026/10/04）
        view: 'week',
        date: '2026-09-30',
        middle: '2026-09-30T12:00',
        first: '2026-09-28T00:00:00.000',
        last: '2026-10-04T23:59:59.999',
        before: '2026-09-27T23:59:59.999',
        after: '2026-10-05T00:00:00.000',
      },
      {
        view: 'month',
        date: '2026-09-15',
        middle: '2026-09-15T12:00',
        first: '2026-09-01T00:00:00.000',
        last: '2026-09-30T23:59:59.999',
        before: '2026-08-31T23:59:59.999',
        after: '2026-10-01T00:00:00.000',
      },
      {
        view: 'year',
        date: '2025-06-15',
        middle: '2025-06-15T12:00',
        first: '2025-01-01T00:00:00.000',
        last: '2025-12-31T23:59:59.999',
        before: '2024-12-31T23:59:59.999',
        after: '2026-01-01T00:00:00.000',
      },
    ]
    for (const c of rangeCases) {
      const tab = tabOf(c.view)
      const period = periodOf(c.view, c.date)
      const edges = [
        { jst: c.first, name: '期間の最初の瞬間', inside: true },
        { jst: c.last, name: '期間の最後の瞬間', inside: true },
        { jst: c.before, name: '期間が始まる 1 ミリ秒前', inside: false },
        { jst: c.after, name: '期間が終わった直後', inside: false },
      ]
      for (const e of edges) {
        test(`[初期表示 / 期間に入る作業記録（${tab}）] 「${tab}」の単位で ${period} を表示しているとき、completedAt が日本時間の ${e.jst}（${e.name}。UTC では ${at(e.jst)}）の作業記録は、${e.inside ? '数える' : '数えない'}`, async ({ page }) => {
          // 期間の真ん中の 25 分の作業記録と、境目の 10 分の作業記録
          await open(page, { query: q(queryOf(c.view, c.date)), records: [rec(c.middle, 1500), rec(e.jst, 600)] })
          await expectPeriod(page, c.view, c.date)
          await expectResult(
            page,
            e.inside
              ? { count: '2 ポモドーロ', total: '35 分', rows: [[NO_TASK, '35 分']] }
              : { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] },
          )
        })
      }
    }

    test('[初期表示 / 期間に入る作業記録（今日）] date を省略したとき、completedAt が UTC では前日（2026-10-10T15:00:00.000Z）でも、日本時間では今日の 00:00 の作業記録は、今日の分として数える', async ({ page }) => {
      await open(page, { records: [{ completedAt: '2026-10-10T15:00:00.000Z', taskId: null, seconds: 1500 }] })
      await expectPeriod(page, 'day', TODAY)
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })

    test('[初期表示 / 期間に入る作業記録（今日）] date を省略したとき、completedAt が UTC では 2026-10-10T14:59:59.999Z（日本時間ではきのうの 23:59:59.999）の作業記録は、今日の分として数えない', async ({ page }) => {
      await open(page, { records: [{ completedAt: '2026-10-10T14:59:59.999Z', taskId: null, seconds: 1500 }] })
      await expectPeriod(page, 'day', TODAY)
      await expectNoData(page)
    })
  })

  test.describe('タブの切り替え', () => {
    for (const v of views.filter((x) => x.view !== 'day')) {
      test(`[タブの切り替え / URL クエリの書き換え（「${v.tab}」）] 「日」を選んだ状態で「${v.tab}」のタブを押すと、URL クエリの view を ${v.view} に書き換え、date は変えずに、「${v.tab}」のタブを選んで、期間を ${periodOf(v.view, '2026-09-30')} にする`, async ({ page }) => {
        await open(page, { query: q({ date: '2026-09-30' }) })
        await expectPeriod(page, 'day', '2026-09-30')
        await ui(page).tab(v.tab).click()
        await expect(page).toHaveURL(hasQuery({ view: v.view, date: '2026-09-30' }))
        await expectPeriod(page, v.view, '2026-09-30')
      })
    }

    test('[タブの切り替え / URL クエリの書き換え（「日」）] 「週」を選んだ状態で「日」のタブを押すと、URL クエリの view を消し、date は変えずに、「日」のタブを選んで、期間を 2026/09/30 にする', async ({ page }) => {
      await open(page, { query: q({ view: 'week', date: '2026-09-30' }) })
      await expectPeriod(page, 'week', '2026-09-30')
      await ui(page).tab('日').click()
      await expect(page).toHaveURL(hasQuery({ date: '2026-09-30' }))
      await expectPeriod(page, 'day', '2026-09-30')
    })

    test('[タブの切り替え / URL クエリの書き換え（date がないとき）] URL クエリに date がないとき、タブを切り替えても、date は付けない', async ({ page }) => {
      await open(page)
      await expectPeriod(page, 'day', TODAY)
      await ui(page).tab('月').click()
      await expect(page).toHaveURL(hasQuery({ view: 'month' }))
      await expectPeriod(page, 'month', TODAY)
    })

    test('[タブの切り替え / ブラウザの履歴] ブラウザの履歴に追加するので、ブラウザの戻るで、タブを切り替える前の URL クエリの履歴画面に戻る', async ({ page }) => {
      await open(page, { query: q({ view: 'week', date: '2026-09-30' }) })
      await expectPeriod(page, 'week', '2026-09-30')
      await ui(page).tab('年').click()
      await expect(page).toHaveURL(hasQuery({ view: 'year', date: '2026-09-30' }))
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-09-30' }))
    })

    test('[タブの切り替え / すでに選んでいるタブ] すでに選んでいる「週」のタブを押しても、URL クエリを変えず、ブラウザの履歴にも追加しない（ブラウザの戻るで、「週」に切り替える前に戻る）', async ({ page }) => {
      await open(page, { query: q({ date: '2026-09-30' }) })
      await ui(page).tab('週').click()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-09-30' }))
      await expectPeriod(page, 'week', '2026-09-30')
      await ui(page).tab('週').click()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-09-30' }))
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ date: '2026-09-30' }))
      await expectPeriod(page, 'day', '2026-09-30')
    })

    test('[タブの切り替え / すでに選んでいるタブ（view を省略）] view を省略して「日」を選んでいるとき、「日」のタブを押しても、URL クエリに view を付けない', async ({ page }) => {
      await open(page, { query: q({ view: 'week' }) })
      await ui(page).tab('日').click()
      await expect(page).toHaveURL(hasQuery({}))
      await expectPeriod(page, 'day', TODAY)
      await ui(page).tab('日').click()
      await expect(page).toHaveURL(hasQuery({}))
      // 履歴に追加していないので、1 回戻ると、「日」に切り替える前に戻る
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'week' }))
    })

    test('[タブの切り替え / すでに選んでいるタブ（view=day）] URL クエリに view=day を付けて「日」を選んでいるとき、「日」のタブを押しても、view を消さない', async ({ page }) => {
      await open(page, { query: q({ view: 'week' }) })
      await page.goto(`${HISTORY_PATH}${q({ view: 'day' })}`)
      await expectPeriod(page, 'day', TODAY)
      await ui(page).tab('日').click()
      await expect(page).toHaveURL(hasQuery({ view: 'day' }))
      // 履歴に追加していないので、1 回戻ると、view=day を開く前に戻る
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'week' }))
    })

    test('[タブの切り替え / ポモドーロの数・合計・リストの作り直し] 「日」から「週」に切り替えると、その週の作業記録を集め直して、ポモドーロの数、合計作業時間、タスクごとのリストを表示し直す', async ({ page }) => {
      await open(page, {
        tasks: [specTask, designTask],
        records: [
          todayRec(1500, specTask.id),
          // 同じ週の月曜日
          rec('2026-10-05T09:00', 3000, designTask.id),
          // 前の週の日曜日
          rec('2026-10-04T09:00', 600, specTask.id),
        ],
      })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[specTask.name, '25 分']] })
      await ui(page).tab('週').click()
      await expectPeriod(page, 'week', TODAY)
      await expectResult(page, {
        count: '2 ポモドーロ',
        total: '1 時間 15 分',
        rows: [
          [specTask.name, '25 分'],
          [designTask.name, '50 分'],
        ],
      })
    })

    test('[タブの切り替え / データなしの表示を消す] 作業記録のない日から、作業記録のある「月」に切り替えると、データなしの表示を消して、合計作業時間とタスクごとのリストを表示する', async ({ page }) => {
      await open(page, { records: [rec('2026-10-01T09:00', 1500)] })
      await expectNoData(page)
      await ui(page).tab('月').click()
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })

    test('[タブの切り替え / データなしの表示を出す] 作業記録のある「月」から、作業記録のない日に切り替えると、合計作業時間とタスクごとのリストを消して、データなしの表示を出す', async ({ page }) => {
      await open(page, { query: q({ view: 'month' }), records: [rec('2026-10-01T09:00', 1500)] })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
      await ui(page).tab('日').click()
      await expectPeriod(page, 'day', TODAY)
      await expectNoData(page)
    })

    test('[タブの切り替え / 「次の期間へ」の活性（非活性にする）] date が 2026-10-05 のとき、「日」（今日より前の日）から「週」（今日を含む週）に切り替えると、「次の期間へ」を非活性にする', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-05' }) })
      await expect(ui(page).next).toBeEnabled()
      await ui(page).tab('週').click()
      await expectPeriod(page, 'week', '2026-10-05')
      await expect(ui(page).next).toBeDisabled()
    })

    test('[タブの切り替え / 「次の期間へ」の活性（活性にする）] date が 2026-10-05 のとき、「週」（今日を含む週）から「日」（今日より前の日）に切り替えると、「次の期間へ」を活性にする', async ({ page }) => {
      await open(page, { query: q({ view: 'week', date: '2026-10-05' }) })
      await expect(ui(page).next).toBeDisabled()
      await ui(page).tab('日').click()
      await expectPeriod(page, 'day', '2026-10-05')
      await expect(ui(page).next).toBeEnabled()
    })

    test('[タブの切り替え / 棒グラフの作り直し] 「日」から「年」に切り替えると、棒グラフの目盛りを「1 月」〜「12 月」に変える', async ({ page }) => {
      await open(page)
      await expect(ui(page).numberTicks).toHaveText(['4', '8', '12', '16', '20'])
      await ui(page).tab('年').click()
      await expect(ui(page).monthTicks).toHaveText(Array.from({ length: 12 }, (_, i) => `${i + 1} 月`))
    })
  })

  // ---- 前の期間へ・次の期間へ -------------------------------------------------

  /** from（null は date を省略）から、ボタンを押したあとの date が to になる */
  type Shift = { view: View; from: string | null; to: string; note: string; now?: { date: Date; name: string } }

  /** 今日が水曜日のケースで使う「今」（日本時間の 2026-10-07 10:00） */
  const WEDNESDAY = { date: new Date(at('2026-10-07T10:00')), name: '今日が 2026-10-07（水曜日）のとき、' }

  const shiftName = (c: Shift) =>
    `${c.now?.name ?? ''}「${tabOf(c.view)}」の単位で date が ${c.from ?? '省略（今日の 2026-10-11）'} のとき、URL クエリの date を ${c.to} に書き換える（${c.note}）`

  test.describe('前の期間へのボタン押下', () => {
    const prevCases: Shift[] = [
      { view: 'day', from: null, to: '2026-10-10', note: '1 日前。view は付けない' },
      { view: 'day', from: '2026-10-11', to: '2026-10-10', note: '1 日前' },
      { view: 'day', from: '2026-10-01', to: '2026-09-30', note: '1 日前。月をまたぐ' },
      { view: 'day', from: '2026-01-01', to: '2025-12-31', note: '1 日前。年をまたぐ' },
      { view: 'day', from: '2026-03-01', to: '2026-02-28', note: '1 日前。うるう年でない年の 2 月の最後の日' },
      { view: 'day', from: '2024-03-01', to: '2024-02-29', note: '1 日前。うるう年の 2 月の最後の日' },
      { view: 'week', from: null, to: '2026-10-04', note: '7 日前' },
      { view: 'week', from: '2026-10-07', to: '2026-09-30', note: '7 日前。週の最初の日にはそろえない' },
      { view: 'week', from: '2026-01-03', to: '2025-12-27', note: '7 日前。年をまたぐ' },
      { view: 'month', from: null, to: '2026-09-11', note: '前の月の同じ日' },
      { view: 'month', from: '2026-01-15', to: '2025-12-15', note: '前の月の同じ日。年をまたぐ' },
      { view: 'month', from: '2026-08-31', to: '2026-07-31', note: '前の月にも 31 日があるので、同じ日' },
      { view: 'month', from: '2026-07-31', to: '2026-06-30', note: '前の月に 31 日がないので、その月の最後の日' },
      { view: 'month', from: '2026-03-28', to: '2026-02-28', note: '前の月にも 28 日があるので、同じ日' },
      { view: 'month', from: '2026-03-29', to: '2026-02-28', note: 'うるう年でない年の 2 月に 29 日がないので、その月の最後の日' },
      { view: 'month', from: '2026-03-31', to: '2026-02-28', note: '2 月に 31 日がないので、その月の最後の日' },
      { view: 'month', from: '2024-03-29', to: '2024-02-29', note: 'うるう年の 2 月には 29 日があるので、同じ日' },
      { view: 'month', from: '2024-03-31', to: '2024-02-29', note: 'うるう年の 2 月に 31 日がないので、その月の最後の日' },
      { view: 'year', from: null, to: '2025-10-11', note: '前の年の同じ月日' },
      { view: 'year', from: '2025-03-01', to: '2024-03-01', note: '前の年の同じ月日' },
      { view: 'year', from: '2024-02-28', to: '2023-02-28', note: '前の年の同じ月日' },
      { view: 'year', from: '2024-02-29', to: '2023-02-28', note: '前の年に 2 月 29 日がないので、2 月 28 日' },
    ]
    for (const c of prevCases) {
      test(`[前の期間へのボタン押下 / ${tabOf(c.view)}] ${shiftName(c)}`, async ({ page }) => {
        await open(page, { query: q(queryOf(c.view, c.from)), now: c.now?.date })
        await expectPeriod(page, c.view, c.from ?? TODAY)
        await ui(page).prev.click()
        await expect(page).toHaveURL(hasQuery(queryOf(c.view, c.to)))
        await expectPeriod(page, c.view, c.to)
      })
    }

    test('[前の期間へのボタン押下 / view=day] URL クエリに view=day が付いているとき、date だけを書き換え、view は変えない', async ({ page }) => {
      await open(page, { query: q({ view: 'day', date: '2026-10-11' }) })
      await ui(page).prev.click()
      await expect(page).toHaveURL(hasQuery({ view: 'day', date: '2026-10-10' }))
      await expectPeriod(page, 'day', '2026-10-10')
    })

    test('[前の期間へのボタン押下 / 続けて押す] 「月」の単位で date が 2026-03-31 のとき、2 回押すと、書き換えたあとの date（2026-02-28）からずらして、2026-01-28 にする', async ({ page }) => {
      await open(page, { query: q({ view: 'month', date: '2026-03-31' }) })
      await ui(page).prev.click()
      await expect(page).toHaveURL(hasQuery({ view: 'month', date: '2026-02-28' }))
      await ui(page).prev.click()
      await expect(page).toHaveURL(hasQuery({ view: 'month', date: '2026-01-28' }))
      await expectPeriod(page, 'month', '2026-01-28')
    })

    test('[前の期間へのボタン押下 / ブラウザの履歴] ブラウザの履歴に追加するので、ブラウザの戻るで、押す前の URL クエリの履歴画面に戻る', async ({ page }) => {
      await open(page, { query: q({ view: 'week', date: '2026-10-07' }) })
      await ui(page).prev.click()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-09-30' }))
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-10-07' }))
    })

    test('[前の期間へのボタン押下 / 「次の期間へ」の活性] 今日を表示しているときに押すと、今日より前の日になるので、「次の期間へ」を活性にする', async ({ page }) => {
      await open(page)
      await expect(ui(page).next).toBeDisabled()
      await ui(page).prev.click()
      await expectPeriod(page, 'day', '2026-10-10')
      await expect(ui(page).next).toBeEnabled()
    })

    test('[前の期間へのボタン押下 / ポモドーロの数・合計・リストの作り直し] 押すと、ずらした期間の作業記録を集め直して、ポモドーロの数、合計作業時間、タスクごとのリストを表示し直す', async ({ page }) => {
      await open(page, {
        tasks: [specTask, designTask],
        records: [todayRec(1500, specTask.id), rec('2026-10-10T09:00', 3000, designTask.id), rec('2026-10-10T10:00', 600)],
      })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[specTask.name, '25 分']] })
      await ui(page).prev.click()
      await expectPeriod(page, 'day', '2026-10-10')
      await expectResult(page, {
        count: '2 ポモドーロ',
        total: '1 時間',
        rows: [
          [designTask.name, '50 分'],
          [NO_TASK, '10 分'],
        ],
      })
    })

    test('[前の期間へのボタン押下 / データなしの表示を出す] 作業記録のある日から、作業記録のない日へずらすと、合計作業時間とタスクごとのリストを消して、データなしの表示を出す', async ({ page }) => {
      await open(page, { records: [todayRec(1500)] })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
      await ui(page).prev.click()
      await expectPeriod(page, 'day', '2026-10-10')
      await expectNoData(page)
    })

    test('[前の期間へのボタン押下 / データなしの表示を消す] 作業記録のない日から、作業記録のある日へずらすと、データなしの表示を消して、合計作業時間とタスクごとのリストを表示する', async ({ page }) => {
      await open(page, { records: [rec('2026-10-10T09:00', 1500)] })
      await expectNoData(page)
      await ui(page).prev.click()
      await expectPeriod(page, 'day', '2026-10-10')
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })

    test('[前の期間へのボタン押下 / 棒グラフの作り直し] 「月」の単位で 2026 年 3 月から 2 月へずらすと、30 日がなくなるので、棒グラフの目盛りから「30」を消す', async ({ page }) => {
      await open(page, { query: q({ view: 'month', date: '2026-03-15' }) })
      await expect(ui(page).numberTicks).toHaveText(['1', '5', '10', '15', '20', '25', '30'])
      await ui(page).prev.click()
      await expectPeriod(page, 'month', '2026-02-15')
      await expect(ui(page).numberTicks).toHaveText(['1', '5', '10', '15', '20', '25'])
    })
  })

  test.describe('次の期間へのボタン押下', () => {
    const nextCases: Shift[] = [
      { view: 'day', from: '2026-10-09', to: '2026-10-10', note: '1 日後' },
      { view: 'day', from: '2026-10-10', to: '2026-10-11', note: '1 日後。ちょうど今日' },
      { view: 'day', from: '2025-12-31', to: '2026-01-01', note: '1 日後。年をまたぐ' },
      { view: 'day', from: '2026-02-28', to: '2026-03-01', note: '1 日後。うるう年でない年の 2 月の最後の日の次' },
      { view: 'day', from: '2024-02-28', to: '2024-02-29', note: '1 日後。うるう年の 2 月 29 日' },
      { view: 'week', from: '2026-09-27', to: '2026-10-04', note: '7 日後' },
      { view: 'week', from: '2026-10-01', to: '2026-10-08', note: '7 日後。週の最初の日にはそろえない' },
      { view: 'week', from: '2026-10-04', to: '2026-10-11', note: '7 日後。ちょうど今日' },
      { view: 'week', from: '2026-09-30', to: '2026-10-07', note: '7 日後。ちょうど今日', now: WEDNESDAY },
      { view: 'week', from: '2026-10-01', to: '2026-10-07', note: '7 日後の 2026-10-08 は今日より後なので、今日の日付', now: WEDNESDAY },
      { view: 'week', from: '2026-10-04', to: '2026-10-07', note: '7 日後の 2026-10-11 は今日より後なので、今日の日付', now: WEDNESDAY },
      { view: 'month', from: '2026-08-15', to: '2026-09-15', note: '次の月の同じ日' },
      { view: 'month', from: '2025-12-15', to: '2026-01-15', note: '次の月の同じ日。年をまたぐ' },
      { view: 'month', from: '2026-07-31', to: '2026-08-31', note: '次の月にも 31 日があるので、同じ日' },
      { view: 'month', from: '2026-03-31', to: '2026-04-30', note: '次の月に 31 日がないので、その月の最後の日' },
      { view: 'month', from: '2026-01-31', to: '2026-02-28', note: 'うるう年でない年の 2 月に 31 日がないので、その月の最後の日' },
      { view: 'month', from: '2024-01-31', to: '2024-02-29', note: 'うるう年の 2 月に 31 日がないので、その月の最後の日' },
      { view: 'month', from: '2026-09-11', to: '2026-10-11', note: '次の月の同じ日。ちょうど今日' },
      { view: 'month', from: '2026-09-12', to: '2026-10-11', note: '次の月の同じ日の 2026-10-12 は今日より後なので、今日の日付' },
      { view: 'month', from: '2026-09-30', to: '2026-10-11', note: '次の月の同じ日の 2026-10-30 は今日より後なので、今日の日付' },
      { view: 'year', from: '2024-10-11', to: '2025-10-11', note: '次の年の同じ月日' },
      { view: 'year', from: '2023-02-28', to: '2024-02-28', note: '次の年の同じ月日' },
      { view: 'year', from: '2024-02-29', to: '2025-02-28', note: '次の年に 2 月 29 日がないので、2 月 28 日' },
      { view: 'year', from: '2025-10-11', to: '2026-10-11', note: '次の年の同じ月日。ちょうど今日' },
      { view: 'year', from: '2025-10-12', to: '2026-10-11', note: '次の年の同じ月日の 2026-10-12 は今日より後なので、今日の日付' },
      { view: 'year', from: '2025-12-31', to: '2026-10-11', note: '次の年の同じ月日の 2026-12-31 は今日より後なので、今日の日付' },
    ]
    for (const c of nextCases) {
      test(`[次の期間へのボタン押下 / ${tabOf(c.view)}] ${shiftName(c)}`, async ({ page }) => {
        await open(page, { query: q(queryOf(c.view, c.from)), now: c.now?.date })
        await expectPeriod(page, c.view, c.from as string)
        await ui(page).next.click()
        await expect(page).toHaveURL(hasQuery(queryOf(c.view, c.to)))
        await expectPeriod(page, c.view, c.to)
      })
    }

    test('[次の期間へのボタン押下 / view=day] URL クエリに view=day が付いているとき、date だけを書き換え、view は変えない', async ({ page }) => {
      await open(page, { query: q({ view: 'day', date: '2026-10-09' }) })
      await ui(page).next.click()
      await expect(page).toHaveURL(hasQuery({ view: 'day', date: '2026-10-10' }))
      await expectPeriod(page, 'day', '2026-10-10')
    })

    test('[次の期間へのボタン押下 / ブラウザの履歴] ブラウザの履歴に追加するので、ブラウザの戻るで、押す前の URL クエリの履歴画面に戻る', async ({ page }) => {
      await open(page, { query: q({ view: 'month', date: '2026-08-15' }) })
      await ui(page).next.click()
      await expect(page).toHaveURL(hasQuery({ view: 'month', date: '2026-09-15' }))
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'month', date: '2026-08-15' }))
    })

    test('[次の期間へのボタン押下 / 「次の期間へ」の活性（非活性にする）] 押して、今日を含む期間になると、「次の期間へ」を非活性にする', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-10' }) })
      await expect(ui(page).next).toBeEnabled()
      await ui(page).next.click()
      await expectPeriod(page, 'day', TODAY)
      await expect(ui(page).next).toBeDisabled()
    })

    test('[次の期間へのボタン押下 / 「次の期間へ」の活性（活性のまま）] 押しても、今日を含む期間より前なら、「次の期間へ」は活性のまま', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-09' }) })
      await ui(page).next.click()
      await expectPeriod(page, 'day', '2026-10-10')
      await expect(ui(page).next).toBeEnabled()
    })

    test('[次の期間へのボタン押下 / ポモドーロの数・合計・リストの作り直し] 押すと、ずらした期間の作業記録を集め直して、ポモドーロの数、合計作業時間、タスクごとのリストを表示し直す', async ({ page }) => {
      await open(page, {
        query: q({ date: '2026-10-10' }),
        tasks: [specTask, designTask],
        records: [rec('2026-10-10T09:00', 1500, specTask.id), todayRec(3000, designTask.id), todayRec(600)],
      })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[specTask.name, '25 分']] })
      await ui(page).next.click()
      await expectPeriod(page, 'day', TODAY)
      await expectResult(page, {
        count: '2 ポモドーロ',
        total: '1 時間',
        rows: [
          [designTask.name, '50 分'],
          [NO_TASK, '10 分'],
        ],
      })
    })

    test('[次の期間へのボタン押下 / データなしの表示を出す] 作業記録のある日から、作業記録のない日へずらすと、合計作業時間とタスクごとのリストを消して、データなしの表示を出す', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-10' }), records: [rec('2026-10-10T09:00', 1500)] })
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
      await ui(page).next.click()
      await expectPeriod(page, 'day', TODAY)
      await expectNoData(page)
    })

    test('[次の期間へのボタン押下 / データなしの表示を消す] 作業記録のない日から、作業記録のある日へずらすと、データなしの表示を消して、合計作業時間とタスクごとのリストを表示する', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-10' }), records: [todayRec(1500)] })
      await expectNoData(page)
      await ui(page).next.click()
      await expectPeriod(page, 'day', TODAY)
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })
  })

  test.describe('ブラウザの戻る・進むで、この画面の URL クエリが変わる', () => {
    const records = [
      todayRec(1500),
      // 同じ週の月曜日
      rec('2026-10-05T09:00', 3000),
      // 前の週の日曜日
      rec('2026-10-04T09:00', 600),
    ]

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 戻る（view）] タブを切り替えたあとブラウザの戻るで戻ると、戻ったあとの URL クエリでタブを選び直し、期間、「次の期間へ」の活性、ポモドーロの数、合計、リストを作り直す', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-05' }), records })
      await expectResult(page, { count: '1 ポモドーロ', total: '50 分', rows: [[NO_TASK, '50 分']] })
      await ui(page).tab('週').click()
      await expectPeriod(page, 'week', '2026-10-05')
      await expect(ui(page).next).toBeDisabled()
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ date: '2026-10-05' }))
      await expectPeriod(page, 'day', '2026-10-05')
      await expect(ui(page).next).toBeEnabled()
      await expectResult(page, { count: '1 ポモドーロ', total: '50 分', rows: [[NO_TASK, '50 分']] })
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 進む（view）] タブを切り替えてブラウザの戻るで戻ったあと、ブラウザの進むで進むと、進んだあとの URL クエリでタブを選び直し、期間、「次の期間へ」の活性、ポモドーロの数、合計、リストを作り直す', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-05' }), records })
      await ui(page).tab('週').click()
      await expectPeriod(page, 'week', '2026-10-05')
      await page.goBack()
      await expectPeriod(page, 'day', '2026-10-05')
      await page.goForward()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-10-05' }))
      await expectPeriod(page, 'week', '2026-10-05')
      await expect(ui(page).next).toBeDisabled()
      await expectResult(page, { count: '2 ポモドーロ', total: '1 時間 15 分', rows: [[NO_TASK, '1 時間 15 分']] })
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 戻る（date）] 「前の期間へ」を押したあとブラウザの戻るで戻ると、戻ったあとの URL クエリの date で、期間、「次の期間へ」の活性、ポモドーロの数、合計、リストを作り直す', async ({ page }) => {
      await open(page, { query: q({ view: 'week' }), records })
      await expectPeriod(page, 'week', TODAY)
      await ui(page).prev.click()
      await expectPeriod(page, 'week', '2026-10-04')
      await expectResult(page, { count: '1 ポモドーロ', total: '10 分', rows: [[NO_TASK, '10 分']] })
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'week' }))
      await expectPeriod(page, 'week', TODAY)
      await expect(ui(page).next).toBeDisabled()
      await expectResult(page, { count: '2 ポモドーロ', total: '1 時間 15 分', rows: [[NO_TASK, '1 時間 15 分']] })
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 進む（date）] 「前の期間へ」を押してブラウザの戻るで戻ったあと、ブラウザの進むで進むと、進んだあとの URL クエリの date で、期間、「次の期間へ」の活性、ポモドーロの数、合計、リストを作り直す', async ({ page }) => {
      await open(page, { query: q({ view: 'week' }), records })
      await ui(page).prev.click()
      await expectPeriod(page, 'week', '2026-10-04')
      await page.goBack()
      await expectPeriod(page, 'week', TODAY)
      await page.goForward()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-10-04' }))
      await expectPeriod(page, 'week', '2026-10-04')
      await expect(ui(page).next).toBeEnabled()
      await expectResult(page, { count: '1 ポモドーロ', total: '10 分', rows: [[NO_TASK, '10 分']] })
    })

    test('[ブラウザの戻る・進むで、この画面の URL クエリが変わる / 戻る（データなしの表示）] 作業記録のある期間から、ブラウザの戻るで作業記録のない期間に戻ると、合計作業時間とタスクごとのリストを消して、データなしの表示を出す', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-06' }), records })
      await expectNoData(page)
      await ui(page).prev.click()
      await expectResult(page, { count: '1 ポモドーロ', total: '50 分', rows: [[NO_TASK, '50 分']] })
      await page.goBack()
      await expectPeriod(page, 'day', '2026-10-06')
      await expectNoData(page)
    })
  })

  test.describe('画面を開いたまま日付が変わる', () => {
    /** 日本時間の 2026-10-10 23:59 */
    const BEFORE_MIDNIGHT = new Date(at('2026-10-10T23:59:00.000'))
    /** 時計を 2 分進めて、日本時間の 2026-10-11 0:01 にする */
    const passMidnight = (page: Page) => page.clock.fastForward(2 * 60 * 1000)

    test('[初期表示 / 今日（日付が変わっても作り直さない）] 日本時間の 2026-10-10 23:59 に date を省略して開き、0:01 まで時計が進んでも、期間は 2026/10/10 のままで、「次の期間へ」は非活性のまま', async ({ page }) => {
      await open(page, { now: BEFORE_MIDNIGHT })
      await expectPeriod(page, 'day', '2026-10-10')
      await expect(ui(page).next).toBeDisabled()
      await passMidnight(page)
      await expect(ui(page).period('2026/10/10')).toBeVisible()
      await expect(ui(page).next).toBeDisabled()
      await expect(page).toHaveURL(hasQuery({}))
    })

    test('[初期表示 / 今日（再読み込み）] 日本時間の 2026-10-10 23:59 に date=2026-10-10 で開き、0:01 まで時計が進んだあとで再読み込みすると、新しい今日（2026-10-11）を基準に、「次の期間へ」を活性にする', async ({ page }) => {
      await open(page, { now: BEFORE_MIDNIGHT, query: q({ date: '2026-10-10' }) })
      await expect(ui(page).next).toBeDisabled()
      await passMidnight(page)
      await page.reload()
      await expectPeriod(page, 'day', '2026-10-10')
      await expect(ui(page).next).toBeEnabled()
    })

    test('[前の期間へのボタン押下 / 今日（日付が変わったあと）] 日本時間の 2026-10-10 23:59 に date を省略して開き、0:01 まで時計が進んだあとで押すと、新しい今日（2026-10-11）の 1 日前の 2026-10-10 に書き換え、「次の期間へ」を活性にする', async ({ page }) => {
      await open(page, { now: BEFORE_MIDNIGHT })
      await expect(ui(page).next).toBeDisabled()
      await passMidnight(page)
      await ui(page).prev.click()
      await expect(page).toHaveURL(hasQuery({ date: '2026-10-10' }))
      await expectPeriod(page, 'day', '2026-10-10')
      await expect(ui(page).next).toBeEnabled()
    })

    test('[次の期間へのボタン押下 / 今日（日付が変わったあと）] 日本時間の 2026-10-10 23:59 に date=2026-10-09 で開き、0:01 まで時計が進んだあとで押すと、2026-10-10 は新しい今日（2026-10-11）より前なので、「次の期間へ」は活性のままで、もう 1 回押すと 2026-10-11 に書き換えて非活性にする', async ({ page }) => {
      await open(page, { now: BEFORE_MIDNIGHT, query: q({ date: '2026-10-09' }) })
      await expect(ui(page).next).toBeEnabled()
      await passMidnight(page)
      await ui(page).next.click()
      await expectPeriod(page, 'day', '2026-10-10')
      await expect(ui(page).next).toBeEnabled()
      await ui(page).next.click()
      await expect(page).toHaveURL(hasQuery({ date: '2026-10-11' }))
      await expectPeriod(page, 'day', '2026-10-11')
      await expect(ui(page).next).toBeDisabled()
    })

    test('[タブの切り替え / 今日（日付が変わったあと）] 日本時間の 2026-10-31 23:59 に date を省略して開き、0:01 まで時計が進んだあとで「月」のタブを押すと、新しい今日を含む月（2026/11）を表示する', async ({ page }) => {
      await open(page, { now: new Date(at('2026-10-31T23:59:00.000')) })
      await expectPeriod(page, 'day', '2026-10-31')
      await passMidnight(page)
      await ui(page).tab('月').click()
      await expect(page).toHaveURL(hasQuery({ view: 'month' }))
      await expectPeriod(page, 'month', '2026-11-01')
      await expect(ui(page).next).toBeDisabled()
    })
  })

  test.describe('共通ルール', () => {
    test('[共通ルール アクセシビリティ / Tab キーの順序（タブと「前の期間へ」）] 選んでいるタブから Tab キーを押していくと、「次の期間へ」より先に、「前の期間へ」にフォーカスが移る', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-10' }) })
      const u = ui(page)
      await expect(u.next).toBeEnabled()
      await u.selectedTab.focus()
      await expect(u.selectedTab).toBeFocused()
      // タブの中の移り方（Tab キーか矢印キーか）は実装によるので、「前の期間へ」に着くまで押す（残りのタブ 3 つ分と、余裕を 1 回）
      let reached = false
      for (let i = 0; i < 5 && !reached; i++) {
        await page.keyboard.press('Tab')
        expect(await isFocused(u.next)).toBe(false)
        reached = await isFocused(u.prev)
      }
      expect(reached).toBe(true)
    })

    test('[共通ルール アクセシビリティ / Tab キーの順序（「前の期間へ」と「次の期間へ」）] 「次の期間へ」が活性のとき、「前の期間へ」から Tab キーを押すと、「次の期間へ」にフォーカスが移る', async ({ page }) => {
      await open(page, { query: q({ date: '2026-10-10' }) })
      const u = ui(page)
      await expect(u.next).toBeEnabled()
      await u.prev.focus()
      await page.keyboard.press('Tab')
      await expect(u.next).toBeFocused()
    })

    test('[共通ルール 再読み込みで一覧に戻ったときに、検索条件とページを復元するか] タブを切り替え、「前の期間へ」を押したあとで再読み込みしても、同じ単位と期間を表示する', async ({ page }) => {
      await open(page, { records: [rec('2026-09-30T09:00', 1500)] })
      await ui(page).tab('週').click()
      await expectPeriod(page, 'week', TODAY)
      await ui(page).prev.click()
      await expectPeriod(page, 'week', '2026-10-04')
      await page.reload()
      await expect(page).toHaveURL(hasQuery({ view: 'week', date: '2026-10-04' }))
      await expectPeriod(page, 'week', '2026-10-04')
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })

    test('[共通ルール ブラウザの戻るで一覧に戻ったときに、検索条件とページを復元するか] タブを切り替え、「前の期間へ」を押したあとで別の画面へ移り、ブラウザの戻るで戻ると、同じ単位と期間を表示する', async ({ page }) => {
      await open(page, { records: [rec('2026-09-15T09:00', 1500)] })
      await ui(page).tab('月').click()
      await expectPeriod(page, 'month', TODAY)
      await ui(page).prev.click()
      await expectPeriod(page, 'month', '2026-09-11')
      await page.goto('/settings')
      await page.goBack()
      await expect(page).toHaveURL(hasQuery({ view: 'month', date: '2026-09-11' }))
      await expectPeriod(page, 'month', '2026-09-11')
      await expectResult(page, { count: '1 ポモドーロ', total: '25 分', rows: [[NO_TASK, '25 分']] })
    })
  })
})
