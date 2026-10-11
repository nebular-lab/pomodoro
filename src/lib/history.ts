// 履歴（SCR-004）の、期間と集計。日付と期間の区切りは、日本時間で決める。

import {
	addDays,
	addMonths,
	compareYmd,
	daysInMonth,
	formatYmd,
	toJst,
	weekdayFromMonday,
	type Ymd,
} from "./date";
import type { Task, WorkRecord } from "./storage";

export type View = "day" | "week" | "month" | "year";

export const VIEWS: View[] = ["day", "week", "month", "year"];

export type Period = { start: Ymd; end: Ymd };

/** その日を含む期間 */
export function periodOf(view: View, date: Ymd): Period {
	if (view === "day") return { start: date, end: date };
	if (view === "week") {
		const start = addDays(date, -weekdayFromMonday(date));
		return { start, end: addDays(start, 6) };
	}
	if (view === "month") {
		return {
			start: { ...date, day: 1 },
			end: { ...date, day: daysInMonth(date.year, date.month) },
		};
	}
	return {
		start: { year: date.year, month: 1, day: 1 },
		end: { year: date.year, month: 12, day: 31 },
	};
}

/** 期間の表示 */
export function formatPeriod(view: View, period: Period): string {
	const pad = (value: number) => String(value).padStart(2, "0");
	const slash = (ymd: Ymd) => `${ymd.year}/${pad(ymd.month)}/${pad(ymd.day)}`;
	if (view === "day") return slash(period.start);
	if (view === "week") return `${slash(period.start)}〜${slash(period.end)}`;
	if (view === "month") {
		return `${period.start.year}/${pad(period.start.month)}`;
	}
	return String(period.start.year);
}

/** 基準の日付を、いまの単位で 1 つずらす */
export function shiftDate(view: View, date: Ymd, direction: 1 | -1): Ymd {
	if (view === "day") return addDays(date, direction);
	if (view === "week") return addDays(date, 7 * direction);
	if (view === "month") return addMonths(date, direction);
	return addMonths(date, 12 * direction);
}

/** 時間の表示（1 分未満は切り捨て） */
export function formatDuration(seconds: number): string {
	const totalMinutes = Math.floor(seconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes} 分`;
	const hoursText = hours.toLocaleString("en-US");
	return minutes === 0
		? `${hoursText} 時間`
		: `${hoursText} 時間 ${minutes} 分`;
}

export type Segment = { taskId: string | null; seconds: number };

export type Summary = {
	pomodoroCount: number;
	totalSeconds: number;
	/** 棒ごとの、タスク別の秒数（リストと同じ並び順） */
	bars: Segment[][];
	/** タスクごとの合計（タスクの並び順。「タスクなし」は最後） */
	rows: { taskId: string | null; task: Task | null; seconds: number }[];
};

function barCount(view: View, period: Period): number {
	if (view === "day") return 24;
	if (view === "week") return 7;
	if (view === "month") return period.end.day;
	return 12;
}

/** 棒の下の目盛り（目盛りのない棒は、空文字） */
export function barLabels(view: View, period: Period): string[] {
	const count = barCount(view, period);
	return Array.from({ length: count }, (_, index) => {
		if (view === "day")
			return [4, 8, 12, 16, 20].includes(index) ? String(index) : "";
		if (view === "week")
			return ["月", "火", "水", "木", "金", "土", "日"][index];
		if (view === "month") {
			const day = index + 1;
			return [1, 5, 10, 15, 20, 25, 30].includes(day) ? String(day) : "";
		}
		return `${index + 1} 月`;
	});
}

/** 期間に入る作業記録を集計する。作業記録は、完了した時刻が入る棒に、すべてを数える */
export function summarize(
	view: View,
	period: Period,
	tasks: Task[],
	records: WorkRecord[],
): Summary {
	const count = barCount(view, period);
	const perBar: Map<string | null, number>[] = Array.from(
		{ length: count },
		() => new Map(),
	);
	const totals = new Map<string | null, number>();
	let pomodoroCount = 0;
	let totalSeconds = 0;

	for (const record of records) {
		const at = toJst(Date.parse(record.completedAt));
		if (compareYmd(at, period.start) < 0 || compareYmd(at, period.end) > 0) {
			continue;
		}
		// タスクが見つからない作業記録は、「タスクなし」として扱う
		const taskId = tasks.some((task) => task.id === record.taskId)
			? record.taskId
			: null;
		let index: number;
		if (view === "day") index = at.hour;
		else if (view === "week") index = weekdayFromMonday(at);
		else if (view === "month") index = at.day - 1;
		else index = at.month - 1;

		perBar[index].set(
			taskId,
			(perBar[index].get(taskId) ?? 0) + record.seconds,
		);
		totals.set(taskId, (totals.get(taskId) ?? 0) + record.seconds);
		pomodoroCount += 1;
		totalSeconds += record.seconds;
	}

	const order: (string | null)[] = [...tasks.map((task) => task.id), null];
	const rows = order
		.filter((taskId) => totals.has(taskId))
		.map((taskId) => ({
			taskId,
			task: tasks.find((task) => task.id === taskId) ?? null,
			seconds: totals.get(taskId) ?? 0,
		}));
	const bars = perBar.map((bar) =>
		order
			.filter((taskId) => bar.has(taskId))
			.map((taskId) => ({ taskId, seconds: bar.get(taskId) ?? 0 })),
	);

	return { pomodoroCount, totalSeconds, bars, rows };
}

export { formatYmd };
