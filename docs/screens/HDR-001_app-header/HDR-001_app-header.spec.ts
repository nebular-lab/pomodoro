/**
 * HDR-001 共通ヘッダー の Playwright テスト
 *
 * 設計書: docs/screens/HDR-001_app-header/HDR-001_app-header.md
 * ワイヤーフレーム: docs/screens/HDR-001_app-header/HDR-001_app-header.html
 * ブラウザストレージ一覧: docs/screens/storage.md
 * 共通ルール: docs/screens/common-rules.md
 *
 * 共通ヘッダーには URL がないので、このヘッダーを使う画面を開いて確かめる。
 * 基本は 設定（/settings）を使う。「いまの画面のリンク」と「各画面への遷移」は、4 つの画面で確かめる。
 * 画面の側の動き（その画面の部品）は、その画面のテストで確かめるので、ここでは確かめない
 * （ヘッダーの手順が「画面の表示を変える」と書いているところだけ、その画面の部品を 1 つ見る）。
 *
 * テスト名の先頭の [...] は、設計書のどこから作ったケースかを、場面・項目名・条件で示す。
 *   [ヘッダー 表示条件]                    … 画面項目「ヘッダー」の表示条件
 *   [サービス名 表示内容]                  … 画面項目「サービス名」の表示内容
 *   [「履歴」 href]                        … 画面項目「履歴」の href
 *   [「履歴」 備考]                        … 画面項目「履歴」の備考（現在のページであることを伝える）
 *   [初期表示 / 設定 workMinutes]          … 初期表示時の処理 で、設定（ストレージ）を読むとき
 *   [初期表示 / タイマーの状態 値がない]   … 初期表示時の処理 で、タイマーの状態（ストレージ）を読むとき
 *   [初期表示 / 動作中]                    … 初期表示時の処理 で、動作が動作中のとき
 *   [「履歴」リンク押下]                   … アクション「「履歴」リンク押下」
 *   [1 秒たつ]                             … アクション「タイマーが動作中に、1 秒たつ」
 *   [1 秒たつ / タブが表に戻る]            … 同じく、ブラウザのタブが表に戻ったとき
 *   [フェーズ完了 / 作業記録]              … アクション「フェーズが完了する」の、作業記録を足す手順
 *   [フェーズ完了 / 次のフェーズ]          … 同じく、次のフェーズへ進める表
 *   [フェーズ完了 / 選択中のタスク]        … 同じく、選択中のタスクを見直す手順
 *   [フェーズ完了 / 自動スタート]          … 同じく、次のフェーズを自動スタートする手順
 *   [フェーズ完了 / document.title]        … 同じく、document.title と画面の表示を合わせる手順
 *   [共通ルール アクセシビリティ]          … 共通ルールの「アクセシビリティ」のルール
 * 2 つの出典に当たるケースは「/」で併記している。
 *
 * 実装についての前提:
 * - このアプリは API を呼ばない。データは localStorage に持つ（キーと形式は storage.md）
 * - ヘッダーは、ヘッダーの役割（banner）で見つかる。リンクは、リンクの役割と文言で見つかる（いまの画面のリンクも、リンクのまま）
 * - 「読み上げで現在のページであることを伝える」は、aria-current="page" で確かめる
 *   （役割と名前では確かめられないので、ここだけ属性を見る。これ以外の属性と、ライブラリ固有の DOM の形は前提にしない）
 * - 時刻は Playwright の時計で、日本時間の 2026-10-11 10:00 に止めてから画面を開き、runFor で進める。
 *   止めている間は setTimeout / setInterval / requestAnimationFrame が動かないので、画面はそれらに頼らずに最初の表示を終える
 * - 「1 秒ごと」は、画面を開いた時刻から数えるタイマー（setInterval など）で行う。
 *   終了予定時刻は、どのケースも「開いた時刻 ＋ 整数秒」にしているので、終了予定時刻に合わせて数える実装でも同じ結果になる
 * - フェーズは、現在の時刻が終了予定時刻と同じになった 1 秒ごとの処理で完了する（残りが 0 秒以下で完了。「00:00」は表示しない）。
 *   その瞬間は、名前に「終了予定時刻ちょうど」と書いたケースと、自動スタートしたフェーズの終了予定時刻・document.title を
 *   確かめるケースで見る。ほかのケースは、終了予定時刻の 1 秒あとまで進めてから、終了予定時刻の値を除いて確かめる
 * - 「ブラウザのタブが表に戻ったとき」は、document の visibilitychange（または window の focus）で受け取る
 * - 保存する時刻（ISO 8601）は、同じ時刻を表していれば、書き方（ミリ秒の有無など）は問わない
 * - 音（チャイム）は、自動では確かめられないので、手動テスト（HDR-001_app-header.manual-test.md）に書く
 */
import { expect, type Page, test } from '@playwright/test'

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

type Task = { id: string; name: string; color: string; archived: boolean; createdAt: string }

type WorkRecord = { completedAt: string; taskId: string | null; seconds: number }

type Phase = 'work' | 'shortBreak' | 'longBreak'

type TimerState = {
  phase: Phase
  cycle: number
  status: 'idle' | 'running' | 'paused'
  phaseSeconds: number | null
  endsAt: string | null
  remainingSeconds: number | null
  taskId: string | null
}

/** 設定の初期値（storage.md の STG-001） */
const DEFAULTS: Settings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cycles: 4,
  autoStartBreak: false,
  autoStartWork: false,
}

/** 初期値と、どの時間も違う設定（自動スタートは、どちらもしない） */
const CUSTOM: Settings = {
  workMinutes: 50,
  shortBreakMinutes: 10,
  longBreakMinutes: 30,
  cycles: 4,
  autoStartBreak: false,
  autoStartWork: false,
}

/** タイマーの最初の状態（初期表示時の処理の手順 2） */
const INITIAL: TimerState = {
  phase: 'work',
  cycle: 1,
  status: 'idle',
  phaseSeconds: null,
  endsAt: null,
  remainingSeconds: null,
  taskId: null,
}

// ---- 固定するもの ------------------------------------------------------------

/** 「今日」と現在の時刻（日本時間の 2026-10-11 10:00） */
const NOW = new Date('2026-10-11T01:00:00.000Z')
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

/** 現在の時刻から ms ミリ秒後（負なら前）の時刻 */
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString()

/** ヘッダーを置く画面。name はリンクの文言（変数 v1）、title はその画面の document.title */
const SCREENS = [
  { name: 'タイマー', path: '/', title: 'タイマー', current: '/' },
  // current は、その画面を、URL クエリを付けて開いたときの URL（いまの画面のリンクを押しても変わらないことを見る）
  { name: 'タスク管理', path: '/tasks', title: 'タスク管理', current: '/tasks?archived=true' },
  { name: '履歴', path: '/history', title: '履歴', current: '/history?view=week' },
  { name: '設定', path: '/settings', title: '設定', current: '/settings' },
] as const

/** 基本に使う画面（設定） */
const HOST = SCREENS[3]

// ---- 部品（番号はワイヤーフレームの data-no） -------------------------------

const ui = (page: Page) => {
  const header = page.getByRole('banner') // No.1
  return {
    header,
    serviceName: header.getByText('ポモドーロタイマー', { exact: true }), // No.2
    /** 「タイマー」No.3、「タスク管理」No.4、「履歴」No.5、「設定」No.6 */
    link: (name: string) => header.getByRole('link', { name, exact: true }),
  }
}

// ---- テストデータ ------------------------------------------------------------

const TASK: Task = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '設計書を書く',
  color: '#EF4444',
  archived: false,
  createdAt: '2026-10-01T00:00:00.000Z',
}
const OTHER_TASK: Task = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'レビューする',
  color: '#3B82F6',
  archived: false,
  createdAt: '2026-10-02T00:00:00.000Z',
}

