// ブラウザのストレージ（docs/screens/storage.md）の読み書き。
// 形式に合わない値や要素は使わず、次に保存するときに残さない。

export const STORAGE_KEYS = {
	/** STG-001 設定 */
	settings: "pomodoro:settings",
	/** STG-002 タスク */
	tasks: "pomodoro:tasks",
	/** STG-003 作業記録 */
	records: "pomodoro:records",
	/** STG-004 タイマーの状態 */
	timer: "pomodoro:timer",
} as const;

export type Settings = {
	workMinutes: number;
	shortBreakMinutes: number;
	longBreakMinutes: number;
	cycles: number;
	autoStartBreak: boolean;
	autoStartWork: boolean;
};

export type Task = {
	id: string;
	name: string;
	color: string;
	archived: boolean;
	createdAt: string;
};

export type WorkRecord = {
	completedAt: string;
	taskId: string | null;
	seconds: number;
};

export type Phase = "work" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
	phase: Phase;
	cycle: number;
	status: TimerStatus;
	phaseSeconds: number | null;
	endsAt: string | null;
	remainingSeconds: number | null;
	taskId: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
	workMinutes: 25,
	shortBreakMinutes: 5,
	longBreakMinutes: 15,
	cycles: 4,
	autoStartBreak: false,
	autoStartWork: false,
};

export const INITIAL_TIMER_STATE: TimerState = {
	phase: "work",
	cycle: 1,
	status: "idle",
	phaseSeconds: null,
	endsAt: null,
	remainingSeconds: null,
	taskId: null,
};

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isDateString = (value: unknown): value is string =>
	typeof value === "string" && !Number.isNaN(Date.parse(value));

const isColor = (value: unknown): value is string =>
	typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

/** 値を JSON として読む。値がないとき、JSON として読めないときは undefined */
function readJson(key: string): unknown {
	const raw = localStorage.getItem(key);
	if (raw === null) return undefined;
	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}

function writeJson(key: string, value: unknown) {
	localStorage.setItem(key, JSON.stringify(value));
}

// ---- STG-001 設定 ------------------------------------------------------------

const inSteps = (value: unknown, min: number, max: number, step: number) =>
	typeof value === "number" &&
	Number.isInteger(value) &&
	value >= min &&
	value <= max &&
	(value - min) % step === 0;

/** 設定を読む。値がないときは初期値。形式に合わない項目は、その項目だけ初期値 */
export function readSettings(): Settings {
	const raw = readJson(STORAGE_KEYS.settings);
	if (!isObject(raw)) return { ...DEFAULT_SETTINGS };
	return {
		workMinutes: inSteps(raw.workMinutes, 5, 120, 5)
			? (raw.workMinutes as number)
			: DEFAULT_SETTINGS.workMinutes,
		shortBreakMinutes: inSteps(raw.shortBreakMinutes, 5, 60, 5)
			? (raw.shortBreakMinutes as number)
			: DEFAULT_SETTINGS.shortBreakMinutes,
		longBreakMinutes: inSteps(raw.longBreakMinutes, 5, 60, 5)
			? (raw.longBreakMinutes as number)
			: DEFAULT_SETTINGS.longBreakMinutes,
		cycles: inSteps(raw.cycles, 1, 10, 1)
			? (raw.cycles as number)
			: DEFAULT_SETTINGS.cycles,
		autoStartBreak:
			typeof raw.autoStartBreak === "boolean"
				? raw.autoStartBreak
				: DEFAULT_SETTINGS.autoStartBreak,
		autoStartWork:
			typeof raw.autoStartWork === "boolean"
				? raw.autoStartWork
				: DEFAULT_SETTINGS.autoStartWork,
	};
}

export function writeSettings(settings: Settings) {
	writeJson(STORAGE_KEYS.settings, settings);
}

// ---- STG-002 タスク ----------------------------------------------------------

function toTask(raw: unknown): Task | null {
	if (!isObject(raw)) return null;
	if (typeof raw.id !== "string") return null;
	// 名前は、前後の空白を除いて 1 文字以上あること
	if (typeof raw.name !== "string" || raw.name.trim() === "") return null;
	if (!isColor(raw.color)) return null;
	if (typeof raw.archived !== "boolean") return null;
	if (!isDateString(raw.createdAt)) return null;
	return {
		id: raw.id,
		name: raw.name,
		color: raw.color,
		archived: raw.archived,
		createdAt: raw.createdAt,
	};
}

/** タスクを読む。値がないとき、配列でないときは 0 件。形式に合わない要素は、ないものとして扱う */
export function readTasks(): Task[] {
	const raw = readJson(STORAGE_KEYS.tasks);
	if (!Array.isArray(raw)) return [];
	return raw.map(toTask).filter((task): task is Task => task !== null);
}

export function writeTasks(tasks: Task[]) {
	writeJson(STORAGE_KEYS.tasks, tasks);
}

// ---- STG-003 作業記録 --------------------------------------------------------

function toRecord(raw: unknown): WorkRecord | null {
	if (!isObject(raw)) return null;
	if (!isDateString(raw.completedAt)) return null;
	if (raw.taskId !== null && typeof raw.taskId !== "string") return null;
	if (typeof raw.seconds !== "number" || !(raw.seconds > 0)) return null;
	return {
		completedAt: raw.completedAt,
		taskId: raw.taskId,
		seconds: raw.seconds,
	};
}

/** 作業記録を読む。値がないとき、配列でないときは 0 件。形式に合わない要素は、ないものとして扱う */
export function readRecords(): WorkRecord[] {
	const raw = readJson(STORAGE_KEYS.records);
	if (!Array.isArray(raw)) return [];
	return raw
		.map(toRecord)
		.filter((record): record is WorkRecord => record !== null);
}

export function writeRecords(records: WorkRecord[]) {
	writeJson(STORAGE_KEYS.records, records);
}

// ---- STG-004 タイマーの状態 --------------------------------------------------

const PHASES: Phase[] = ["work", "shortBreak", "longBreak"];
const STATUSES: TimerStatus[] = ["idle", "running", "paused"];

/**
 * タイマーの状態を読む。値がないとき、形式に合わないときは null。
 * その動作で使わない値が余分に入っていても、形式に合うものとして使う（余分な値は読まない）
 */
export function readTimerState(): TimerState | null {
	const raw = readJson(STORAGE_KEYS.timer);
	if (!isObject(raw)) return null;
	if (!PHASES.includes(raw.phase as Phase)) return null;
	if (!STATUSES.includes(raw.status as TimerStatus)) return null;
	if (typeof raw.cycle !== "number") return null;
	if (raw.taskId !== null && typeof raw.taskId !== "string") return null;

	const base = {
		phase: raw.phase as Phase,
		cycle: raw.cycle,
		taskId: raw.taskId as string | null,
	};
	const status = raw.status as TimerStatus;
	if (status === "idle") {
		return {
			...base,
			status,
			phaseSeconds: null,
			endsAt: null,
			remainingSeconds: null,
		};
	}
	if (typeof raw.phaseSeconds !== "number") return null;
	if (status === "running") {
		if (!isDateString(raw.endsAt)) return null;
		return {
			...base,
			status,
			phaseSeconds: raw.phaseSeconds,
			endsAt: raw.endsAt,
			remainingSeconds: null,
		};
	}
	if (typeof raw.remainingSeconds !== "number") return null;
	return {
		...base,
		status,
		phaseSeconds: raw.phaseSeconds,
		endsAt: null,
		remainingSeconds: raw.remainingSeconds,
	};
}

export function writeTimerState(state: TimerState) {
	writeJson(STORAGE_KEYS.timer, state);
}
