/**
 * SCR-002 タイマー の Playwright テスト
 *
 * 設計書: docs/screens/SCR-002_timer/SCR-002_timer.md
 * ワイヤーフレーム: docs/screens/SCR-002_timer/SCR-002_timer.html
 * 共通ヘッダーの設計書: docs/screens/HDR-001_app-header/HDR-001_app-header.md
 * ブラウザストレージ一覧: docs/screens/storage.md
 * 共通ルール: docs/screens/common-rules.md
 *
 * テスト名の先頭の [...] は、設計書のどこから作ったケースかを、場面・項目名・条件で示す。
 *   [document.title]                          … 冒頭の表の document.title
 *   [閲覧権限 利用者]                         … 3. 閲覧権限 の行
 *   [残り時間 表示内容]                       … 画面項目「残り時間」の表示内容
 *   [サイクルの進み具合 読み上げ名]           … 画面項目「サイクルの進み具合」の表示内容と備考
 *   [作業するタスク 選択肢]                   … 画面項目「作業するタスク」の備考
 *   [作業するタスク 活性条件]                 … 画面項目「作業するタスク」の活性条件
 *   [リセット 表示条件]                       … 画面項目「リセット」の表示条件（ほかのボタンも同じ形）
 *   [初期表示]                                … 5. 初期表示時の処理
 *   [開始]                                    … アクション「開始のボタン押下」（ほかのアクションも、操作名で書く）
 *   [スキップ / 作業 サイクルの回 1 / 動作中] … アクション「スキップのボタン押下」を、そのフェーズ・サイクルの回・動作で行ったとき
 *   [タイマーの状態が変わる]                  … アクション「タイマーの状態が変わる」
 *   [タイマーの状態が変わる / フェーズが完了する] … 同じく、共通ヘッダーがフェーズを完了にしたとき
 *   [共通ルール アクセシビリティ]             … 共通ルールの「アクセシビリティ」のルール
 *   [共通ルール ブラウザの戻るで…]           … 共通ルールの「遷移」の行
 * 2 つの出典に当たるケースは「/」で併記している。
 *
 * 実装についての前提:
 * - この画面は API を呼ばない。データは localStorage に持つ（キーと形式は storage.md）
 * - ボタン（リセット・開始・スキップ・一時停止・再開）は、文言がないので、設計書の読み上げ名で探す（button のロールと名前）
 * - 「作業するタスク」は、タグが「実装時に決める」なので、combobox のロールと、見出し「作業するタスク」の名前で探す
 *   （select 要素でも、開いて選ぶ独自の部品でも、同じロールになる）。
 *   選択肢は、select 要素なら中の option、そうでなければ、部品を押して開いたあとの option のロールで探す。
 *   選んでいる値は、select 要素なら選ばれている option の文言、そうでなければ、部品に表示している文言で確かめる。
 *   非活性のときは開けないので、選択肢の並びは確かめず、選んでいる値だけを確かめる
 * - 「残り時間」は、「MM:SS」の形の文言で探す（画面の中で、この形の文言は残り時間だけ）
 * - 「サイクルの進み具合」は、読み上げ名「サイクル {終えた回の数} / {設定の cycles}」で探す。点の数・塗り・横長は、目印がないので確かめない
 * - 特定の属性（data-* など）やライブラリ固有の DOM の形は前提にしない
 * - 共通ヘッダーの中身（リンク、作業記録の保存、音と通知、設定とタイマーの状態の読み方の細かな規則）は、ここでは確かめない
 *   （ヘッダーの設計書から別に確かめる）。この画面の手順が参照している箇所は、この画面で見える結果とストレージの値を確かめる
 * - 時刻は Playwright の時計で止めてある（日本時間の 2026-10-11 10:00）。`runFor` で進めたときだけ進み、タイマーの 1 秒ごとの処理も、そのときだけ動く。
 *   終了予定時刻と残り秒数を、ずれなしで確かめるため。画面の部品は、時計が止まっていても操作できること（開く・選ぶ・押す）を前提にしている
 * - 終了予定時刻は、文字列の書き方（ミリ秒の桁など）ではなく、指している時刻で比べる
 * - ブラウザ通知の許可は、標準の `Notification.permission` で調べ、`Notification.requestPermission()` で求め、
 *   通知は `new Notification(...)` で出すことを前提に、差し替えて数える
 */
import { expect, type Locator, type Page, test } from '@playwright/test'

// ---- ブラウザストレージ（docs/screens/storage.md）-----------------------------

const STG = {
  /** STG-001 設定 */
  settings: 'pomodoro:settings',
  /** STG-002 タスク */
  tasks: 'pomodoro:tasks',
  /** STG-003 作業記録 */
  records: 'pomodoro:records',
  /** STG-004 タイマーの状態 */
  timer: 'pomodoro:timer',
} as const

type Settings = {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cycles: number
  autoStartBreak: boolean
  autoStartWork: boolean
}

type Task = {
  id: string
  name: string
  color: string
  archived: boolean
  createdAt: string
}

type Phase = 'work' | 'shortBreak' | 'longBreak'
type Status = 'idle' | 'running' | 'paused'

type TimerState = {
  phase: Phase
  cycle: number
  status: Status
  phaseSeconds: number | null
  endsAt: string | null
  remainingSeconds: number | null
  taskId: string | null
}

type WorkRecord = { completedAt: string; taskId: string | null; seconds: number }

/** 設定の初期値（storage.md の STG-001） */
const DEFAULTS: Settings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cycles: 4,
  autoStartBreak: false,
  autoStartWork: false,
}

/** 初期値と、長さとサイクルが違う設定 */
const CHANGED: Settings = { ...DEFAULTS, workMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 30, cycles: 6 }

/** フェーズの長さ（秒）を、設定から決める */
const lengthOf = (phase: Phase, settings: Settings = DEFAULTS) =>
  ({ work: settings.workMinutes, shortBreak: settings.shortBreakMinutes, longBreak: settings.longBreakMinutes })[phase] * 60

// ---- 固定するもの ------------------------------------------------------------

const TIMER_PATH = '/'
/** 「今日」と現在の時刻（日本時間の 2026-10-11 10:00） */
const NOW = new Date('2026-10-11T01:00:00.000Z')
/** 現在の時刻（NOW）から ms ミリ秒後の時刻 */
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString()

// ---- 文言 --------------------------------------------------------------------

const TITLE = 'タイマー'
const NO_TASK = 'タスクなし'
const PHASES: Phase[] = ['work', 'shortBreak', 'longBreak']
const STATUSES: Status[] = ['idle', 'running', 'paused']
const PHASE_NAME: Record<Phase, string> = { work: '作業', shortBreak: '小休憩', longBreak: '長休憩' }
const STATUS_NAME: Record<Status, string> = { idle: '開始前', running: '動作中', paused: '一時停止中' }
/** サイクルの進み具合の読み上げ名 */
const progressName = (done: number, cycles: number) => `サイクル ${done} / ${cycles}`

// ---- タスク ------------------------------------------------------------------

const T1: Task = { id: '11111111-1111-4111-8111-111111111111', name: '仕様書を書く', color: '#EF4444', archived: false, createdAt: '2026-10-01T00:00:00.000Z' }
const ARCHIVED: Task = { id: '22222222-2222-4222-8222-222222222222', name: '古いタスク', color: '#22C55E', archived: true, createdAt: '2026-10-02T00:00:00.000Z' }
const T2: Task = { id: '33333333-3333-4333-8333-333333333333', name: '画面設計', color: '#3B82F6', archived: false, createdAt: '2026-10-03T00:00:00.000Z' }
/** アーカイブしたタスクを、間に挟んである */
const TASKS: Task[] = [T1, ARCHIVED, T2]
/** タスクの中にない ID */
const UNKNOWN_ID = '99999999-9999-4999-8999-999999999999'

// ---- タイマーの状態 ----------------------------------------------------------

type TimerOptions = {
  cycle?: number
  taskId?: string | null
  /** フェーズの長さ（秒）。省略したときは、設定の初期値での長さ */
  phaseSeconds?: number
  /** 残り（ミリ秒）。省略したときは、フェーズの長さより 8 秒少ない（作業なら 24:52） */
  remainingMs?: number
}

/** タイマーの状態を作る。動作に合わせて、持たない項目は null にする（storage.md の STG-004） */
function timer(phase: Phase, status: Status, options: TimerOptions = {}): TimerState {
  const phaseSeconds = options.phaseSeconds ?? lengthOf(phase)
  const remainingMs = options.remainingMs ?? (phaseSeconds - 8) * 1000
  return {
    phase,
    cycle: options.cycle ?? 1,
    status,
    phaseSeconds: status === 'idle' ? null : phaseSeconds,
    endsAt: status === 'running' ? at(remainingMs) : null,
    remainingSeconds: status === 'paused' ? Math.ceil(remainingMs / 1000) : null,
    taskId: options.taskId ?? null,
  }
}