/** 前からある作業記録（昨日の分） */
const OLD_RECORD: WorkRecord = { completedAt: at(-24 * HOUR), taskId: null, seconds: 25 * 60 }

/** 初期値の設定での、フェーズの長さ（秒） */
const DEFAULT_SECONDS: Record<Phase, number> = { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 }

/** 動作中の状態。終了予定時刻は、現在の時刻の remainingMs ミリ秒後（負なら、過ぎている） */
const running = (phase: Phase, remainingMs: number, over: Partial<TimerState> = {}): TimerState => ({
  phase,
  cycle: 1,
  status: 'running',
  phaseSeconds: DEFAULT_SECONDS[phase],
  endsAt: at(remainingMs),
  remainingSeconds: null,
  taskId: null,
  ...over,
})

/** 動作中で、あと 1 秒で終わる状態 */
const endingSoon = (phase: Phase, over: Partial<TimerState> = {}) => running(phase, SECOND, over)

/** 開始前の状態 */
const idle = (phase: Phase, cycle: number, taskId: string | null = null): TimerState => ({
  ...INITIAL,
  phase,
  cycle,
  taskId,
})

/** 自動スタートしたあとの状態。終了予定時刻は、現在の時刻の endsInMs ミリ秒後 */
const started = (phase: Phase, cycle: number, phaseSeconds: number, endsInMs = 0): TimerState => ({
  phase,
  cycle,
  status: 'running',
  phaseSeconds,
  endsAt: at(endsInMs),
  remainingSeconds: null,
  taskId: null,
})

/** 一時停止中の状態（25 分の作業フェーズの、残り 20 分） */
const PAUSED: TimerState = {
  phase: 'work',
  cycle: 2,
  status: 'paused',
  phaseSeconds: 25 * 60,
  endsAt: null,
  remainingSeconds: 20 * 60,
  taskId: null,
}

// ---- ストレージの読み書き ----------------------------------------------------

/** JSON にせず、文字列のまま入れる値 */
const raw = (text: string) => ({ __raw: text })

type Seed = { settings?: unknown; tasks?: unknown; records?: unknown; timer?: unknown }

/**
 * 画面を開く前に、ストレージに値を入れておく。指定しなかったものは、値がない状態にする。
 * 入れるのは、このテストで最初にページを開いたときの 1 回だけ（再読み込みや遷移では入れ直さない）
 */
async function seed(page: Page, values: Seed) {
  const entries: [string, string][] = []
  for (const name of ['settings', 'tasks', 'records', 'timer'] as const) {
    const value = values[name]
    if (value === undefined) continue
    const isRaw = typeof value === 'object' && value !== null && '__raw' in value
    entries.push([STG[name], isRaw ? String(value.__raw) : JSON.stringify(value)])
  }
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
    const value = localStorage.getItem(k)
    return value === null ? null : JSON.parse(value)
  }, key)
}

/** 時刻を、書き方によらずに比べられる形（ミリ秒）にする */
const instant = (time: string | null) => (time === null ? null : Date.parse(time))

/** タイマーの状態（STG-004）が、終了予定時刻も含めて、期待する値になるのを待つ */
async function expectTimer(page: Page, want: TimerState) {
  await expect
    .poll(async () => {
      const timer = await read<TimerState>(page, STG.timer)
      return timer && { ...timer, endsAt: instant(timer.endsAt) }
    })
    .toEqual({ ...want, endsAt: instant(want.endsAt) })
}

/** タイマーの状態（STG-004）が、期待する値になるのを待つ。終了予定時刻は、あるかないかだけを比べる */
async function expectPhase(page: Page, want: TimerState) {
  const loose = (timer: TimerState) => ({ ...timer, endsAt: timer.endsAt === null ? null : 'あり' })
  await expect
    .poll(async () => {
      const timer = await read<TimerState>(page, STG.timer)
      return timer && loose(timer)
    })
    .toEqual(loose(want))
}

/** 作業記録（STG-003）が、期待する値になるのを待つ */
async function expectRecords(page: Page, want: WorkRecord[] | null) {
  const norm = (records: WorkRecord[] | null) =>
    Array.isArray(records) ? records.map((r) => ({ ...r, completedAt: instant(r.completedAt) })) : records
  await expect.poll(async () => norm(await read<WorkRecord[]>(page, STG.records))).toEqual(norm(want))
}

// ---- 画面を開く・時刻を進める ------------------------------------------------

type OpenOptions = {
  /** 開く画面の URL（省略すると、設定） */
  path?: string
}

/** 時計を現在の時刻に止め、ストレージに値を入れて、ヘッダーを置いた画面を開く */
async function open(page: Page, values: Seed = {}, { path = HOST.path }: OpenOptions = {}) {
  // 少し前の時刻から始めて、現在の時刻ちょうどで止める（開いた画面の時計は、NOW で止まった状態から始まる）
  await page.clock.install({ time: NOW.getTime() - MINUTE })
  await page.clock.pauseAt(NOW)
  await seed(page, values)
  await page.goto(path)
  await expect(ui(page).header).toBeVisible()
}

/** あと 1 秒で終わるフェーズ（endingSoon）の、終了予定時刻の 1 秒あとまで進める */
async function passEnd(page: Page) {
  await page.clock.runFor(2 * SECOND)
}

/**
 * タブが裏にあった間に時刻が進み（1 秒ごとの処理は間引かれて動かない）、開いてから ms ミリ秒後に、表に戻る
 */
async function returnToFront(page: Page, ms: number) {
  await page.clock.setSystemTime(at(ms))
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
  })
}

// ---- テスト -----------------------------------------------------------------

test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 1280, height: 720 } })

