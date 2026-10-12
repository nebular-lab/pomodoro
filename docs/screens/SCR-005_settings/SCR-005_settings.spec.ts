/**
 * SCR-005 設定 の Playwright テスト
 *
 * 設計書: docs/screens/SCR-005_settings/SCR-005_settings.md
 * ワイヤーフレーム: docs/screens/SCR-005_settings/SCR-005_settings.html
 * ブラウザストレージ一覧: docs/screens/storage.md
 * 共通ルール: docs/screens/common-rules.md
 *
 * テスト名の先頭の [...] は、設計書のどこから作ったケースかを、場面・項目名・条件で示す。
 *   [document.title]                          … 冒頭の表の document.title
 *   [閲覧権限 利用者]                         … 3. 閲覧権限 の行
 *   [見出し 表示内容]                         … 画面項目「見出し」の表示内容
 *   [作業時間の見出し 表示内容]               … 画面項目「作業時間の見出し」の表示内容
 *   [作業時間 選択肢]                         … 画面項目「作業時間」の備考の選択肢
 *   [作業時間 value]                          … 画面項目「作業時間」の value
 *   [「休憩を自動スタートする」 type]         … 画面項目「休憩を自動スタートする」の type
 *   [「休憩を自動スタートする」 checked]      … 画面項目「休憩を自動スタートする」の「その他の属性」の checked
 *   [初期表示 / 設定 値がない]                … 5. 初期表示時の処理 で、設定（ストレージ）に値がないとき
 *   [設定の値を変える / 作業時間]             … アクション「設定の値を変える」を、作業時間で行ったとき
 *   [設定の値を変える / 作業時間 境目]        … 同じく、選択肢のいちばん端の値で行ったとき
 *   [設定の値を変える / 設定 形式に合わない]  … 同じく、設定（ストレージ）に形式に合わない項目があるとき
 *   [共通ルール アクセシビリティ]             … 共通ルールの「アクセシビリティ」のルール
 *   [共通ルール ブラウザの戻るで…]           … 共通ルールの「遷移」の行
 * 2 つの出典に当たるケースは「/」で併記している。
 *
 * 実装についての前提:
 * - この画面は API を呼ばない。データは localStorage に持つ（キーと形式は storage.md）
 * - 作業時間・小休憩時間・長休憩時間・サイクルは、設計書のタグのとおり select 要素で、見出しと関連付けられている
 * - チェックボックスは、文言を名前に持つ。設計書のとおり、type が checkbox の input 要素
 * - 設計書の画面項目に書かれた属性（type）は、書かれた値になっていることを確かめる。値が - の属性はケースにしない。
 *   見出しの for は、選択欄を見出しの文言で探せていることで確かめる（ケースは置かない）
 * - disabled はどの項目も -（常に操作できる）。操作できることは、「設定の値を変える」のケースで確かめている
 * - 1 行の入力欄がない画面なので、Enter キーのケースは置かない
 * - 見出しは heading のロールを持つ
 * - 特定の属性（role、aria-*、data-*）やライブラリ固有の DOM の形は前提にしない
 * - 共通ヘッダーの中身は、ここでは確かめない（ヘッダーの設計書から別に確かめる）。
 *   設定に値がないとき・形式に合わないときの読み方も、共通ヘッダーの手順なので、ここでは「値がないときは初期値」の 1 件だけを確かめる
 * - タイマーは、共通ヘッダーが動かす。時刻は Playwright の時計で固定し、進める
 */
import { expect, type Page, test } from '@playwright/test'

// ---- ブラウザストレージ（docs/screens/storage.md）-----------------------------