/** 秒数を「MM:SS」にする（期待値を作るため） */
const mmss = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

// ---- 部品（番号はワイヤーフレームの data-no） -------------------------------

const ui = (page: Page) => ({
  remaining: page.getByText(/^\d{2,3}:\d{2}$/), // No.1
  /** No.2。読み上げ名で探す */
  progress: (done: number, cycles: number) =>
    page
      .getByLabel(progressName(done, cycles), { exact: true })
      .or(page.getByRole('img', { name: progressName(done, cycles), exact: true }))
      .first(),
  reset: page.getByRole('button', { name: 'リセット', exact: true }), // No.3
  start: page.getByRole('button', { name: '開始', exact: true }), // No.4
  skip: page.getByRole('button', { name: 'スキップ', exact: true }), // No.5
  taskLabel: page.getByText('作業するタスク', { exact: true }), // No.6
  task: page.getByRole('combobox', { name: '作業するタスク', exact: true }), // No.8
  pause: page.getByRole('button', { name: '一時停止', exact: true }), // No.9
  resume: page.getByRole('button', { name: '再開', exact: true }), // No.10
})

type Ui = ReturnType<typeof ui>

type ButtonItem = {
  /** 項目名（読み上げ名と同じ） */
  name: string
  locator: (u: Ui) => Locator
  /** 表示する動作 */
  shownIn: Status[]
}

const buttons: ButtonItem[] = [
  { name: 'リセット', locator: (u) => u.reset, shownIn: ['running', 'paused'] },
  { name: '開始', locator: (u) => u.start, shownIn: ['idle'] },
  { name: 'スキップ', locator: (u) => u.skip, shownIn: ['idle', 'running', 'paused'] },
  { name: '一時停止', locator: (u) => u.pause, shownIn: ['running'] },
  { name: '再開', locator: (u) => u.resume, shownIn: ['paused'] },
]

// ---- 「作業するタスク」の操作 ------------------------------------------------

/** 「作業するタスク」が select 要素かどうか */
const isSelectElement = (task: Locator) => task.evaluate((el) => el.tagName === 'SELECT')

/** 止めている時計を少し進めて、選択欄の開閉を終わらせ、時刻を元に戻す（時計を止めたままだと、選択欄が開ききらない） */
async function settleTaskSelect(page: Page) {
  const now = await page.evaluate(() => Date.now())
  await page.clock.runFor(500)
  await page.clock.setSystemTime(now)
}

/** 「作業するタスク」を押して、選択肢を開く */
async function openTaskOptions(page: Page) {
  await ui(page).task.click()
  await settleTaskSelect(page)
}

/** 「作業するタスク」の選択肢（select 要素でなければ、押して開く） */
async function taskOptions(page: Page): Promise<Locator> {
  const { task } = ui(page)
  if (await isSelectElement(task)) return task.locator('option')
  await openTaskOptions(page)
  return page.getByRole('option')
}

/** 「作業するタスク」で、文言が name の選択肢を選ぶ */
async function chooseTask(page: Page, name: string) {
  const { task } = ui(page)
  if (await isSelectElement(task)) {
    await task.selectOption({ label: name })
    return
  }
  await openTaskOptions(page)
  await page.getByRole('option', { name, exact: true }).click()
  await settleTaskSelect(page)
}

/** 「作業するタスク」で選んでいる値の文言が、name になるのを待つ */
async function expectSelectedTask(page: Page, name: string) {
  await expect
    .poll(() =>
      ui(page).task.evaluate((el) =>
        (el instanceof HTMLSelectElement ? (el.selectedOptions[0]?.textContent ?? '') : (el.textContent ?? '')).trim(),
      ),
    )
    .toBe(name)
}

// ---- ストレージの読み書き ----------------------------------------------------

type Seed = {
  settings?: Record<string, unknown>
  tasks?: unknown
  /** タスクのキーに、JSON にせず、そのまま入れる文字列（JSON として読めない値を作る） */
  tasksRaw?: string
  records?: unknown
  timer?: Record<string, unknown>
}

/**
 * 画面を開く前に、ストレージに値を入れておく。指定しなかったものは、値がない状態にする。
 * 入れるのは、このテストで最初にページを開いたときの 1 回だけ（再読み込みや遷移では入れ直さない）
 */
async function seed(page: Page, values: Seed) {
  const entries: [string, string][] = []
  if (values.settings !== undefined) entries.push([STG.settings, JSON.stringify(values.settings)])
  if (values.tasks !== undefined) entries.push([STG.tasks, JSON.stringify(values.tasks)])
  if (values.tasksRaw !== undefined) entries.push([STG.tasks, values.tasksRaw])
  if (values.records !== undefined) entries.push([STG.records, JSON.stringify(values.records)])
  if (values.timer !== undefined) entries.push([STG.timer, JSON.stringify(values.timer)])
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

/** 画面を開いたあとで、ストレージの値を書き換える（別の画面でタスクを変えたあとの状態を作る） */
async function write(page: Page, key: string, value: unknown) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(value)] as const)
}

/** 終了予定時刻を、指している時刻（ミリ秒）にして比べられるようにする */
const comparable = (state: TimerState | null) =>
  state && { ...state, endsAt: typeof state.endsAt === 'string' ? Date.parse(state.endsAt) : state.endsAt }

/** タイマーの状態（STG-004）が、期待する値になるのを待つ */
async function expectTimer(page: Page, want: TimerState) {
  await expect.poll(async () => comparable(await read<TimerState>(page, STG.timer))).toEqual(comparable(want))
}

// ---- 画面を開く -------------------------------------------------------------

/** 設定は初期値、タスクは TASKS で、タイマーの状態を指定した値にする */
const withTimer = (state?: TimerState, more: Seed = {}): Seed => ({
  settings: DEFAULTS,
  tasks: TASKS,
  ...(state ? { timer: state } : {}),
  ...more,
})

/** ストレージに値を入れて、タイマー画面を開く。時計は NOW で止めておく */
async function open(page: Page, values: Seed = withTimer()) {
  // 止める時刻（NOW）が過去にならないように、少し前の時刻で時計を入れてから、NOW で止める
  await page.clock.install({ time: NOW.getTime() - 60_000 })
  await page.clock.pauseAt(NOW)
  await seed(page, values)
  await page.goto(TIMER_PATH)
  await expect(ui(page).skip).toBeVisible()
}

// ---- ブラウザ通知の許可 ------------------------------------------------------

/**
 * ブラウザ通知の許可の状態を permission にし、許可を求めた回数と、通知を出した回数を数えられるようにする。
 * 許可を求めても、利用者は答えない（答えを待つ実装だと、先へ進まない）
 */
async function stubNotification(page: Page, permission: 'default' | 'granted' | 'denied') {
  await page.addInitScript((p) => {
    const counter = { count: 0, shown: 0 }
    class NotificationStub {
      constructor() {
        counter.shown += 1
      }
      static get permission() {
        return p
      }
      static requestPermission() {
        counter.count += 1
        return new Promise(() => {})
      }
      close() {}
    }
    Object.defineProperty(window, '__permissionRequests', { value: counter, configurable: true })
    Object.defineProperty(window, 'Notification', { value: NotificationStub, configurable: true, writable: true })
  }, permission)
}

/** ブラウザに通知の許可を求めた回数 */
const permissionRequests = (page: Page) =>
  page.evaluate(() => (window as unknown as { __permissionRequests: { count: number } }).__permissionRequests.count)

/** ブラウザ通知を出した回数 */
const notificationsShown = (page: Page) =>
  page.evaluate(() => (window as unknown as { __permissionRequests: { shown: number } }).__permissionRequests.shown)

/** 部品の左端の位置 */
async function left(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('部品が表示されていない')
  return box.x
}

// ---- テスト -----------------------------------------------------------------

test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 1280, height: 720 } })