test.describe('HDR-001 共通ヘッダー', () => {
  test.describe('画面項目の条件・値', () => {
    for (const screen of SCREENS) {
      test(`[ヘッダー 表示条件] ${screen.name}画面に、ヘッダーを表示する`, async ({ page }) => {
        await open(page, {}, { path: screen.path })
        await expect(ui(page).header).toBeVisible()
      })
    }

    test('[サービス名 表示内容] 「ポモドーロタイマー」と表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).serviceName).toBeVisible()
    })

    for (const screen of SCREENS) {
      test(`[「${screen.name}」 表示条件] 「${screen.name}」のリンクを表示する`, async ({ page }) => {
        await open(page)
        await expect(ui(page).link(screen.name)).toBeVisible()
      })
    }

    for (const screen of SCREENS) {
      test(`[「${screen.name}」 href] 「${screen.name}」のリンクの href は「${screen.path}」`, async ({ page }) => {
        await open(page)
        await expect(ui(page).link(screen.name)).toHaveAttribute('href', screen.path)
      })
    }

    for (const screen of SCREENS) {
      test(`[「${screen.name}」 備考] ${screen.name}画面では、「${screen.name}」だけが、現在のページであることを伝える`, async ({ page }) => {
        await open(page, {}, { path: screen.path })
        const u = ui(page)
        await expect(u.link(screen.name)).toHaveAttribute('aria-current', 'page')
        for (const other of SCREENS.filter((s) => s !== screen)) {
          await expect(u.link(other.name)).not.toHaveAttribute('aria-current', 'page')
        }
      })
    }
  })

  test.describe('初期表示時の処理: 設定を読む', () => {
    // 設定の値は、フェーズが完了したあとの、次のフェーズ（種類・自動スタートしたか・長さ）で確かめる

    test('[初期表示 / 設定 値がない] 設定に値がないとき、cycles に初期値（4）を使う（サイクルの 3 回目の作業が終わると、小休憩へ進む）', async ({ page }) => {
      await open(page, { timer: endingSoon('work', { cycle: 3 }) })
      await passEnd(page)
      await expectPhase(page, idle('shortBreak', 3))
    })

    test('[初期表示 / 設定 値がない] 設定に値がないとき、cycles に初期値（4）を、自動スタートに初期値（しない）を使う（サイクルの 4 回目の作業が終わると、長休憩へ進み、開始前のままにする）', async ({ page }) => {
      await open(page, { timer: endingSoon('work', { cycle: 4 }) })
      await passEnd(page)
      await expectPhase(page, idle('longBreak', 4))
    })

    const unreadable: { label: string; settings: unknown }[] = [
      { label: 'JSON として読めない', settings: raw('{"cycles":2') },
      { label: 'オブジェクトでない（JSON の配列）', settings: [2] },
      { label: 'オブジェクトでない（JSON の null）', settings: null },
      { label: 'オブジェクトでない（JSON の数値）', settings: 2 },
      { label: 'オブジェクトでない（JSON の文字列）', settings: 'cycles' },
    ]

    for (const c of unreadable) {
      test(`[初期表示 / 設定 ${c.label}] 設定が${c.label}とき、値がないときと同じに、すべての項目に初期値を使う（サイクルの 4 回目の作業が終わると、長休憩へ進み、開始前のままにする）`, async ({ page }) => {
        await open(page, { settings: c.settings, timer: endingSoon('work', { cycle: 4 }) })
        await passEnd(page)
        await expectPhase(page, idle('longBreak', 4))
      })
    }

    // ---- 時間の 3 項目 ----

    type MinuteField = {
      field: 'workMinutes' | 'shortBreakMinutes' | 'longBreakMinutes'
      /** いちばん大きい値 */
      max: number
      /** ほかの項目の値（確かめるフェーズを、自動スタートする） */
      base: Settings
      /** 画面を開く前のタイマーの状態 */
      timer: TimerState
      /** その項目に minutes を使ったときの、フェーズが完了したあとの状態 */
      want: (minutes: number) => TimerState
      /** 確かめ方（テスト名に使う） */
      how: string
    }

    const minuteFields: MinuteField[] = [
      {
        field: 'workMinutes',
        max: 120,
        base: { ...DEFAULTS, autoStartWork: true },
        timer: endingSoon('shortBreak'),
        want: (minutes) => started('work', 2, minutes * 60),
        how: '小休憩が終わって自動スタートした作業の、フェーズの長さ',
      },
      {
        field: 'shortBreakMinutes',
        max: 60,
        base: { ...DEFAULTS, autoStartBreak: true },
        timer: endingSoon('work'),
        want: (minutes) => started('shortBreak', 1, minutes * 60),
        how: '作業が終わって自動スタートした小休憩の、フェーズの長さ',
      },
      {
        field: 'longBreakMinutes',
        max: 60,
        base: { ...DEFAULTS, autoStartBreak: true },
        timer: endingSoon('work', { cycle: 4 }),
        want: (minutes) => started('longBreak', 4, minutes * 60),
        how: '作業が終わって自動スタートした長休憩の、フェーズの長さ',
      },
    ]

    for (const item of minuteFields) {
      const initial = DEFAULTS[item.field]
      const cases: { label: string; value: unknown; want: number }[] = [
        { label: 'いちばん小さい値（5）', value: 5, want: 5 },
        { label: `いちばん大きい値（${item.max}）`, value: item.max, want: item.max },
        { label: '範囲の外（0）', value: 0, want: initial },
        { label: `範囲の外（${item.max + 5}）`, value: item.max + 5, want: initial },
        { label: '刻みに合わない値（7）', value: 7, want: initial },
        { label: '整数でない値（12.5）', value: 12.5, want: initial },
        { label: '型が違う値（文字列の "10"）', value: '10', want: initial },
        { label: 'ない（項目そのものがない）', value: undefined, want: initial },
      ]
      for (const c of cases) {
        const result = c.value === c.want ? 'その値を使う' : `その項目だけ、初期値（${initial}）を使う`
        test(`[初期表示 / 設定 ${item.field}] ${item.field} が${c.label}のとき、${result}（${item.how}で確かめる）`, async ({ page }) => {
          // 値が undefined の項目は、JSON にするときに消える
          await open(page, { settings: { ...item.base, [item.field]: c.value }, timer: item.timer })
          await passEnd(page)
          await expectPhase(page, item.want(c.want))
        })
      }
    }

    // ---- サイクル ----

    const cycleCases: { label: string; value: unknown; used: string; cycle: number; next: Phase }[] = [
      { label: 'いちばん小さい値（1）', value: 1, used: 'その値を使う', cycle: 1, next: 'longBreak' },
      { label: 'いちばん大きい値（10）', value: 10, used: 'その値を使う', cycle: 9, next: 'shortBreak' },
      { label: '範囲の外（0）', value: 0, used: '初期値（4）を使う', cycle: 3, next: 'shortBreak' },
      { label: '範囲の外（11）', value: 11, used: '初期値（4）を使う', cycle: 4, next: 'longBreak' },
      { label: '整数でない値（2.5）', value: 2.5, used: '初期値（4）を使う', cycle: 3, next: 'shortBreak' },
      { label: '型が違う値（文字列の "2"）', value: '2', used: '初期値（4）を使う', cycle: 3, next: 'shortBreak' },
      { label: 'ない（項目そのものがない）', value: undefined, used: '初期値（4）を使う', cycle: 4, next: 'longBreak' },
    ]
    const phaseName: Record<Phase, string> = { work: '作業', shortBreak: '小休憩', longBreak: '長休憩' }

    for (const c of cycleCases) {
      test(`[初期表示 / 設定 cycles] cycles が${c.label}のとき、${c.used}（サイクルの ${c.cycle} 回目の作業が終わると、${phaseName[c.next]}へ進む）`, async ({ page }) => {
        await open(page, { settings: { ...DEFAULTS, cycles: c.value }, timer: endingSoon('work', { cycle: c.cycle }) })
        await passEnd(page)
        await expectPhase(page, idle(c.next, c.cycle))
      })
    }

    // ---- 自動スタートの 2 項目 ----

    type BoolField = {
      field: 'autoStartBreak' | 'autoStartWork'
      timer: TimerState
      /** true を使ったとき（自動スタートする）と、false を使ったとき（開始前のまま）の、フェーズが完了したあとの状態 */
      on: TimerState
      off: TimerState
      how: string
    }

    const boolFields: BoolField[] = [
      {
        field: 'autoStartBreak',
        timer: endingSoon('work'),
        on: started('shortBreak', 1, 5 * 60),
        off: idle('shortBreak', 1),
        how: '作業が終わったあとの小休憩',
      },
      {
        field: 'autoStartWork',
        timer: endingSoon('shortBreak'),
        on: started('work', 2, 25 * 60),
        off: idle('work', 2),
        how: '小休憩が終わったあとの作業',
      },
    ]

    for (const item of boolFields) {
      const cases: { label: string; value: unknown; want: boolean }[] = [
        { label: 'true', value: true, want: true },
        { label: 'false', value: false, want: false },
        { label: '型が違う値（文字列の "true"）', value: 'true', want: false },
        { label: '型が違う値（数値の 1）', value: 1, want: false },
        { label: 'ない（項目そのものがない）', value: undefined, want: false },
      ]
      for (const c of cases) {
        const result = c.value === c.want ? 'その値を使う' : 'その項目だけ、初期値（false）を使う'
        test(`[初期表示 / 設定 ${item.field}] ${item.field} が${c.label}のとき、${result}（${item.how}を、${c.want ? '自動スタートする' : '開始前のままにする'}）`, async ({ page }) => {
          await open(page, { settings: { ...DEFAULTS, [item.field]: c.value }, timer: item.timer })
          await passEnd(page)
          await expectPhase(page, c.want ? item.on : item.off)
        })
      }
    }
  })

  test.describe('初期表示時の処理: タイマーの状態を読む', () => {
    /** 最初の状態と、フェーズもサイクルの回も違う、開始前の状態 */
    const BASE = idle('longBreak', 2)
    const RUNNING = running('work', 20 * MINUTE)

    const without = (state: TimerState, field: keyof TimerState) => {
      const { [field]: _, ...rest } = state
      return rest
    }

    const invalid: { label: string; timer: unknown }[] = [
      { label: 'オブジェクトでない（JSON の配列）', timer: [] },
      { label: 'オブジェクトでない（JSON の null）', timer: null },
      // どの動作でも使う項目が欠けている
      ...(['phase', 'cycle', 'status', 'taskId'] as const).map((field) => ({
        label: `${field} の項目がない`,
        timer: without(BASE, field),
      })),
      // その動作で使う項目が欠けている
      { label: '動作中で、endsAt の項目がない', timer: without(RUNNING, 'endsAt') },
      { label: '動作中で、phaseSeconds の項目がない', timer: without(RUNNING, 'phaseSeconds') },
      { label: '一時停止中で、remainingSeconds の項目がない', timer: without(PAUSED, 'remainingSeconds') },
      { label: '一時停止中で、phaseSeconds の項目がない', timer: without(PAUSED, 'phaseSeconds') },
      { label: 'phase が、3 つのどれでもない（"rest"）', timer: { ...BASE, phase: 'rest' } },
      { label: 'cycle の型が違う（文字列の "2"）', timer: { ...BASE, cycle: '2' } },
      { label: 'status が、3 つのどれでもない（"stopped"）', timer: { ...BASE, status: 'stopped' } },
      { label: 'phaseSeconds の型が違う（文字列の "1500"）', timer: { ...RUNNING, phaseSeconds: '1500' } },
      { label: 'endsAt が時刻として読めない（"tomorrow"）', timer: { ...RUNNING, endsAt: 'tomorrow' } },
      { label: 'endsAt の型が違う（数値）', timer: { ...RUNNING, endsAt: NOW.getTime() + 20 * MINUTE } },
      { label: 'remainingSeconds の型が違う（文字列の "1200"）', timer: { ...PAUSED, remainingSeconds: '1200' } },
      { label: 'taskId の型が違う（数値の 5）', timer: { ...BASE, taskId: 5 } },
      { label: '動作中なのに終了予定時刻がない', timer: { ...RUNNING, endsAt: null } },
      { label: '一時停止中なのに残り秒数がない', timer: { ...PAUSED, remainingSeconds: null } },
      { label: '動作中なのにフェーズの長さがない', timer: { ...RUNNING, phaseSeconds: null } },
      { label: '一時停止中なのにフェーズの長さがない', timer: { ...PAUSED, phaseSeconds: null } },
    ]

    test('[初期表示 / タイマーの状態 値がない] タイマーの状態に値がないとき、最初の状態（作業、サイクルの 1 回目、開始前、ほかは null）を作って保存する', async ({ page }) => {
      await open(page, {})
      await expectTimer(page, INITIAL)
    })

    test('[初期表示 / タイマーの状態 JSON として読めない] タイマーの状態が JSON として読めないとき、値がないときと同じに、最初の状態を作って保存する', async ({ page }) => {
      await open(page, { timer: raw('{"phase":"longBreak"') })
      await expectTimer(page, INITIAL)
    })

    for (const c of invalid) {
      test(`[初期表示 / タイマーの状態 形式に合わない] ${c.label}とき、最初の状態を作って保存する`, async ({ page }) => {
        await open(page, { timer: c.timer })
        await expectTimer(page, INITIAL)
      })
    }

    const valid: { label: string; timer: TimerState }[] = [
      { label: '開始前（長休憩、サイクルの 2 回目、タスクを選択中）', timer: { ...BASE, taskId: TASK.id } },
      { label: '一時停止中', timer: PAUSED },
      { label: '動作中（終了予定時刻が、まだ来ていない）', timer: RUNNING },
      // その動作で使わない値が、余分に入っている
      { label: '開始前なのにフェーズの長さがある', timer: { ...BASE, phaseSeconds: 25 * 60 } },
      { label: '開始前なのに終了予定時刻（過ぎた時刻）と残り秒数がある', timer: { ...BASE, endsAt: at(-HOUR), remainingSeconds: 10 * 60 } },
      { label: '一時停止中なのに終了予定時刻（過ぎた時刻）がある', timer: { ...PAUSED, endsAt: at(-HOUR) } },
      { label: '動作中なのに残り秒数がある', timer: { ...RUNNING, remainingSeconds: 10 * 60 } },
    ]

    // その動作で使わない値の、項目そのものが欠けている
    const unused: { label: string; timer: TimerState; field: 'phaseSeconds' | 'endsAt' | 'remainingSeconds' }[] = [
      { label: '開始前で、phaseSeconds の項目がない', timer: BASE, field: 'phaseSeconds' },
      { label: '開始前で、endsAt の項目がない', timer: BASE, field: 'endsAt' },
      { label: '開始前で、remainingSeconds の項目がない', timer: BASE, field: 'remainingSeconds' },
      { label: '動作中で、remainingSeconds の項目がない', timer: RUNNING, field: 'remainingSeconds' },
      { label: '一時停止中で、endsAt の項目がない', timer: PAUSED, field: 'endsAt' },
    ]

    for (const c of unused) {
      test(`[初期表示 / タイマーの状態 形式に合う] ${c.label}状態は、形式に合うものとして、そのまま使い、最初の状態に戻さない`, async ({ page }) => {
        await open(page, { timer: without(c.timer, c.field) })
        const title = (remaining: string) => (c.timer.status === 'running' ? `${remaining} ${HOST.title}` : HOST.title)
        // 欠けている項目は、保存し直していなくても、null で保存し直していても、どちらでもよい
        const stored = async () => ({ [c.field]: null, ...(await read<Partial<TimerState>>(page, STG.timer)) })
        await expect(page).toHaveTitle(title('20:00'))
        await expect.poll(stored).toEqual(c.timer)
        await page.clock.runFor(SECOND)
        await expect(page).toHaveTitle(title('19:59'))
        await expect.poll(stored).toEqual(c.timer)
      })
    }

    for (const c of valid) {
      test(`[初期表示 / タイマーの状態 形式に合う] ${c.label}の状態は、そのまま使い、書き換えない`, async ({ page }) => {
        await open(page, { timer: c.timer, tasks: [TASK] })
        // 動作中なら、残り時間が document.title に出るのを待ってから、書き換えていないことを確かめる
        await expect(page).toHaveTitle(c.timer.status === 'running' ? `20:00 ${HOST.title}` : HOST.title)
        await expectTimer(page, c.timer)
        // 1 秒ごとの処理が動いたあとも、余分な値を読んで完了にしたり、書き換えたりしない
        await page.clock.runFor(SECOND)
        await expect(page).toHaveTitle(c.timer.status === 'running' ? `19:59 ${HOST.title}` : HOST.title)
        await expectTimer(page, c.timer)
      })
    }
  })

  test.describe('初期表示時の処理: 動作中のとき', () => {
    test('[初期表示 / 動作中] 動作中で、終了予定時刻がまだ来ていないとき、時刻を進めなくても、document.title に残り時間を付ける', async ({ page }) => {
      await open(page, { timer: running('work', 20 * MINUTE) })
      await expect(page).toHaveTitle(`20:00 ${HOST.title}`)
    })

    test('[初期表示 / 動作中] 動作中で、終了予定時刻を過ぎているとき、時刻を進めなくても、フェーズを完了にする（作業記録の completedAt は、終了予定時刻）', async ({ page }) => {
      const timer = running('work', -3 * HOUR, { taskId: TASK.id })
      await open(page, { timer, tasks: [TASK] })
      await expectTimer(page, idle('shortBreak', 1, TASK.id))
      await expectRecords(page, [{ completedAt: at(-3 * HOUR), taskId: TASK.id, seconds: 25 * 60 }])
      await expect(page).toHaveTitle(HOST.title)
    })

    test('[初期表示 / 動作中 境目] 動作中で、現在の時刻が終了予定時刻ちょうどのとき、フェーズを完了にする', async ({ page }) => {
      await open(page, { timer: running('work', 0) })
      await expectTimer(page, idle('shortBreak', 1))
    })

    test('[初期表示 / 動作中 境目] 動作中で、終了予定時刻の 1 秒前のとき、フェーズを完了にせず、document.title に「00:01」を付ける', async ({ page }) => {
      const timer = endingSoon('work')
      await open(page, { timer })
      await expect(page).toHaveTitle(`00:01 ${HOST.title}`)
      await expectTimer(page, timer)
    })

    test('[初期表示 / 動作中 / フェーズ完了 / 自動スタート 境目] 遅れが 60 秒ちょうどで、休憩を自動スタートする設定のとき、小休憩を開始する（終了予定時刻は、現在の時刻 ＋ フェーズの長さ）', async ({ page }) => {
      await open(page, { settings: { ...CUSTOM, autoStartBreak: true }, timer: running('work', -60 * SECOND) })
      await expectTimer(page, started('shortBreak', 1, 10 * 60, 10 * MINUTE))
      await expect(page).toHaveTitle(`10:00 ${HOST.title}`)
    })

    test('[初期表示 / 動作中 / フェーズ完了 / 自動スタート 境目] 遅れが 61 秒のとき、休憩を自動スタートする設定でも、開始前のままにする', async ({ page }) => {
      await open(page, { settings: { ...CUSTOM, autoStartBreak: true }, timer: running('work', -61 * SECOND) })
      await expectTimer(page, idle('shortBreak', 1))
      await expect(page).toHaveTitle(HOST.title)
    })

    test('[初期表示 / 開始前] 開始前のとき、時刻が進んでも、document.title に残り時間を付けず、タイマーの状態を変えない', async ({ page }) => {
      const timer = idle('shortBreak', 2)
      await open(page, { timer })
      await page.clock.runFor(3 * SECOND)
      await expect(page).toHaveTitle(HOST.title)
      await expectTimer(page, timer)
    })

    test('[初期表示 / 一時停止中] 一時停止中のとき、時刻が進んでも、document.title に残り時間を付けず、タイマーの状態を変えない', async ({ page }) => {
      await open(page, { timer: PAUSED })
      await page.clock.runFor(3 * SECOND)
      await expect(page).toHaveTitle(HOST.title)
      await expectTimer(page, PAUSED)
    })
  })

  test.describe('リンク押下', () => {
    for (const from of SCREENS) {
      for (const to of SCREENS.filter((s) => s !== from)) {
        test(`[「${to.name}」リンク押下] ${from.name}画面で押すと、${to.name}画面へ遷移する（URL クエリは付けない）`, async ({ page }) => {
          await open(page, {}, { path: from.path })
          await ui(page).link(to.name).click()
          await expect(page).toHaveURL((url) => url.pathname === to.path && url.search === '')
        })
      }
    }

    for (const screen of SCREENS) {
      test(`[「${screen.name}」リンク押下] ${screen.name}画面（${screen.current}）で押しても、何もしない（URL も、ブラウザの履歴も変えない）`, async ({ page }) => {
        await open(page, {}, { path: screen.current })
        const sameUrl = (url: URL) => `${url.pathname}${url.search}` === screen.current
        await expect(page).toHaveURL(sameUrl)
        const before = await page.evaluate(() => history.length)
        await ui(page).link(screen.name).click()
        await expect(page).toHaveURL(sameUrl)
        expect(await page.evaluate(() => history.length)).toBe(before)
        await expect(ui(page).link(screen.name)).toHaveAttribute('aria-current', 'page')
      })
    }

    test('[「タスク管理」リンク押下] 遷移は、ブラウザの履歴に追加する（ブラウザの戻るで、元の画面に戻る）', async ({ page }) => {
      await open(page)
      await ui(page).link('タスク管理').click()
      await expect(page).toHaveURL((url) => url.pathname === '/tasks')
      await page.goBack()
      await expect(page).toHaveURL((url) => url.pathname === HOST.path)
    })

    test('[「履歴」リンク押下 / 1 秒たつ] タイマーが動作中に遷移しても、タイマーの状態を変えず、遷移先の画面の document.title に残り時間を付ける', async ({ page }) => {
      const timer = running('work', 20 * MINUTE)
      await open(page, { timer })
      await ui(page).link('履歴').click()
      await expect(page).toHaveURL((url) => url.pathname === '/history')
      await page.clock.runFor(SECOND)
      await expect(page).toHaveTitle('19:59 履歴')
      await expectTimer(page, timer)
    })
  })

  test.describe('タイマーが動作中に、1 秒たつ', () => {
    test('[1 秒たつ] 1 秒ごとに、document.title の残り時間を変える（20:00 → 19:59 → 19:52）', async ({ page }) => {
      await open(page, { timer: running('work', 20 * MINUTE) })
      await expect(page).toHaveTitle(`20:00 ${HOST.title}`)
      await page.clock.runFor(SECOND)
      await expect(page).toHaveTitle(`19:59 ${HOST.title}`)
      await page.clock.runFor(7 * SECOND)
      await expect(page).toHaveTitle(`19:52 ${HOST.title}`)
    })

    test('[1 秒たつ] 残り時間を表示するだけで、タイマーの状態（終了予定時刻）は変えない', async ({ page }) => {
      const timer = running('work', 20 * MINUTE)
      await open(page, { timer })
      await page.clock.runFor(8 * SECOND)
      await expect(page).toHaveTitle(`19:52 ${HOST.title}`)
      await expectTimer(page, timer)
    })

    for (const screen of SCREENS) {
      test(`[1 秒たつ / document.title] ${screen.name}画面では、「{残り時間} ${screen.title}」にする`, async ({ page }) => {
        await open(page, { timer: running('work', 24 * MINUTE + 53 * SECOND) }, { path: screen.path })
        await page.clock.runFor(SECOND)
        await expect(page).toHaveTitle(`24:52 ${screen.title}`)
      })
    }

    const formats: { label: string; remainingMs: number; text: string }[] = [
      { label: '1 秒', remainingMs: SECOND, text: '00:01' },
      { label: '9 秒', remainingMs: 9 * SECOND, text: '00:09' },
      { label: '1 分 5 秒', remainingMs: 65 * SECOND, text: '01:05' },
      { label: '9 分 59 秒', remainingMs: 599 * SECOND, text: '09:59' },
      { label: '10 分', remainingMs: 10 * MINUTE, text: '10:00' },
      { label: '59 分 59 秒', remainingMs: 3599 * SECOND, text: '59:59' },
      { label: '60 分', remainingMs: 60 * MINUTE, text: '60:00' },
      { label: '99 分 59 秒（分が 2 桁の、いちばん大きい値）', remainingMs: 5999 * SECOND, text: '99:59' },
      { label: '100 分（分が 3 桁の、いちばん小さい値）', remainingMs: 100 * MINUTE, text: '100:00' },
      { label: '120 分', remainingMs: 120 * MINUTE, text: '120:00' },
    ]

    for (const c of formats) {
      test(`[1 秒たつ / 残り時間 書式] 残りが ${c.label}のとき、「${c.text}」と表示する`, async ({ page }) => {
        await open(page, { timer: running('work', c.remainingMs, { phaseSeconds: 120 * 60 }) })
        await expect(page).toHaveTitle(`${c.text} ${HOST.title}`)
      })
    }

    const roundings: { label: string; remainingMs: number; text: string }[] = [
      { label: '19 分 59 秒ちょうど', remainingMs: 1199 * SECOND, text: '19:59' },
      { label: '19 分 59.001 秒', remainingMs: 1199 * SECOND + 1, text: '20:00' },
      { label: '19 分 59.5 秒', remainingMs: 1199 * SECOND + 500, text: '20:00' },
      { label: '0.5 秒', remainingMs: 500, text: '00:01' },
    ]

    for (const c of roundings) {
      test(`[1 秒たつ / 残り時間 切り上げ] 残りが ${c.label}のとき、1 秒未満を切り上げて「${c.text}」と表示する`, async ({ page }) => {
        await open(page, { timer: running('work', c.remainingMs) })
        await expect(page).toHaveTitle(`${c.text} ${HOST.title}`)
      })
    }

    test('[1 秒たつ] タイマー画面では、画面の残り時間も、document.title と同じ残り時間で表示する', async ({ page }) => {
      await open(page, { timer: running('work', 20 * MINUTE) }, { path: '/' })
      await page.clock.runFor(8 * SECOND)
      await expect(page).toHaveTitle('19:52 タイマー')
      await expect(page.getByText('19:52', { exact: true })).toBeVisible()
    })

    test('[1 秒たつ 境目] 現在の時刻が終了予定時刻ちょうどになったとき、フェーズを完了にする', async ({ page }) => {
      await open(page, { timer: endingSoon('work') })
      await expect(page).toHaveTitle(`00:01 ${HOST.title}`)
      await page.clock.runFor(SECOND)
      await expectTimer(page, idle('shortBreak', 1))
    })

    test('[1 秒たつ / タブが表に戻る] 1 秒ごとの処理が動かない間に 10 秒たっても、タブが表に戻ったときに、残り時間を表示し直す', async ({ page }) => {
      await open(page, { timer: running('work', 20 * MINUTE) })
      await expect(page).toHaveTitle(`20:00 ${HOST.title}`)
      await returnToFront(page, 10 * SECOND)
      await expect(page).toHaveTitle(`19:50 ${HOST.title}`)
    })

    test('[1 秒たつ / タブが表に戻る / フェーズ完了 境目] タブが表に戻ったときに、終了予定時刻を 60 秒ちょうど過ぎていたら、フェーズを完了にし、自動スタートする', async ({ page }) => {
      await open(page, { settings: { ...DEFAULTS, autoStartBreak: true }, timer: endingSoon('work') })
      await expect(page).toHaveTitle(`00:01 ${HOST.title}`)
      await returnToFront(page, 61 * SECOND)
      await expectTimer(page, started('shortBreak', 1, 5 * 60, 61 * SECOND + 5 * MINUTE))
      await expectRecords(page, [{ completedAt: at(SECOND), taskId: null, seconds: 25 * 60 }])
    })

    test('[1 秒たつ / タブが表に戻る / フェーズ完了 境目] タブが表に戻ったときに、終了予定時刻を 61 秒過ぎていたら、フェーズを完了にするが、自動スタートはしない', async ({ page }) => {
      await open(page, { settings: { ...DEFAULTS, autoStartBreak: true }, timer: endingSoon('work') })
      await expect(page).toHaveTitle(`00:01 ${HOST.title}`)
      await returnToFront(page, 62 * SECOND)
      await expectTimer(page, idle('shortBreak', 1))
      await expectRecords(page, [{ completedAt: at(SECOND), taskId: null, seconds: 25 * 60 }])
    })
  })

  test.describe('フェーズが完了する: 作業記録', () => {
    /** 完了する作業フェーズの作業記録（終了予定時刻は、開いてから 1 秒後） */
    const record = (over: Partial<WorkRecord> = {}): WorkRecord => ({
      completedAt: at(SECOND),
      taskId: null,
      seconds: 25 * 60,
      ...over,
    })

    test('[フェーズ完了 / 作業記録] 作業が完了すると、作業記録を 1 件足す（completedAt は終了予定時刻、taskId は選択中のタスク、seconds はフェーズの長さ）', async ({ page }) => {
      await open(page, { timer: endingSoon('work', { taskId: TASK.id }), tasks: [TASK], records: [] })
      await passEnd(page)
      await expectRecords(page, [record({ taskId: TASK.id })])
    })

    test('[フェーズ完了 / 作業記録] 選択中のタスクが「タスクなし」のとき、taskId を null にして足す', async ({ page }) => {
      await open(page, { timer: endingSoon('work'), tasks: [TASK], records: [] })
      await passEnd(page)
      await expectRecords(page, [record({ taskId: null })])
    })

    test('[フェーズ完了 / 作業記録] seconds は、いまの設定の作業時間ではなく、そのフェーズを開始したときのフェーズの長さにする', async ({ page }) => {
      // 50 分で開始した作業フェーズ。設定の作業時間は、そのあと 25 分に変えた
      await open(page, { settings: DEFAULTS, timer: endingSoon('work', { phaseSeconds: 50 * 60 }) })
      await passEnd(page)
      await expectRecords(page, [record({ seconds: 50 * 60 })])
    })

    test('[フェーズ完了 / 作業記録] 前からある作業記録は残し、その後ろに足す', async ({ page }) => {
      const older: WorkRecord = { completedAt: at(-48 * HOUR), taskId: TASK.id, seconds: 50 * 60 }
      await open(page, { timer: endingSoon('work'), tasks: [TASK], records: [older, OLD_RECORD] })
      await passEnd(page)
      await expectRecords(page, [older, OLD_RECORD, record()])
    })

    const broken: { label: string; records: unknown }[] = [
      { label: '値がない', records: undefined },
      { label: '配列でない（JSON のオブジェクト）', records: { completedAt: at(-HOUR), taskId: null, seconds: 1500 } },
      { label: 'JSON として読めない', records: raw('[{"completedAt":') },
    ]

    for (const c of broken) {
      test(`[フェーズ完了 / 作業記録 ${c.label}] 作業記録が${c.label}とき、空の配列に足して、1 件だけを保存する`, async ({ page }) => {
        await open(page, { timer: endingSoon('work'), records: c.records })
        await passEnd(page)
        await expectRecords(page, [record()])
      })
    }

    test('[フェーズ完了 / 作業記録 形式に合わない] 形式に合わない要素（項目がない、型が違う、completedAt が日時として読めない、seconds が 0 以下、オブジェクトでない）は残さず、形式に合う要素だけを残して足す', async ({ page }) => {
      await open(page, {
        timer: endingSoon('work'),
        records: [
          OLD_RECORD,
          { completedAt: at(-HOUR), taskId: null }, // seconds がない
          { completedAt: at(-HOUR), seconds: 1500 }, // taskId がない
          { taskId: null, seconds: 1500 }, // completedAt がない
          { completedAt: 123, taskId: null, seconds: 1500 }, // completedAt の型が違う
          { completedAt: at(-HOUR), taskId: 5, seconds: 1500 }, // taskId の型が違う
          { completedAt: at(-HOUR), taskId: null, seconds: '1500' }, // seconds の型が違う
          { completedAt: 'tomorrow', taskId: null, seconds: 1500 }, // completedAt が日時として読めない
          { completedAt: at(-HOUR), taskId: null, seconds: 0 }, // seconds が 0
          { completedAt: at(-HOUR), taskId: null, seconds: -1500 }, // seconds が 0 より小さい
          'x',
          null,
        ],
      })
      await passEnd(page)
      await expectRecords(page, [OLD_RECORD, record()])
    })

    test('[フェーズ完了 / 作業記録 形式に合う] 必須の項目と型が合っている要素は、内容の範囲を確かめずに残す（taskId が UUID の形でない、タスクの中にない、seconds が 1）', async ({ page }) => {
      const loose: WorkRecord[] = [
        { completedAt: at(-3 * HOUR), taskId: 'abc', seconds: 1500 }, // taskId が UUID の形でない
        { completedAt: at(-2 * HOUR), taskId: OTHER_TASK.id, seconds: 1500 }, // taskId が、タスクの中にない
        { completedAt: at(-HOUR), taskId: null, seconds: 1 }, // seconds が、0 より大きい、いちばん小さい整数
      ]
      await open(page, { timer: endingSoon('work'), tasks: [TASK], records: loose })
      await passEnd(page)
      await expectRecords(page, [...loose, record()])
    })

    for (const phase of ['shortBreak', 'longBreak'] as const) {
      const name = phase === 'shortBreak' ? '小休憩' : '長休憩'
      test(`[フェーズ完了 / 作業記録] ${name}が完了しても、作業記録を足さない`, async ({ page }) => {
        await open(page, { timer: endingSoon(phase, { cycle: 2 }), records: [OLD_RECORD] })
        await passEnd(page)
        // 次のフェーズへ進んだのを待ってから、足していないことを確かめる
        await expectPhase(page, idle('work', phase === 'shortBreak' ? 3 : 1))
        await expectRecords(page, [OLD_RECORD])
      })
    }
  })

  test.describe('フェーズが完了する: 次のフェーズ', () => {
    const nexts: { label: string; phase: Phase; cycle: number; cycles: number; next: Phase; nextCycle: number }[] = [
      { label: '作業で、サイクルの回（3）が cycles（4）より小さいとき、小休憩へ進み、サイクルの回は変えない', phase: 'work', cycle: 3, cycles: 4, next: 'shortBreak', nextCycle: 3 },
      { label: '作業で、サイクルの回（4）が cycles（4）と同じとき、長休憩へ進み、サイクルの回は変えない', phase: 'work', cycle: 4, cycles: 4, next: 'longBreak', nextCycle: 4 },
      { label: '作業で、サイクルの回（5）が cycles（4）より大きいとき、長休憩へ進み、サイクルの回は変えない', phase: 'work', cycle: 5, cycles: 4, next: 'longBreak', nextCycle: 5 },
      { label: '作業で、サイクルの回（1）が cycles（1）と同じとき、長休憩へ進む', phase: 'work', cycle: 1, cycles: 1, next: 'longBreak', nextCycle: 1 },
      { label: '小休憩（サイクルの 1 回目）のとき、作業へ進み、サイクルの回を 1 増やす（2）', phase: 'shortBreak', cycle: 1, cycles: 4, next: 'work', nextCycle: 2 },
      { label: '小休憩（サイクルの 4 回目）のとき、cycles（4）に関わらず、作業へ進み、サイクルの回を 1 増やす（5）', phase: 'shortBreak', cycle: 4, cycles: 4, next: 'work', nextCycle: 5 },
      { label: '長休憩（サイクルの 4 回目）のとき、作業へ進み、サイクルの回を 1 にする', phase: 'longBreak', cycle: 4, cycles: 4, next: 'work', nextCycle: 1 },
    ]

    for (const c of nexts) {
      test(`[フェーズ完了 / 次のフェーズ] ${c.label}（動作は開始前、フェーズの長さ・終了予定時刻・残り秒数は null）`, async ({ page }) => {
        await open(page, { settings: { ...DEFAULTS, cycles: c.cycles }, timer: endingSoon(c.phase, { cycle: c.cycle }) })
        await passEnd(page)
        await expectPhase(page, idle(c.next, c.nextCycle))
      })
    }
  })

  test.describe('フェーズが完了する: 選択中のタスク', () => {
    const archived: Task = { ...TASK, archived: true }
    const { name: _name, ...noName } = TASK

    /** 必須の項目と型は合っているが、ID が UUID の形でなく、名前が 51 文字のタスク */
    const looseTask: Task = { ...TASK, id: 'abc', name: 'あ'.repeat(51) }

    /** taskId は、選択中のタスク（省略すると TASK） */
    const toWork: { label: string; tasks: unknown; kept: boolean; taskId?: string }[] = [
      { label: '選択中のタスクが、タスクの中にあり、アーカイブされていないとき、選択中のタスクを変えない', tasks: [OTHER_TASK, TASK], kept: true },
      { label: '選択中のタスクが、タスクの中にないとき、選択中のタスクを null にする', tasks: [OTHER_TASK], kept: false },
      { label: '選択中のタスクの archived が true のとき、選択中のタスクを null にする', tasks: [OTHER_TASK, archived], kept: false },
      { label: 'タスクに値がないとき、0 件として扱い、選択中のタスクを null にする', tasks: undefined, kept: false },
      { label: 'タスクが配列でないとき、0 件として扱い、選択中のタスクを null にする', tasks: { [TASK.id]: TASK }, kept: false },
      { label: '選択中のタスクの要素が形式に合わない（name がない）とき、ないものとして扱い、選択中のタスクを null にする', tasks: [OTHER_TASK, noName], kept: false },
      { label: 'タスクが JSON として読めないとき、値がないときと同じに 0 件として扱い、選択中のタスクを null にする', tasks: raw(`[${JSON.stringify(TASK)}`), kept: false },
      { label: '選択中のタスクの要素が形式に合わない（archived の型が違う）とき、ないものとして扱い、選択中のタスクを null にする', tasks: [{ ...TASK, archived: 'false' }], kept: false },
      { label: '選択中のタスクの要素が形式に合わない（color が #RRGGBB の形でない）とき、ないものとして扱い、選択中のタスクを null にする', tasks: [{ ...TASK, color: 'red' }], kept: false },
      { label: '選択中のタスクの要素が形式に合わない（createdAt が日時として読めない）とき、ないものとして扱い、選択中のタスクを null にする', tasks: [{ ...TASK, createdAt: 'yesterday' }], kept: false },
      { label: '選択中のタスクの color の英字が小文字（#ef4444）でも、形式に合うものとして扱い、選択中のタスクを変えない', tasks: [{ ...TASK, color: '#ef4444' }], kept: true },
      { label: '選択中のタスクの ID が UUID の形でなく、名前が 51 文字でも、形式に合うものとして扱い、選択中のタスクを変えない', tasks: [looseTask], kept: true, taskId: looseTask.id },
    ]

    for (const c of toWork) {
      test(`[フェーズ完了 / 選択中のタスク] 次のフェーズが作業（小休憩が完了）で、${c.label}`, async ({ page }) => {
        const taskId = c.taskId ?? TASK.id
        await open(page, { timer: endingSoon('shortBreak', { taskId }), tasks: c.tasks })
        await passEnd(page)
        await expectPhase(page, idle('work', 2, c.kept ? taskId : null))
      })
    }

    test('[フェーズ完了 / 選択中のタスク] 次のフェーズが作業（長休憩が完了）で、選択中のタスクの archived が true のとき、選択中のタスクを null にする', async ({ page }) => {
      await open(page, { timer: endingSoon('longBreak', { cycle: 4, taskId: TASK.id }), tasks: [archived] })
      await passEnd(page)
      await expectPhase(page, idle('work', 1, null))
    })

    const toBreak: { label: string; tasks: Task[] }[] = [
      { label: '選択中のタスクの archived が true でも', tasks: [archived] },
      { label: '選択中のタスクが、タスクの中になくても', tasks: [OTHER_TASK] },
    ]

    for (const c of toBreak) {
      test(`[フェーズ完了 / 選択中のタスク] 次のフェーズが休憩（作業が完了）のときは、${c.label}、選択中のタスクを変えない（作業記録の taskId にも、そのタスクを入れる）`, async ({ page }) => {
        await open(page, { timer: endingSoon('work', { taskId: TASK.id }), tasks: c.tasks })
        await passEnd(page)
        await expectPhase(page, idle('shortBreak', 1, TASK.id))
        await expectRecords(page, [{ completedAt: at(SECOND), taskId: TASK.id, seconds: 25 * 60 }])
      })
    }
  })

  test.describe('フェーズが完了する: 自動スタート', () => {
    const autos: { label: string; settings: Settings; timer: TimerState; want: TimerState }[] = [
      {
        label: '次のフェーズが小休憩で、autoStartBreak が true のとき、小休憩を開始する（フェーズの長さは、設定の小休憩時間 10 分）',
        settings: { ...CUSTOM, autoStartBreak: true },
        timer: endingSoon('work'),
        want: started('shortBreak', 1, 10 * 60),
      },
      {
        label: '次のフェーズが長休憩で、autoStartBreak が true のとき、長休憩を開始する（フェーズの長さは、設定の長休憩時間 30 分）',
        settings: { ...CUSTOM, autoStartBreak: true },
        timer: endingSoon('work', { cycle: 4 }),
        want: started('longBreak', 4, 30 * 60),
      },
      {
        label: '次のフェーズが休憩で、autoStartBreak が false のとき、autoStartWork が true でも、開始前のままにする',
        settings: { ...CUSTOM, autoStartWork: true },
        timer: endingSoon('work'),
        want: idle('shortBreak', 1),
      },
      {
        label: '次のフェーズが作業（小休憩が完了）で、autoStartWork が true のとき、作業を開始する（フェーズの長さは、設定の作業時間 50 分）',
        settings: { ...CUSTOM, autoStartWork: true },
        timer: endingSoon('shortBreak'),
        want: started('work', 2, 50 * 60),
      },
      {
        label: '次のフェーズが作業（長休憩が完了）で、autoStartWork が true のとき、作業を開始する（サイクルの回は 1）',
        settings: { ...CUSTOM, autoStartWork: true },
        timer: endingSoon('longBreak', { cycle: 4 }),
        want: started('work', 1, 50 * 60),
      },
      {
        label: '次のフェーズが作業で、autoStartWork が false のとき、autoStartBreak が true でも、開始前のままにする',
        settings: { ...CUSTOM, autoStartBreak: true },
        timer: endingSoon('shortBreak'),
        want: idle('work', 2),
      },
    ]

    for (const c of autos) {
      test(`[フェーズ完了 / 自動スタート] ${c.label}`, async ({ page }) => {
        await open(page, { settings: c.settings, timer: c.timer })
        await passEnd(page)
        await expectPhase(page, c.want)
      })
    }

    test('[フェーズ完了 / 自動スタート] 開始したフェーズの終了予定時刻は「現在の時刻 ＋ フェーズの長さ」で、残り秒数は null のままにする（終了予定時刻ちょうどに完了）', async ({ page }) => {
      await open(page, { settings: { ...CUSTOM, autoStartBreak: true }, timer: endingSoon('work') })
      await page.clock.runFor(SECOND)
      await expectTimer(page, started('shortBreak', 1, 10 * 60, SECOND + 10 * MINUTE))
    })

    test('[フェーズ完了 / 自動スタート] 自動スタートしたフェーズも、終了予定時刻に完了して、次のフェーズへ進む（作業 → 小休憩 → サイクルの 2 回目の作業）', async ({ page }) => {
      await open(page, {
        settings: { ...DEFAULTS, autoStartBreak: true, autoStartWork: true },
        timer: endingSoon('work'),
      })
      await passEnd(page)
      await expectPhase(page, started('shortBreak', 1, 5 * 60))
      // 5 分の小休憩が終わるまで進める
      await page.clock.runFor(5 * MINUTE + SECOND)
      await expectPhase(page, started('work', 2, 25 * 60))
      await expectRecords(page, [{ completedAt: at(SECOND), taskId: null, seconds: 25 * 60 }])
    })
  })

  test.describe('フェーズが完了する: document.title と画面の表示', () => {
    test('[フェーズ完了 / document.title] 次のフェーズを自動スタートしないとき、document.title を、残り時間を付けないもの（「設定」）に戻す', async ({ page }) => {
      await open(page, { timer: endingSoon('work') })
      await expect(page).toHaveTitle(`00:01 ${HOST.title}`)
      await passEnd(page)
      await expect(page).toHaveTitle(HOST.title)
    })

    test('[フェーズ完了 / document.title] 次のフェーズを自動スタートしたとき、document.title に、次のフェーズの残り時間を付ける（終了予定時刻ちょうどに完了して「05:00 設定」、1 秒後に「04:59 設定」）', async ({ page }) => {
      await open(page, { settings: { ...DEFAULTS, autoStartBreak: true }, timer: endingSoon('work') })
      await expect(page).toHaveTitle(`00:01 ${HOST.title}`)
      await page.clock.runFor(SECOND)
      await expect(page).toHaveTitle(`05:00 ${HOST.title}`)
      await page.clock.runFor(SECOND)
      await expect(page).toHaveTitle(`04:59 ${HOST.title}`)
    })

    test('[フェーズ完了 / タイマー画面] タイマー画面では、画面の表示を、変えたあとの状態に合わせる（一時停止のボタンを開始のボタンに変え、残り時間を小休憩の長さ「05:00」にする）', async ({ page }) => {
      await open(page, { settings: DEFAULTS, timer: endingSoon('work') }, { path: '/' })
      const pause = page.getByRole('button', { name: '一時停止', exact: true })
      const start = page.getByRole('button', { name: '開始', exact: true })
      await expect(pause).toBeVisible()
      await passEnd(page)
      await expect(start).toBeVisible()
      await expect(pause).toBeHidden()
      await expect(page.getByText('05:00', { exact: true })).toBeVisible()
      await expect(page).toHaveTitle('タイマー')
    })

    test('[フェーズ完了 / 履歴画面] 履歴画面で作業が完了すると、足した作業記録を、表示に入れる（「0 ポモドーロ」が「1 ポモドーロ」になる）', async ({ page }) => {
      await open(page, { timer: endingSoon('work'), records: [] }, { path: '/history' })
      await expect(page.getByText('0 ポモドーロ', { exact: true })).toBeVisible()
      await expect(page.getByText('この期間の作業記録はありません', { exact: true })).toBeVisible()
      await passEnd(page)
      await expect(page.getByText('1 ポモドーロ', { exact: true })).toBeVisible()
      await expect(page.getByText('この期間の作業記録はありません', { exact: true })).toBeHidden()
    })
  })

  test.describe('共通ルール', () => {
    test('[共通ルール アクセシビリティ] Tab キーでフォーカスが移る順序は、タイマー → タスク管理 → 履歴 → 設定', async ({ page }) => {
      await open(page)
      const u = ui(page)
      await u.link('タイマー').focus()
      for (const name of ['タスク管理', '履歴', '設定']) {
        await page.keyboard.press('Tab')
        await expect(u.link(name)).toBeFocused()
      }
    })
  })
})