const STG = {
  /** STG-001 設定 */
  settings: 'pomodoro:settings',
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

type TimerState = {
  phase: 'work' | 'shortBreak' | 'longBreak'
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

/** 初期値と、どの項目も違う設定 */
const SAVED: Settings = {
  workMinutes: 50,
  shortBreakMinutes: 10,
  longBreakMinutes: 30,
  cycles: 6,
  autoStartBreak: true,
  autoStartWork: true,
}

// ---- 固定するもの ------------------------------------------------------------

const SETTINGS_PATH = '/settings'
/** 「今日」と現在の時刻（日本時間の 2026-10-11 10:00） */
const NOW = new Date('2026-10-11T01:00:00.000Z')

// ---- 部品（番号はワイヤーフレームの data-no） -------------------------------

const ui = (page: Page) => ({
  heading: page.getByRole('heading', { name: '設定', exact: true }), // No.1
  workLabel: page.getByText('作業時間', { exact: true }), // No.2
  work: page.getByLabel('作業時間', { exact: true }), // No.3
  shortBreakLabel: page.getByText('小休憩時間', { exact: true }), // No.4
  shortBreak: page.getByLabel('小休憩時間', { exact: true }), // No.5
  longBreakLabel: page.getByText('長休憩時間', { exact: true }), // No.6
  longBreak: page.getByLabel('長休憩時間', { exact: true }), // No.7
  cyclesLabel: page.getByText('サイクル', { exact: true }), // No.8
  cycles: page.getByLabel('サイクル', { exact: true }), // No.9
  autoStartBreak: page.getByRole('checkbox', { name: '休憩を自動スタートする', exact: true }), // No.10
  autoStartWork: page.getByRole('checkbox', { name: '作業を自動スタートする', exact: true }), // No.11
})

type Ui = ReturnType<typeof ui>

// ---- 選択欄の 4 項目 ---------------------------------------------------------

type SelectItem = {
  /** 項目名 */
  name: string
  /** 設定のフィールド */
  field: 'workMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'cycles'
  locator: (u: Ui) => Ui['work']
  label: (u: Ui) => Ui['workLabel']
  /** 選択肢の値（設計書の備考） */
  values: number[]
  /** 選択肢の文言 */
  text: (value: number) => string
  /** 選択肢の説明（テスト名に使う） */
  optionsLabel: string
}

const range = (from: number, to: number, step: number) =>
  Array.from({ length: (to - from) / step + 1 }, (_, i) => from + i * step)
const minutes = (value: number) => `${value} 分`
const times = (value: number) => `${value} 回`

const selects: SelectItem[] = [
  {
    name: '作業時間',
    field: 'workMinutes',
    locator: (u) => u.work,
    label: (u) => u.workLabel,
    values: range(5, 120, 5),
    text: minutes,
    optionsLabel: '5 から 120 までの 5 刻み（24 個）で、文言は「{値} 分」',
  },
  {
    name: '小休憩時間',
    field: 'shortBreakMinutes',
    locator: (u) => u.shortBreak,
    label: (u) => u.shortBreakLabel,
    values: range(5, 60, 5),
    text: minutes,
    optionsLabel: '5 から 60 までの 5 刻み（12 個）で、文言は「{値} 分」',
  },
  {
    name: '長休憩時間',
    field: 'longBreakMinutes',
    locator: (u) => u.longBreak,
    label: (u) => u.longBreakLabel,
    values: range(5, 60, 5),
    text: minutes,
    optionsLabel: '5 から 60 までの 5 刻み（12 個）で、文言は「{値} 分」',
  },
  {
    name: 'サイクル',
    field: 'cycles',
    locator: (u) => u.cycles,
    label: (u) => u.cyclesLabel,
    values: range(1, 10, 1),
    text: times,
    optionsLabel: '1 から 10 までの 1 刻み（10 個）で、文言は「{値} 回」',
  },
]

// ---- チェックボックスの 2 項目 -----------------------------------------------

type CheckItem = {
  name: string
  field: 'autoStartBreak' | 'autoStartWork'
  locator: (u: Ui) => Ui['autoStartBreak']
}

const checks: CheckItem[] = [
  { name: '「休憩を自動スタートする」', field: 'autoStartBreak', locator: (u) => u.autoStartBreak },
  { name: '「作業を自動スタートする」', field: 'autoStartWork', locator: (u) => u.autoStartWork },
]

// ---- ストレージの読み書き ----------------------------------------------------

type Seed = { settings?: Record<string, unknown>; timer?: TimerState }

/**
 * 画面を開く前に、ストレージに値を入れておく。指定しなかったものは、値がない状態にする。
 * 入れるのは、このテストで最初にページを開いたときの 1 回だけ（再読み込みや遷移では入れ直さない）
 */
async function seed(page: Page, values: Seed) {
  const entries: [string, string][] = []
  if (values.settings) entries.push([STG.settings, JSON.stringify(values.settings)])
  if (values.timer) entries.push([STG.timer, JSON.stringify(values.timer)])
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

/** 設定（STG-001）が、期待する値になるのを待つ */
async function expectSettings(page: Page, want: Settings) {
  await expect.poll(() => read<Settings>(page, STG.settings)).toEqual(want)
}

// ---- 画面を開く -------------------------------------------------------------

/** ストレージに値を入れて、設定画面を開く */
async function open(page: Page, values: Seed = { settings: SAVED }) {
  await page.clock.install({ time: NOW })
  await seed(page, values)
  await page.goto(SETTINGS_PATH)
  await expect(ui(page).work).toBeVisible()
}

/** 動作中の作業フェーズ（25 分）。残りが remainingSeconds 秒 */
const runningWork = (remainingSeconds: number): TimerState => ({
  phase: 'work',
  cycle: 1,
  status: 'running',
  phaseSeconds: 25 * 60,
  endsAt: new Date(NOW.getTime() + remainingSeconds * 1000).toISOString(),
  remainingSeconds: null,
  taskId: null,
})

/** 選択欄で、選ばれている選択肢の文言 */
const selected = (select: Ui['work']) => select.locator('option:checked')

// ---- テスト -----------------------------------------------------------------

test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 1280, height: 720 } })