test.describe('SCR-002 タイマー', () => {
  test.describe('冒頭の表・閲覧権限', () => {
    for (const status of ['idle', 'paused'] as const) {
      test(`[document.title] 動作が${STATUS_NAME[status]}のとき、「タイマー」にする`, async ({ page }) => {
        await open(page, withTimer(timer('work', status)))
        await expect(page).toHaveTitle(TITLE)
      })
    }

    test('[document.title] 動作が動作中のとき、残り時間を頭に付けて「24:52 タイマー」にする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running')))
      await expect(page).toHaveTitle(`24:52 ${TITLE}`)
    })

    test('[閲覧権限 利用者] タイマー画面を開ける', async ({ page }) => {
      await open(page)
      await expect(page).toHaveURL((url) => url.pathname === TIMER_PATH)
      await expect(ui(page).remaining).toBeVisible()
    })
  })

  test.describe('画面項目の条件・値', () => {
    // ---- 残り時間 ----

    for (const phase of PHASES) {
      test(`[残り時間 表示内容] 開始前で、フェーズが${PHASE_NAME[phase]}のとき、設定での${PHASE_NAME[phase]}の長さ（${mmss(lengthOf(phase, CHANGED))}）を表示する`, async ({ page }) => {
        await open(page, withTimer(timer(phase, 'idle'), { settings: CHANGED }))
        await expect(ui(page).remaining).toHaveText(mmss(lengthOf(phase, CHANGED)))
      })
    }

    const idleFormats: { workMinutes: number; text: string; note: string }[] = [
      { workMinutes: 5, text: '05:00', note: '分を 2 桁にそろえる' },
      { workMinutes: 95, text: '95:00', note: '100 分より短いので、分は 2 桁' },
      { workMinutes: 100, text: '100:00', note: '100 分以上なので、分を 3 桁で表示する' },
      { workMinutes: 120, text: '120:00', note: '分を 3 桁で表示する' },
    ]
    for (const c of idleFormats) {
      test(`[残り時間 表示内容] 開始前で、作業時間の設定が ${c.workMinutes} 分のとき、「${c.text}」と表示する（${c.note}）`, async ({ page }) => {
        await open(page, withTimer(timer('work', 'idle'), { settings: { ...DEFAULTS, workMinutes: c.workMinutes } }))
        await expect(ui(page).remaining).toHaveText(c.text)
      })
    }

    const runningFormats: { remainingMs: number; text: string; note: string }[] = [
      { remainingMs: 1_492_000, text: '24:52', note: '終了予定時刻 − 現在の時刻' },
      { remainingMs: 1_491_500, text: '24:52', note: '1 秒未満は切り上げ' },
      { remainingMs: 1_491_001, text: '24:52', note: '1 ミリ秒でも切り上げ' },
      { remainingMs: 1_491_000, text: '24:51', note: '端数がなければ、そのまま' },
      { remainingMs: 9_000, text: '00:09', note: '分も秒も 2 桁にそろえる' },
      { remainingMs: 5_999_000, text: '99:59', note: '100 分より短いので、分は 2 桁' },
      { remainingMs: 6_005_000, text: '100:05', note: '100 分以上なので、分を 3 桁で表示する' },
    ]
    for (const c of runningFormats) {
      test(`[残り時間 表示内容] 動作中で、終了予定時刻まで ${c.remainingMs / 1000} 秒のとき、「${c.text}」と表示する（${c.note}）`, async ({ page }) => {
        await open(page, withTimer(timer('work', 'running', { phaseSeconds: 120 * 60, remainingMs: c.remainingMs }), { settings: { ...DEFAULTS, workMinutes: 120 } }))
        await expect(ui(page).remaining).toHaveText(c.text)
      })
    }

    test('[残り時間 表示内容] 動作中に 1 秒たつと、表示と document.title の残り時間が 1 秒減る', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running')))
      await expect(ui(page).remaining).toHaveText('24:52')
      await page.clock.runFor(1000)
      await expect(ui(page).remaining).toHaveText('24:51')
      await expect(page).toHaveTitle(`24:51 ${TITLE}`)
    })

    test('[残り時間 表示内容] 一時停止中は、残り秒数を表示する（設定でのフェーズの長さではない）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'paused', { remainingMs: 754_000 })))
      await expect(ui(page).remaining).toHaveText('12:34')
    })

    test('[残り時間 表示内容] 一時停止中に時間がたっても、表示は変わらない', async ({ page }) => {
      await open(page, withTimer(timer('work', 'paused')))
      await expect(ui(page).remaining).toHaveText('24:52')
      await page.clock.runFor(5000)
      await expect(ui(page).remaining).toHaveText('24:52')
      await expectTimer(page, timer('work', 'paused'))
    })

    test('[残り時間 表示内容] 開始前に時間がたっても、表示は変わらない', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      await expect(ui(page).remaining).toHaveText('25:00')
      await page.clock.runFor(5000)
      await expect(ui(page).remaining).toHaveText('25:00')
    })

    // ---- サイクルの進み具合 ----

    const progressCases: { phase: Phase; cycle: number; cycles: number; done: number; note: string }[] = [
      { phase: 'work', cycle: 1, cycles: 4, done: 0, note: '作業のときは「サイクルの回 − 1」' },
      { phase: 'work', cycle: 3, cycles: 4, done: 2, note: '作業のときは「サイクルの回 − 1」' },
      { phase: 'work', cycle: 4, cycles: 4, done: 3, note: '最後の回の作業' },
      { phase: 'shortBreak', cycle: 3, cycles: 4, done: 3, note: '休憩のときは「サイクルの回」' },
      { phase: 'longBreak', cycle: 4, cycles: 4, done: 4, note: '休憩のときは「サイクルの回」' },
      { phase: 'work', cycle: 5, cycles: 4, done: 4, note: '設定のサイクルとちょうど同じ' },
      { phase: 'work', cycle: 6, cycles: 4, done: 4, note: '設定のサイクルを超えるので、設定のサイクルと同じにする' },
      { phase: 'shortBreak', cycle: 5, cycles: 4, done: 4, note: '設定のサイクルを超えるので、設定のサイクルと同じにする' },
      { phase: 'work', cycle: 1, cycles: 6, done: 0, note: '分母は設定のサイクル' },
      { phase: 'longBreak', cycle: 1, cycles: 1, done: 1, note: '設定のサイクルが 1' },
    ]
    for (const c of progressCases) {
      test(`[サイクルの進み具合 読み上げ名] フェーズが${PHASE_NAME[c.phase]}、サイクルの回が ${c.cycle}、設定のサイクルが ${c.cycles} のとき、「${progressName(c.done, c.cycles)}」にする（${c.note}）`, async ({ page }) => {
        await open(page, withTimer(timer(c.phase, 'idle', { cycle: c.cycle }), { settings: { ...DEFAULTS, cycles: c.cycles } }))
        await expect(ui(page).progress(c.done, c.cycles)).toBeVisible()
      })
    }

    // ---- 作業するタスク ----

    test('[作業するタスクの見出し 表示内容] 「作業するタスク」と表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).taskLabel).toBeVisible()
    })

    test('[作業するタスク 初期値] 選択中のタスクを持つとき、そのタスクを選んだ状態で表示する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { taskId: T2.id })))
      await expectSelectedTask(page, T2.name)
    })

    test('[作業するタスク 初期値] 選択中のタスクを持たないとき、「タスクなし」を選んだ状態で表示する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { taskId: null })))
      await expectSelectedTask(page, NO_TASK)
    })

    test('[作業するタスク 選択肢] 先頭に「タスクなし」、続けて、アーカイブしていないタスクを、配列の並び順のまま、名前で並べる（アーカイブしたタスクは含めない）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      await expect(await taskOptions(page)).toHaveText([NO_TASK, T1.name, T2.name])
    })

    const emptyTasks: { name: string; seed: Seed }[] = [
      { name: 'タスクに値がない', seed: { settings: DEFAULTS } },
      { name: 'タスクが配列でない', seed: { settings: DEFAULTS, tasks: { id: T1.id, name: T1.name } } },
      { name: 'タスクが 0 件', seed: { settings: DEFAULTS, tasks: [] } },
      { name: 'タスクの値が JSON として読めない', seed: { settings: DEFAULTS, tasksRaw: '[{"id":' } },
    ]
    for (const c of emptyTasks) {
      test(`[作業するタスク 選択肢 / タイマーの状態が変わる] ${c.name}とき、選択肢は「タスクなし」だけにする`, async ({ page }) => {
        await open(page, c.seed)
        await expect(await taskOptions(page)).toHaveText([NO_TASK])
      })
    }

    const invalidTasks: { name: string; element: unknown }[] = [
      { name: '必須のフィールド（name）がない', element: { id: UNKNOWN_ID, color: '#000000', archived: false, createdAt: at(0) } },
      { name: '型が違う（archived が文字列）', element: { id: UNKNOWN_ID, name: '形式に合わない', color: '#000000', archived: 'false', createdAt: at(0) } },
      { name: 'color が #RRGGBB の形でない', element: { id: UNKNOWN_ID, name: '形式に合わない', color: 'red', archived: false, createdAt: at(0) } },
      { name: 'createdAt が日時として読めない', element: { id: UNKNOWN_ID, name: '形式に合わない', color: '#000000', archived: false, createdAt: 'きのう' } },
      { name: 'オブジェクトでない', element: null },
    ]
    for (const c of invalidTasks) {
      test(`[作業するタスク 選択肢 / タイマーの状態が変わる] タスクの要素が形式に合わない（${c.name}）とき、その要素は、ないものとして扱う`, async ({ page }) => {
        await open(page, { settings: DEFAULTS, tasks: [T1, c.element, T2] })
        await expect(await taskOptions(page)).toHaveText([NO_TASK, T1.name, T2.name])
      })
    }

    // 内容の範囲（名前の文字数、ID の形）は確かめない。色の英字は、大文字と小文字を区別しない
    const acceptedTasks: { name: string; task: Task }[] = [
      { name: '名前が 51 文字', task: { ...T2, id: UNKNOWN_ID, name: 'あ'.repeat(51) } },
      { name: '色の英字が小文字（#ef4444）', task: { ...T2, id: UNKNOWN_ID, name: '色が小文字', color: '#ef4444' } },
      { name: 'ID が UUID の形でない', task: { ...T2, id: 'task-1', name: 'ID が短い' } },
    ]
    for (const c of acceptedTasks) {
      test(`[作業するタスク 選択肢 / タイマーの状態が変わる] ${c.name}のタスクは、形式に合うものとして、選択肢に含める`, async ({ page }) => {
        await open(page, { settings: DEFAULTS, tasks: [T1, c.task] })
        await expect(await taskOptions(page)).toHaveText([NO_TASK, T1.name, c.task.name])
      })
    }

    for (const phase of PHASES) {
      for (const status of STATUSES) {
        const enabled = phase !== 'work' || status === 'idle'
        test(`[作業するタスク 活性条件] フェーズが${PHASE_NAME[phase]}で、動作が${STATUS_NAME[status]}のとき、${enabled ? '活性' : '非活性'}にする`, async ({ page }) => {
          await open(page, withTimer(timer(phase, status, { taskId: T1.id })))
          await expectSelectedTask(page, T1.name)
          if (enabled) await expect(ui(page).task).toBeEnabled()
          else await expect(ui(page).task).toBeDisabled()
        })
      }
    }

    test('[作業するタスク 選択肢] 非活性で、選択中のタスクがアーカイブされているとき、そのタスクを選んだ状態で表示し、選択中のタスクの値は変えない', async ({ page }) => {
      const state = timer('work', 'running', { taskId: ARCHIVED.id })
      await open(page, withTimer(state))
      await expectSelectedTask(page, ARCHIVED.name)
      await expect(ui(page).task).toBeDisabled()
      expect(comparable(await read<TimerState>(page, STG.timer))).toEqual(comparable(state))
    })

    test('[作業するタスク 選択肢] 非活性で、選択中のタスクがタスクの中に見つからないとき、「タスクなし」を選んだ状態で表示し、選択中のタスクの値は変えない', async ({ page }) => {
      const state = timer('work', 'paused', { taskId: UNKNOWN_ID })
      await open(page, withTimer(state))
      await expectSelectedTask(page, NO_TASK)
      await expect(ui(page).task).toBeDisabled()
      expect(await read<TimerState>(page, STG.timer)).toEqual(state)
    })

    // ---- ボタン ----

    for (const button of buttons) {
      for (const phase of PHASES) {
        for (const status of STATUSES) {
          const shown = button.shownIn.includes(status)
          test(`[${button.name} 表示条件] フェーズが${PHASE_NAME[phase]}で、動作が${STATUS_NAME[status]}のとき、表示${shown ? 'する' : 'しない'}`, async ({ page }) => {
            // スキップは常に表示するので、open が、表示されるのを待っている
            await open(page, withTimer(timer(phase, status)))
            if (shown) await expect(button.locator(ui(page))).toBeVisible()
            else await expect(button.locator(ui(page))).toBeHidden()
          })
        }
      }

      test(`[${button.name} 活性条件] 表示しているとき、活性にする`, async ({ page }) => {
        await open(page, withTimer(timer('work', button.shownIn[0])))
        await expect(button.locator(ui(page))).toBeEnabled()
      })
    }

    const middleButtons: { name: string; status: Status; locator: (u: Ui) => Locator }[] = [
      { name: '一時停止', status: 'running', locator: (u) => u.pause },
      { name: '再開', status: 'paused', locator: (u) => u.resume },
    ]
    for (const c of middleButtons) {
      test(`[${c.name} 備考] 開始のボタンと同じ位置（リセットの右、スキップの左）に表示する`, async ({ page }) => {
        await open(page, withTimer(timer('work', c.status)))
        const u = ui(page)
        const x = await left(c.locator(u))
        expect(await left(u.reset)).toBeLessThan(x)
        expect(x).toBeLessThan(await left(u.skip))
      })
    }

    test('[開始 備考] スキップの左に表示する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      expect(await left(ui(page).start)).toBeLessThan(await left(ui(page).skip))
    })
  })

  test.describe('初期表示時の処理', () => {
    test('[初期表示] 設定にもタイマーの状態にも値がないとき、最初の状態（残り時間 25:00、サイクル 0 / 4、開始のボタン、「タスクなし」）を表示する', async ({ page }) => {
      await open(page, {})
      const u = ui(page)
      await expect(u.remaining).toHaveText('25:00')
      await expect(u.progress(0, 4)).toBeVisible()
      await expect(u.start).toBeVisible()
      await expect(u.reset).toBeHidden()
      await expectSelectedTask(page, NO_TASK)
    })

    test('[初期表示] 動作中で、終了予定時刻を過ぎている状態で開くと、共通ヘッダーがフェーズを完了にしたあとの状態（小休憩の開始前）を表示する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { remainingMs: -10_000 })))
      const u = ui(page)
      await expect(u.remaining).toHaveText('05:00')
      await expect(u.progress(1, 4)).toBeVisible()
      await expect(u.start).toBeVisible()
      await expect(u.pause).toBeHidden()
      await expect(page).toHaveTitle(TITLE)
    })

    test('[初期表示] 動作中で、現在の時刻が終了予定時刻とちょうど同じ状態で開くと、フェーズを完了にしたあとの状態（小休憩の開始前）を表示する（「00:00」は表示しない）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { remainingMs: 0 })))
      await expect(ui(page).start).toBeVisible()
      await expect(ui(page).remaining).toHaveText('05:00')
      await expectTimer(page, timer('shortBreak', 'idle'))
    })

    test('[初期表示] 動作中で、終了予定時刻まで 1 ミリ秒ある状態で開くと、完了にせず、残り時間を「00:01」と表示する', async ({ page }) => {
      const state = timer('work', 'running', { remainingMs: 1 })
      await open(page, withTimer(state))
      await expect(ui(page).pause).toBeVisible()
      await expect(ui(page).remaining).toHaveText('00:01')
      expect(await read<TimerState>(page, STG.timer)).toEqual(state)
    })

    test('[初期表示 / タイマーの状態が変わる] 活性で、選択中のタスクがアーカイブされているとき、「タスクなし」にして、タイマーの状態を保存する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { cycle: 2, taskId: ARCHIVED.id })))
      await expectSelectedTask(page, NO_TASK)
      await expectTimer(page, timer('work', 'idle', { cycle: 2, taskId: null }))
    })

    test('[初期表示 / タイマーの状態が変わる] 活性で、選択中のタスクがタスクの中にないとき、「タスクなし」にして、タイマーの状態を保存する', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'running', { taskId: UNKNOWN_ID })))
      await expectSelectedTask(page, NO_TASK)
      await expectTimer(page, timer('shortBreak', 'running', { taskId: null }))
    })

    test('[初期表示 / タイマーの状態が変わる] 活性で、選択中のタスクがアーカイブされていないとき、選択中のタスクは変えない', async ({ page }) => {
      const state = timer('shortBreak', 'paused', { taskId: T2.id })
      await open(page, withTimer(state))
      await expectSelectedTask(page, T2.name)
      expect(await read<TimerState>(page, STG.timer)).toEqual(state)
    })
  })

  test.describe('リセットのボタン押下', () => {
    const cases: { phase: Phase; status: 'running' | 'paused'; cycle: number }[] = [
      { phase: 'work', status: 'running', cycle: 2 },
      { phase: 'work', status: 'paused', cycle: 3 },
      { phase: 'shortBreak', status: 'running', cycle: 2 },
      { phase: 'longBreak', status: 'paused', cycle: 4 },
    ]
    for (const c of cases) {
      test(`[リセット] ${PHASE_NAME[c.phase]}の${STATUS_NAME[c.status]}（サイクルの回 ${c.cycle}）で押すと、動作を開始前にし、フェーズの長さ・終了予定時刻・残り秒数を null にして保存する（フェーズとサイクルの回は変えない）`, async ({ page }) => {
        await open(page, withTimer(timer(c.phase, c.status, { cycle: c.cycle, taskId: T1.id })))
        await ui(page).reset.click()
        await expectTimer(page, timer(c.phase, 'idle', { cycle: c.cycle, taskId: T1.id }))
      })
    }

    test('[リセット] 作業の動作中で押しても、作業記録は作らない', async ({ page }) => {
      const records: WorkRecord[] = [{ completedAt: '2026-10-10T03:00:00.000Z', taskId: null, seconds: 1500 }]
      await open(page, withTimer(timer('work', 'running'), { records }))
      await ui(page).reset.click()
      await expectTimer(page, timer('work', 'idle'))
      expect(await read<WorkRecord[]>(page, STG.records)).toEqual(records)
    })

    test('[リセット] 残り時間を、設定でのフェーズの長さに戻す（進行中だったフェーズの長さではなく、いまの設定の長さ）', async ({ page }) => {
      // 25 分で始めた作業フェーズの途中。設定は、そのあとで 50 分に変えてある
      await open(page, withTimer(timer('work', 'running'), { settings: CHANGED }))
      await expect(ui(page).remaining).toHaveText('24:52')
      await ui(page).reset.click()
      await expect(ui(page).remaining).toHaveText('50:00')
    })

    test('[リセット] 開始のボタンを表示し、リセット・一時停止・再開のボタンを非表示にする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'paused')))
      const u = ui(page)
      await u.reset.click()
      await expect(u.start).toBeVisible()
      await expect(u.reset).toBeHidden()
      await expect(u.pause).toBeHidden()
      await expect(u.resume).toBeHidden()
    })

    test('[リセット] 作業の動作中で押すと、作業するタスクの非活性を解除する（選んでいる値は残す）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { taskId: T2.id })))
      await expect(ui(page).task).toBeDisabled()
      await ui(page).reset.click()
      await expect(ui(page).task).toBeEnabled()
      await expectSelectedTask(page, T2.name)
    })

    test('[リセット / タイマーの状態が変わる] 非活性の間にアーカイブされていたタスクは、リセットで活性に戻ったときに「タスクなし」にして保存する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { taskId: ARCHIVED.id })))
      await expectSelectedTask(page, ARCHIVED.name)
      await ui(page).reset.click()
      await expectSelectedTask(page, NO_TASK)
      await expectTimer(page, timer('work', 'idle', { taskId: null }))
    })

    test('[リセット] 押したあとは、時間がたっても、開始前のまま変わらない', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { remainingMs: 3000 })))
      await ui(page).reset.click()
      await expectTimer(page, timer('work', 'idle'))
      await page.clock.runFor(5000)
      await expect(ui(page).remaining).toHaveText('25:00')
      expect(await read<TimerState>(page, STG.timer)).toEqual(timer('work', 'idle'))
    })
  })

  test.describe('開始のボタン押下', () => {
    for (const phase of PHASES) {
      const seconds = lengthOf(phase, CHANGED)
      test(`[開始] フェーズが${PHASE_NAME[phase]}のとき、フェーズの長さを設定での長さ（${seconds} 秒）、終了予定時刻を「現在の時刻 ＋ フェーズの長さ」、動作を動作中にして保存する（残り秒数は null のまま）`, async ({ page }) => {
        await open(page, withTimer(timer(phase, 'idle', { cycle: 2, taskId: T1.id }), { settings: CHANGED }))
        await ui(page).start.click()
        await expectTimer(page, timer(phase, 'running', { cycle: 2, taskId: T1.id, phaseSeconds: seconds, remainingMs: seconds * 1000 }))
      })
    }

    test('[開始] 終了予定時刻は、画面を開いた時刻ではなく、押した時刻から数える', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      await page.clock.runFor(90_000)
      await ui(page).start.click()
      await expectTimer(page, timer('work', 'running', { remainingMs: 90_000 + 1500 * 1000 }))
    })

    const permissions: { permission: 'default' | 'granted' | 'denied'; name: string; requests: number; result: string }[] = [
      { permission: 'default', name: 'まだ許可も拒否もしていない', requests: 1, result: 'ブラウザに通知の許可を 1 回求める' },
      { permission: 'granted', name: 'すでに許可している', requests: 0, result: '通知の許可を求めない' },
      { permission: 'denied', name: 'すでに拒否している', requests: 0, result: '通知の許可を求めない' },
    ]
    for (const c of permissions) {
      test(`[開始] ブラウザ通知を${c.name}とき、${c.result}`, async ({ page }) => {
        await stubNotification(page, c.permission)
        await open(page, withTimer(timer('work', 'idle')))
        await ui(page).start.click()
        await expect(ui(page).pause).toBeVisible()
        await expect.poll(() => permissionRequests(page)).toBe(c.requests)
      })
    }

    test('[開始] 通知の許可に利用者が答えるのを待たずに、タイマーを開始する', async ({ page }) => {
      await stubNotification(page, 'default')
      await open(page, withTimer(timer('work', 'idle')))
      await ui(page).start.click()
      await expectTimer(page, timer('work', 'running', { remainingMs: 1500 * 1000 }))
      await page.clock.runFor(1000)
      await expect(ui(page).remaining).toHaveText('24:59')
    })

    test('[開始] 残り時間を表示し、1 秒ごとに減らす', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      await ui(page).start.click()
      await expect(ui(page).pause).toBeVisible()
      await expect(ui(page).remaining).toHaveText('25:00')
      await page.clock.runFor(2000)
      await expect(ui(page).remaining).toHaveText('24:58')
    })

    test('[開始] リセット・一時停止のボタンを表示し、開始・再開のボタンを非表示にする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      const u = ui(page)
      await u.start.click()
      await expect(u.reset).toBeVisible()
      await expect(u.pause).toBeVisible()
      await expect(u.start).toBeHidden()
      await expect(u.resume).toBeHidden()
    })

    test('[開始] フェーズが作業のとき、作業するタスクを非活性にする（選んでいる値は残す）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { taskId: T2.id })))
      await expect(ui(page).task).toBeEnabled()
      await ui(page).start.click()
      await expect(ui(page).task).toBeDisabled()
      await expectSelectedTask(page, T2.name)
    })

    test('[開始] フェーズが休憩のとき、作業するタスクは活性のままにする', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'idle', { taskId: T2.id })))
      await ui(page).start.click()
      await expect(ui(page).pause).toBeVisible()
      await expect(ui(page).task).toBeEnabled()
      await expectSelectedTask(page, T2.name)
    })

    test('[開始] サイクルの進み具合の読み上げ名は、変えない（終えた回の数は変わらない）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { cycle: 3 })))
      await ui(page).start.click()
      await expect(ui(page).pause).toBeVisible()
      await expect(ui(page).progress(2, 4)).toBeVisible()
    })
  })

  test.describe('スキップのボタン押下', () => {
    // 設定のサイクルは 4
    const rows: { phase: Phase; cycle: number; next: Phase; nextCycle: number; note: string }[] = [
      { phase: 'work', cycle: 1, next: 'shortBreak', nextCycle: 1, note: 'サイクルの回が設定のサイクルより小さい' },
      { phase: 'work', cycle: 3, next: 'shortBreak', nextCycle: 3, note: 'サイクルの回が設定のサイクルより 1 小さい' },
      { phase: 'work', cycle: 4, next: 'longBreak', nextCycle: 4, note: 'サイクルの回が設定のサイクルと同じ' },
      { phase: 'work', cycle: 5, next: 'longBreak', nextCycle: 5, note: 'サイクルの回が設定のサイクルより大きい' },
      { phase: 'shortBreak', cycle: 2, next: 'work', nextCycle: 3, note: 'サイクルの回を 1 増やす' },
      { phase: 'longBreak', cycle: 4, next: 'work', nextCycle: 1, note: 'サイクルの回を 1 にする' },
    ]
    for (const row of rows) {
      for (const status of STATUSES) {
        test(`[スキップ / ${PHASE_NAME[row.phase]} サイクルの回 ${row.cycle} / ${STATUS_NAME[status]}] 次のフェーズを${PHASE_NAME[row.next]}、サイクルの回を ${row.nextCycle} にし（${row.note}）、動作を開始前、フェーズの長さ・終了予定時刻・残り秒数を null にして保存する`, async ({ page }) => {
          await open(page, withTimer(timer(row.phase, status, { cycle: row.cycle, taskId: T1.id })))
          await ui(page).skip.click()
          await expectTimer(page, timer(row.next, 'idle', { cycle: row.nextCycle, taskId: T1.id }))
        })
      }
    }

    const autoStarts: { name: string; from: TimerState; settings: Partial<Settings>; want: TimerState }[] = [
      {
        name: '次のフェーズが小休憩で、「休憩を自動スタートする」設定のとき、小休憩を開始する（フェーズの長さ 300 秒、終了予定時刻は現在の時刻 ＋ 300 秒、動作中）',
        from: timer('work', 'running', { cycle: 1 }),
        settings: { autoStartBreak: true },
        want: timer('shortBreak', 'running', { cycle: 1, remainingMs: 300_000 }),
      },
      {
        name: '次のフェーズが長休憩で、「休憩を自動スタートする」設定のとき、長休憩を開始する（フェーズの長さ 900 秒）',
        from: timer('work', 'idle', { cycle: 4 }),
        settings: { autoStartBreak: true },
        want: timer('longBreak', 'running', { cycle: 4, remainingMs: 900_000 }),
      },
      {
        name: '次のフェーズが休憩で、「作業を自動スタートする」だけの設定のとき、開始前のままにする',
        from: timer('work', 'running', { cycle: 1 }),
        settings: { autoStartWork: true },
        want: timer('shortBreak', 'idle', { cycle: 1 }),
      },
      {
        name: '次のフェーズが作業で、「作業を自動スタートする」設定のとき、作業を開始する（フェーズの長さ 1500 秒）',
        from: timer('shortBreak', 'paused', { cycle: 1 }),
        settings: { autoStartWork: true },
        want: timer('work', 'running', { cycle: 2, remainingMs: 1_500_000 }),
      },
      {
        name: '次のフェーズが作業で、「休憩を自動スタートする」だけの設定のとき、開始前のままにする',
        from: timer('longBreak', 'running', { cycle: 4 }),
        settings: { autoStartBreak: true },
        want: timer('work', 'idle', { cycle: 1 }),
      },
    ]
    for (const c of autoStarts) {
      test(`[スキップ / 自動スタート] ${c.name}`, async ({ page }) => {
        await open(page, withTimer(c.from, { settings: { ...DEFAULTS, ...c.settings } }))
        await ui(page).skip.click()
        await expectTimer(page, c.want)
      })
    }

    test('[スキップ / 自動スタート] 自動スタートしたフェーズの長さは、設定での長さにする（小休憩時間が 10 分なら 600 秒）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running'), { settings: { ...CHANGED, autoStartBreak: true } }))
      await ui(page).skip.click()
      await expectTimer(page, timer('shortBreak', 'running', { phaseSeconds: 600, remainingMs: 600_000 }))
    })

    test('[スキップ] 作業の動作中で押しても、作業記録は作らない', async ({ page }) => {
      const records: WorkRecord[] = [{ completedAt: '2026-10-10T03:00:00.000Z', taskId: null, seconds: 1500 }]
      await open(page, withTimer(timer('work', 'running'), { records }))
      await ui(page).skip.click()
      await expectTimer(page, timer('shortBreak', 'idle'))
      expect(await read<WorkRecord[]>(page, STG.records)).toEqual(records)
    })

    test('[スキップ] ブラウザ通知をまだ許可も拒否もしていなくても、通知の許可を求めない（自動スタートするときも）', async ({ page }) => {
      await stubNotification(page, 'default')
      await open(page, withTimer(timer('work', 'idle'), { settings: { ...DEFAULTS, autoStartBreak: true } }))
      await ui(page).skip.click()
      await expectTimer(page, timer('shortBreak', 'running', { remainingMs: 300_000 }))
      expect(await permissionRequests(page)).toBe(0)
    })

    for (const from of ['work', 'shortBreak'] as const) {
      test(`[スキップ] ブラウザ通知を許可していても、${PHASE_NAME[from]}の動作中で押したときに、ブラウザ通知を出さない`, async ({ page }) => {
        await stubNotification(page, 'granted')
        await open(page, withTimer(timer(from, 'running')))
        await ui(page).skip.click()
        // 先に、次のフェーズへ進んだことを待つ
        await expectTimer(page, timer(from === 'work' ? 'shortBreak' : 'work', 'idle', { cycle: from === 'work' ? 1 : 2 }))
        await expect(ui(page).start).toBeVisible()
        expect(await notificationsShown(page)).toBe(0)
      })
    }

    test('[スキップ] 休憩から作業へ進むとき、選択中のタスクがアーカイブされていれば、「タスクなし」にして保存する（作業を自動スタートして、作業するタスクが非活性になるときも）', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'running', { taskId: T1.id }), { settings: { ...DEFAULTS, autoStartWork: true } }))
      await expectSelectedTask(page, T1.name)
      // 別の画面で、選択中のタスクをアーカイブしたあとの状態にする
      await write(page, STG.tasks, [{ ...T1, archived: true }, T2])
      await ui(page).skip.click()
      await expectTimer(page, timer('work', 'running', { cycle: 2, taskId: null, remainingMs: 1_500_000 }))
      await expectSelectedTask(page, NO_TASK)
    })

    test('[スキップ] 休憩から作業へ進むとき、選択中のタスクがタスクの中になければ、「タスクなし」にして保存する', async ({ page }) => {
      await open(page, withTimer(timer('longBreak', 'idle', { cycle: 4, taskId: T1.id })))
      await expectSelectedTask(page, T1.name)
      await write(page, STG.tasks, [T2])
      await ui(page).skip.click()
      await expectTimer(page, timer('work', 'idle', { cycle: 1, taskId: null }))
      await expectSelectedTask(page, NO_TASK)
    })

    test('[スキップ] 残り時間を、次のフェーズの、設定での長さにする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running')))
      await expect(ui(page).remaining).toHaveText('24:52')
      await ui(page).skip.click()
      await expect(ui(page).remaining).toHaveText('05:00')
    })

    test('[スキップ] サイクルの進み具合を、次のフェーズに合わせる（作業の 1 回目から小休憩へ進むと「サイクル 1 / 4」）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { cycle: 1 })))
      await expect(ui(page).progress(0, 4)).toBeVisible()
      await ui(page).skip.click()
      await expect(ui(page).progress(1, 4)).toBeVisible()
    })

    test('[スキップ] 長休憩から作業へ進むと、サイクルの進み具合を「サイクル 0 / 4」に戻す', async ({ page }) => {
      await open(page, withTimer(timer('longBreak', 'idle', { cycle: 4 })))
      await expect(ui(page).progress(4, 4)).toBeVisible()
      await ui(page).skip.click()
      await expect(ui(page).progress(0, 4)).toBeVisible()
    })

    test('[スキップ] 動作中で押すと、開始のボタンを表示し、リセット・一時停止のボタンを非表示にする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running')))
      const u = ui(page)
      await u.skip.click()
      await expect(u.start).toBeVisible()
      await expect(u.reset).toBeHidden()
      await expect(u.pause).toBeHidden()
    })

    test('[スキップ / 自動スタート] 自動スタートしたときは、リセット・一時停止のボタンを表示し、開始のボタンを非表示にする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle'), { settings: { ...DEFAULTS, autoStartBreak: true } }))
      const u = ui(page)
      await u.skip.click()
      await expect(u.reset).toBeVisible()
      await expect(u.pause).toBeVisible()
      await expect(u.start).toBeHidden()
    })

    test('[スキップ] 作業の動作中から休憩へ進むと、作業するタスクの非活性を解除する（選んでいる値は残す）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { taskId: T2.id })))
      await expect(ui(page).task).toBeDisabled()
      await ui(page).skip.click()
      await expect(ui(page).task).toBeEnabled()
      await expectSelectedTask(page, T2.name)
    })

    test('[スキップ / 自動スタート] 休憩から進んだ作業を自動スタートしたときは、作業するタスクを非活性にする（選んでいる値は残す）', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'idle', { taskId: T2.id }), { settings: { ...DEFAULTS, autoStartWork: true } }))
      await expect(ui(page).task).toBeEnabled()
      await ui(page).skip.click()
      await expect(ui(page).task).toBeDisabled()
      await expectSelectedTask(page, T2.name)
    })
  })

  test.describe('作業するタスクの選択を変える', () => {
    const cases: { name: string; state: TimerState }[] = [
      { name: '作業の開始前', state: timer('work', 'idle', { cycle: 2, taskId: T1.id }) },
      { name: '小休憩の開始前', state: timer('shortBreak', 'idle', { cycle: 2, taskId: T1.id }) },
      { name: '小休憩の動作中', state: timer('shortBreak', 'running', { cycle: 2, taskId: T1.id }) },
      { name: '長休憩の一時停止中', state: timer('longBreak', 'paused', { cycle: 4, taskId: T1.id }) },
    ]
    for (const c of cases) {
      test(`[作業するタスクの選択を変える] ${c.name}でタスクを選ぶと、選択中のタスクだけを、選んだタスクの id にして保存する`, async ({ page }) => {
        await open(page, withTimer(c.state))
        await chooseTask(page, T2.name)
        await expectTimer(page, { ...c.state, taskId: T2.id })
        await expectSelectedTask(page, T2.name)
      })
    }

    test('[作業するタスクの選択を変える] 「タスクなし」を選ぶと、選択中のタスクを null にして保存する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { taskId: T1.id })))
      await chooseTask(page, NO_TASK)
      await expectTimer(page, timer('work', 'idle', { taskId: null }))
      await expectSelectedTask(page, NO_TASK)
    })

    test('[作業するタスクの選択を変える] 「タスクなし」からタスクを選ぶと、選択中のタスクを、選んだタスクの id にして保存する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { taskId: null })))
      await chooseTask(page, T1.name)
      await expectTimer(page, timer('work', 'idle', { taskId: T1.id }))
    })

    test('[作業するタスクの選択を変える] 変えたあとで再読み込みしても、選んだタスクを表示する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { taskId: T1.id })))
      await chooseTask(page, T2.name)
      await expectTimer(page, timer('work', 'idle', { taskId: T2.id }))
      await page.reload()
      await expectSelectedTask(page, T2.name)
    })

    test('[作業するタスクの選択を変える] 選んだタスクで作業を開始しても、選択中のタスクは変わらない', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      await chooseTask(page, T2.name)
      await expectTimer(page, timer('work', 'idle', { taskId: T2.id }))
      await ui(page).start.click()
      await expectTimer(page, timer('work', 'running', { taskId: T2.id, remainingMs: 1_500_000 }))
    })
  })

  test.describe('一時停止のボタン押下', () => {
    const cases: { remainingMs: number; seconds: number; note: string }[] = [
      { remainingMs: 1_492_000, seconds: 1492, note: '終了予定時刻 − 現在の時刻' },
      { remainingMs: 1_491_500, seconds: 1492, note: '1 秒未満は切り上げ' },
      { remainingMs: 1_491_001, seconds: 1492, note: '1 ミリ秒でも切り上げ' },
      { remainingMs: 1, seconds: 1, note: '0 より大きい、いちばん小さい残り' },
    ]
    for (const c of cases) {
      test(`[一時停止] 終了予定時刻まで ${c.remainingMs / 1000} 秒のとき、残り秒数を ${c.seconds}（${c.note}）、終了予定時刻を null、動作を一時停止中にして保存する`, async ({ page }) => {
        await open(page, withTimer(timer('work', 'running', { cycle: 2, taskId: T1.id, remainingMs: c.remainingMs })))
        await ui(page).pause.click()
        await expectTimer(page, timer('work', 'paused', { cycle: 2, taskId: T1.id, remainingMs: c.seconds * 1000 }))
      })
    }

    test('[一時停止] 残り秒数は、押した時刻で求める（開いてから 8 秒たって押すと、8 秒少ない）', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'running', { remainingMs: 200_000 })))
      await page.clock.runFor(8000)
      await ui(page).pause.click()
      await expectTimer(page, timer('shortBreak', 'paused', { remainingMs: 192_000 }))
    })

    test('[一時停止] 「終了予定時刻 − 現在の時刻」がちょうど 0 のとき、一時停止しない（次の 1 秒で、共通ヘッダーがフェーズを完了にする）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { remainingMs: 500 })))
      // 1 秒ごとの処理を動かさずに、時刻だけを終了予定時刻まで進める
      await page.clock.setSystemTime(NOW.getTime() + 500)
      await ui(page).pause.click()
      await page.clock.runFor(1000)
      await expectTimer(page, timer('shortBreak', 'idle'))
    })

    test('[一時停止] 「終了予定時刻 − 現在の時刻」が 0 より小さいとき、一時停止しない（次の 1 秒で、共通ヘッダーがフェーズを完了にする）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { remainingMs: 500 })))
      await page.clock.setSystemTime(NOW.getTime() + 700)
      await ui(page).pause.click()
      await page.clock.runFor(1000)
      await expectTimer(page, timer('shortBreak', 'idle'))
    })

    test('[一時停止] 残り時間を止める（時間がたっても、表示は変わらない）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running')))
      await ui(page).pause.click()
      await expect(ui(page).resume).toBeVisible()
      await page.clock.runFor(3000)
      await expect(ui(page).remaining).toHaveText('24:52')
      await expectTimer(page, timer('work', 'paused'))
    })

    test('[一時停止] リセット・再開のボタンを表示し、一時停止・開始のボタンを非表示にする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running')))
      const u = ui(page)
      await u.pause.click()
      await expect(u.reset).toBeVisible()
      await expect(u.resume).toBeVisible()
      await expect(u.pause).toBeHidden()
      await expect(u.start).toBeHidden()
    })

    test('[一時停止] フェーズが作業のとき、作業するタスクは非活性のままにする（選んでいる値は残す）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { taskId: T2.id })))
      await ui(page).pause.click()
      await expect(ui(page).resume).toBeVisible()
      await expect(ui(page).task).toBeDisabled()
      await expectSelectedTask(page, T2.name)
    })

    test('[一時停止] フェーズが休憩のとき、作業するタスクは活性のままにする', async ({ page }) => {
      await open(page, withTimer(timer('longBreak', 'running', { cycle: 4, taskId: T2.id })))
      await ui(page).pause.click()
      await expect(ui(page).resume).toBeVisible()
      await expect(ui(page).task).toBeEnabled()
      await expectSelectedTask(page, T2.name)
    })
  })

  test.describe('再開のボタン押下', () => {
    for (const phase of PHASES) {
      test(`[再開] フェーズが${PHASE_NAME[phase]}のとき、終了予定時刻を「現在の時刻 ＋ 残り秒数」、残り秒数を null、動作を動作中にして保存する`, async ({ page }) => {
        await open(page, withTimer(timer(phase, 'paused', { cycle: 2, taskId: T1.id, remainingMs: 123_000 })))
        await ui(page).resume.click()
        await expectTimer(page, timer(phase, 'running', { cycle: 2, taskId: T1.id, remainingMs: 123_000 }))
      })
    }

    test('[再開] 終了予定時刻は、押した時刻から数える（一時停止のまま 60 秒たって押すと、60 秒遅くなる）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'paused')))
      await page.clock.runFor(60_000)
      await ui(page).resume.click()
      await expectTimer(page, timer('work', 'running', { remainingMs: 60_000 + 1_492_000 }))
    })

    test('[再開] フェーズの長さは、設定が変わっていても、変えない', async ({ page }) => {
      // 25 分で始めた作業フェーズの途中。設定は、そのあとで 50 分に変えてある
      await open(page, withTimer(timer('work', 'paused'), { settings: CHANGED }))
      await ui(page).resume.click()
      await expectTimer(page, timer('work', 'running', { phaseSeconds: 1500, remainingMs: 1_492_000 }))
    })

    test('[再開] ブラウザ通知をまだ許可も拒否もしていなくても、通知の許可を求めない', async ({ page }) => {
      await stubNotification(page, 'default')
      await open(page, withTimer(timer('work', 'paused')))
      await ui(page).resume.click()
      await expectTimer(page, timer('work', 'running'))
      expect(await permissionRequests(page)).toBe(0)
    })

    test('[再開] 残り時間を、止めたところから、1 秒ごとに減らす', async ({ page }) => {
      await open(page, withTimer(timer('work', 'paused')))
      await ui(page).resume.click()
      await expect(ui(page).pause).toBeVisible()
      await expect(ui(page).remaining).toHaveText('24:52')
      await page.clock.runFor(1000)
      await expect(ui(page).remaining).toHaveText('24:51')
    })

    test('[再開] リセット・一時停止のボタンを表示し、再開・開始のボタンを非表示にする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'paused')))
      const u = ui(page)
      await u.resume.click()
      await expect(u.reset).toBeVisible()
      await expect(u.pause).toBeVisible()
      await expect(u.resume).toBeHidden()
      await expect(u.start).toBeHidden()
    })

    test('[再開] フェーズが作業のとき、作業するタスクは非活性のままにする（選んでいる値は残す）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'paused', { taskId: T2.id })))
      await ui(page).resume.click()
      await expect(ui(page).pause).toBeVisible()
      await expect(ui(page).task).toBeDisabled()
      await expectSelectedTask(page, T2.name)
    })
  })

  test.describe('タイマーの状態が変わる', () => {
    // ---- document.title ----

    const titles: { name: string; state: TimerState; settings?: Partial<Settings>; act: (page: Page) => Promise<void>; title: string }[] = [
      { name: '開始のボタンを押すと、「25:00 タイマー」', state: timer('work', 'idle'), act: (page) => ui(page).start.click(), title: `25:00 ${TITLE}` },
      { name: '一時停止のボタンを押すと、「タイマー」', state: timer('work', 'running'), act: (page) => ui(page).pause.click(), title: TITLE },
      { name: '再開のボタンを押すと、「24:52 タイマー」', state: timer('work', 'paused'), act: (page) => ui(page).resume.click(), title: `24:52 ${TITLE}` },
      { name: 'リセットのボタンを押すと、「タイマー」', state: timer('work', 'running'), act: (page) => ui(page).reset.click(), title: TITLE },
      { name: '動作中にスキップのボタンを押すと（自動スタートしない設定）、「タイマー」', state: timer('work', 'running'), act: (page) => ui(page).skip.click(), title: TITLE },
      {
        name: 'スキップのボタンを押して、次のフェーズを自動スタートすると、「05:00 タイマー」',
        state: timer('work', 'idle'),
        settings: { autoStartBreak: true },
        act: (page) => ui(page).skip.click(),
        title: `05:00 ${TITLE}`,
      },
      {
        name: 'フェーズが完了すると（自動スタートしない設定）、「タイマー」',
        state: timer('work', 'running', { remainingMs: 3000 }),
        act: (page) => page.clock.runFor(4000),
        title: TITLE,
      },
    ]
    for (const c of titles) {
      test(`[タイマーの状態が変わる / document.title] ${c.name}にする`, async ({ page }) => {
        await open(page, withTimer(c.state, { settings: { ...DEFAULTS, ...c.settings } }))
        await c.act(page)
        await expect(page).toHaveTitle(c.title)
      })
    }

    // ---- フェーズが完了する（共通ヘッダーから） ----

    test('[タイマーの状態が変わる / フェーズが完了する] 現在の時刻が終了予定時刻と同じになったときに、残り時間を、次のフェーズの、設定での長さにする', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { remainingMs: 3000 })))
      await expect(ui(page).remaining).toHaveText('00:03')
      // 残り 1 秒までは、動作中のまま。現在の時刻が終了予定時刻と同じになったときに、完了にする（「00:00」は表示しない）
      await page.clock.runFor(2000)
      await expect(ui(page).remaining).toHaveText('00:01')
      await page.clock.runFor(1000)
      await expect(ui(page).remaining).toHaveText('05:00')
      await expectTimer(page, timer('shortBreak', 'idle'))
    })

    test('[タイマーの状態が変わる / フェーズが完了する] サイクルの進み具合を、次のフェーズに合わせる（作業の 2 回目が完了すると「サイクル 2 / 4」）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { cycle: 2, remainingMs: 3000 })))
      await expect(ui(page).progress(1, 4)).toBeVisible()
      await page.clock.runFor(4000)
      await expect(ui(page).progress(2, 4)).toBeVisible()
    })

    test('[タイマーの状態が変わる / フェーズが完了する] 開始のボタンを表示し、リセット・一時停止のボタンを非表示にする（自動スタートしない設定）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { remainingMs: 3000 })))
      const u = ui(page)
      await page.clock.runFor(4000)
      await expect(u.start).toBeVisible()
      await expect(u.reset).toBeHidden()
      await expect(u.pause).toBeHidden()
    })

    test('[タイマーの状態が変わる / フェーズが完了する] 作業が完了して休憩へ進むと、作業するタスクの非活性を解除する（選んでいる値は残す）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { taskId: T2.id, remainingMs: 3000 })))
      await expect(ui(page).task).toBeDisabled()
      await page.clock.runFor(4000)
      await expect(ui(page).task).toBeEnabled()
      await expectSelectedTask(page, T2.name)
    })

    test('[タイマーの状態が変わる / フェーズが完了する] 休憩が完了して、作業を自動スタートしたときは、一時停止のボタンを表示し、作業するタスクを非活性にする', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'running', { taskId: T2.id, remainingMs: 3000 }), { settings: { ...DEFAULTS, autoStartWork: true } }))
      await expect(ui(page).task).toBeEnabled()
      await page.clock.runFor(4000)
      await expect(ui(page).pause).toBeVisible()
      await expect(ui(page).task).toBeDisabled()
      await expectSelectedTask(page, T2.name)
    })

    // ---- タスクの読み直し ----

    test('[タイマーの状態が変わる] 状態が変わるたびに、タスクを読み直して、選択肢を作り直す（開いたあとで増えたタスクが、開始のボタンを押したあとの選択肢に入る）', async ({ page }) => {
      await open(page, { settings: DEFAULTS, tasks: [T1], timer: timer('shortBreak', 'idle', { taskId: T1.id }) })
      await expectSelectedTask(page, T1.name)
      await write(page, STG.tasks, [T1, T2])
      await ui(page).start.click()
      await expect(ui(page).pause).toBeVisible()
      await expect(await taskOptions(page)).toHaveText([NO_TASK, T1.name, T2.name])
    })

    test('[タイマーの状態が変わる] 活性のときに、選択中のタスクがアーカイブされていたら、「タスクなし」にして保存する（休憩の動作中に、一時停止のボタンを押したとき）', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'running', { taskId: T1.id })))
      await expectSelectedTask(page, T1.name)
      await write(page, STG.tasks, [{ ...T1, archived: true }, T2])
      await ui(page).pause.click()
      await expectTimer(page, timer('shortBreak', 'paused', { taskId: null }))
      await expectSelectedTask(page, NO_TASK)
    })

    test('[タイマーの状態が変わる] 非活性のときは、選択中のタスクがアーカイブされていても、選択中のタスクを変えない（作業の動作中に、一時停止のボタンを押したとき）', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running', { taskId: T1.id })))
      await expectSelectedTask(page, T1.name)
      await write(page, STG.tasks, [{ ...T1, archived: true }, T2])
      await ui(page).pause.click()
      await expectTimer(page, timer('work', 'paused', { taskId: T1.id }))
      await expectSelectedTask(page, T1.name)
    })
  })

  test.describe('共通ルール', () => {
    test('[共通ルール アクセシビリティ] 開始前のとき、Tab キーでフォーカスが移る順序は、開始 → スキップ → 作業するタスク', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle')))
      const u = ui(page)
      await u.start.focus()
      for (const next of [u.skip, u.task]) {
        await page.keyboard.press('Tab')
        await expect(next).toBeFocused()
      }
    })

    test('[共通ルール アクセシビリティ / 再開 備考] 休憩の一時停止中のとき、Tab キーでフォーカスが移る順序は、リセット → 再開 → スキップ → 作業するタスク（再開は、開始の位置）', async ({ page }) => {
      await open(page, withTimer(timer('shortBreak', 'paused')))
      const u = ui(page)
      await u.reset.focus()
      for (const next of [u.resume, u.skip, u.task]) {
        await page.keyboard.press('Tab')
        await expect(next).toBeFocused()
      }
    })

    test('[共通ルール アクセシビリティ / 一時停止 備考] 作業の動作中のとき、Tab キーでフォーカスが移る順序は、リセット → 一時停止 → スキップ（一時停止は、開始の位置）。非活性の作業するタスクには、フォーカスが当たらない', async ({ page }) => {
      await open(page, withTimer(timer('work', 'running')))
      const u = ui(page)
      await u.reset.focus()
      for (const next of [u.pause, u.skip]) {
        await page.keyboard.press('Tab')
        await expect(next).toBeFocused()
      }
      await page.keyboard.press('Tab')
      await expect(u.skip).not.toBeFocused()
      await expect(u.task).not.toBeFocused()
    })

    test('[共通ルール ブラウザの戻るで画面に戻ったときに、入力内容を復元するか] タスクを選んで別の画面へ移り、ブラウザの戻るで戻ると、選んだタスクを表示する', async ({ page }) => {
      await open(page, withTimer(timer('work', 'idle', { taskId: T1.id })))
      await chooseTask(page, T2.name)
      await expectTimer(page, timer('work', 'idle', { taskId: T2.id }))
      await page.goto('/tasks')
      await page.goBack()
      await expectSelectedTask(page, T2.name)
    })
  })
})