test.describe('SCR-005 設定', () => {
  test.describe('冒頭の表・閲覧権限', () => {
    test('[document.title] タイマーが動作中でないとき、「設定」にする', async ({ page }) => {
      await open(page)
      await expect(page).toHaveTitle('設定')
    })

    test('[閲覧権限 利用者] 設定画面を開ける', async ({ page }) => {
      await open(page)
      await expect(page).toHaveURL((url) => url.pathname === SETTINGS_PATH)
      await expect(ui(page).heading).toBeVisible()
    })
  })

  test.describe('画面項目の条件・値', () => {
    test('[見出し 表示内容] 「設定」と表示する', async ({ page }) => {
      await open(page)
      await expect(ui(page).heading).toBeVisible()
    })

    for (const item of selects) {
      test(`[${item.name}の見出し 表示内容] 「${item.name}」と表示する`, async ({ page }) => {
        await open(page)
        await expect(item.label(ui(page))).toBeVisible()
      })

      test(`[${item.name} 選択肢] 選択肢は、${item.optionsLabel}`, async ({ page }) => {
        await open(page)
        await expect(item.locator(ui(page)).locator('option')).toHaveText(item.values.map(item.text))
      })

      test(`[${item.name} value] 設定の ${item.field} の値を選んだ状態で表示する`, async ({ page }) => {
        await open(page, { settings: SAVED })
        await expect(selected(item.locator(ui(page)))).toHaveText(item.text(SAVED[item.field]))
      })
    }

    for (const item of checks) {
      test(`[${item.name} type] type は checkbox`, async ({ page }) => {
        await open(page)
        await expect(item.locator(ui(page))).toHaveAttribute('type', 'checkbox')
      })

      test(`[${item.name} checked] 設定の ${item.field} が true なら、チェックありで表示する`, async ({ page }) => {
        await open(page, { settings: { ...DEFAULTS, [item.field]: true } })
        await expect(item.locator(ui(page))).toBeChecked()
      })

      test(`[${item.name} checked] 設定の ${item.field} が false なら、チェックなしで表示する`, async ({ page }) => {
        await open(page, { settings: { ...SAVED, [item.field]: false } })
        await expect(item.locator(ui(page))).not.toBeChecked()
      })
    }
  })

  test.describe('初期表示時の処理', () => {
    test('[初期表示 / 設定 値がない] 設定に値がないとき、初期値（25 分、5 分、15 分、4 回、チェックなし、チェックなし）を表示する', async ({ page }) => {
      await open(page, {})
      const u = ui(page)
      await expect(selected(u.work)).toHaveText(minutes(DEFAULTS.workMinutes))
      await expect(selected(u.shortBreak)).toHaveText(minutes(DEFAULTS.shortBreakMinutes))
      await expect(selected(u.longBreak)).toHaveText(minutes(DEFAULTS.longBreakMinutes))
      await expect(selected(u.cycles)).toHaveText(times(DEFAULTS.cycles))
      await expect(u.autoStartBreak).not.toBeChecked()
      await expect(u.autoStartWork).not.toBeChecked()
    })
  })

  test.describe('設定の値を変える', () => {
    for (const item of selects) {
      const [min] = item.values
      const max = item.values[item.values.length - 1]

      test(`[設定の値を変える / ${item.name}] 選ぶと、その時点で、設定の ${item.field} だけを変えて保存する（保存のボタンはない）`, async ({ page }) => {
        await open(page, { settings: SAVED })
        // SAVED と違う値を選ぶ
        const value = item.values.find((v) => v !== SAVED[item.field] && v !== min && v !== max) as number
        await item.locator(ui(page)).selectOption({ label: item.text(value) })
        await expectSettings(page, { ...SAVED, [item.field]: value })
      })

      test(`[設定の値を変える / ${item.name} 境目] いちばん小さい選択肢（${item.text(min)}）を選ぶと、${min} を保存する`, async ({ page }) => {
        await open(page, { settings: SAVED })
        await item.locator(ui(page)).selectOption({ label: item.text(min) })
        await expectSettings(page, { ...SAVED, [item.field]: min })
      })

      test(`[設定の値を変える / ${item.name} 境目] いちばん大きい選択肢（${item.text(max)}）を選ぶと、${max} を保存する`, async ({ page }) => {
        await open(page, { settings: SAVED })
        await item.locator(ui(page)).selectOption({ label: item.text(max) })
        await expectSettings(page, { ...SAVED, [item.field]: max })
      })
    }

    for (const item of checks) {
      test(`[設定の値を変える / ${item.name}] チェックを付けると、その時点で、設定の ${item.field} だけを true にして保存する`, async ({ page }) => {
        await open(page, { settings: { ...SAVED, [item.field]: false } })
        await item.locator(ui(page)).check()
        await expectSettings(page, { ...SAVED, [item.field]: true })
      })

      test(`[設定の値を変える / ${item.name}] チェックを外すと、その時点で、設定の ${item.field} だけを false にして保存する`, async ({ page }) => {
        await open(page, { settings: { ...SAVED, [item.field]: true } })
        await item.locator(ui(page)).uncheck()
        await expectSettings(page, { ...SAVED, [item.field]: false })
      })
    }

    test('[設定の値を変える / 設定 値がない] 設定に値がない状態で 1 項目を変えると、ほかの 5 項目は初期値にして、6 項目すべてを持つ値を保存する', async ({ page }) => {
      await open(page, {})
      await ui(page).work.selectOption({ label: minutes(30) })
      await expectSettings(page, { ...DEFAULTS, workMinutes: 30 })
    })

    test('[設定の値を変える] 変えたあとで再読み込みしても、変えた値を表示する', async ({ page }) => {
      await open(page, { settings: SAVED })
      await ui(page).work.selectOption({ label: minutes(30) })
      await ui(page).autoStartBreak.uncheck()
      await expectSettings(page, { ...SAVED, workMinutes: 30, autoStartBreak: false })
      await page.reload()
      await expect(selected(ui(page).work)).toHaveText(minutes(30))
      await expect(ui(page).autoStartBreak).not.toBeChecked()
    })

    test('[設定の値を変える / 設定 形式に合わない] 設定に形式に合わない項目と余分な項目がある状態で 1 項目を変えると、合わない項目は初期値にし、余分な項目は残さずに保存する', async ({ page }) => {
      // workMinutes は 5 刻みでない。extra は storage.md にない項目
      await open(page, { settings: { ...SAVED, workMinutes: 7, extra: 'x' } })
      await ui(page).cycles.selectOption({ label: times(8) })
      await expectSettings(page, { ...SAVED, workMinutes: DEFAULTS.workMinutes, cycles: 8 })
    })

    test('[設定の値を変える] タイマーが動作中に作業時間を変えても、進行中のフェーズの長さと終了予定時刻は変えない', async ({ page }) => {
      // 25 分の作業フェーズが、開始から 5 分たったところ
      await open(page, { settings: DEFAULTS, timer: runningWork(20 * 60) })
      await ui(page).work.selectOption({ label: minutes(50) })
      await expectSettings(page, { ...DEFAULTS, workMinutes: 50 })
      // 1 秒進めて、タイマーが動いたあとも、状態が変わっていないことを確かめる
      await page.clock.runFor(1000)
      expect(await read<TimerState>(page, STG.timer)).toEqual(runningWork(20 * 60))
    })

    test('[設定の値を変える] タイマーが一時停止中に作業時間を変えても、進行中のフェーズの長さと残り秒数は変えない', async ({ page }) => {
      const paused: TimerState = {
        phase: 'work',
        cycle: 1,
        status: 'paused',
        phaseSeconds: 25 * 60,
        endsAt: null,
        remainingSeconds: 20 * 60,
        taskId: null,
      }
      await open(page, { settings: DEFAULTS, timer: paused })
      await ui(page).work.selectOption({ label: minutes(50) })
      await expectSettings(page, { ...DEFAULTS, workMinutes: 50 })
      await page.clock.runFor(1000)
      expect(await read<TimerState>(page, STG.timer)).toEqual(paused)
    })

    test('[設定の値を変える] 変えた設定は、再読み込みしなくても、次に開始するフェーズから使う（小休憩時間を変えると、自動スタートした小休憩が、新しい長さで始まる）', async ({ page }) => {
      // 作業フェーズが、あと 5 秒で終わるところ。休憩は自動スタートする
      await open(page, { settings: { ...DEFAULTS, autoStartBreak: true }, timer: runningWork(5) })
      await ui(page).shortBreak.selectOption({ label: minutes(10) })
      await expectSettings(page, { ...DEFAULTS, autoStartBreak: true, shortBreakMinutes: 10 })
      // 作業フェーズが終わるまで進める
      await page.clock.runFor(6000)
      await expect
        .poll(async () => {
          const timer = await read<TimerState>(page, STG.timer)
          return timer && { phase: timer.phase, status: timer.status, phaseSeconds: timer.phaseSeconds }
        })
        .toEqual({ phase: 'shortBreak', status: 'running', phaseSeconds: 10 * 60 })
    })
  })

  test.describe('共通ルール', () => {
    test('[共通ルール アクセシビリティ] Tab キーでフォーカスが移る順序は、作業時間 → 小休憩時間 → 長休憩時間 → サイクル → 休憩を自動スタートする → 作業を自動スタートする', async ({ page }) => {
      await open(page)
      const u = ui(page)
      await u.work.focus()
      for (const next of [u.shortBreak, u.longBreak, u.cycles, u.autoStartBreak, u.autoStartWork]) {
        await page.keyboard.press('Tab')
        await expect(next).toBeFocused()
      }
    })

    test('[共通ルール ブラウザの戻るで画面に戻ったときに、入力内容を復元するか] 値を変えて別の画面へ移り、ブラウザの戻るで戻ると、変えた値を表示する', async ({ page }) => {
      await open(page, { settings: SAVED })
      await ui(page).work.selectOption({ label: minutes(30) })
      await ui(page).autoStartWork.uncheck()
      await expectSettings(page, { ...SAVED, workMinutes: 30, autoStartWork: false })
      await page.goto('/tasks')
      await page.goBack()
      await expect(selected(ui(page).work)).toHaveText(minutes(30))
      await expect(ui(page).autoStartWork).not.toBeChecked()
    })
  })
})
