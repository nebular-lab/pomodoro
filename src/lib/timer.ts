// タイマーの状態を進める処理（docs/screens/HDR-001_app-header、SCR-002_timer）。
// 時刻と設定を引数で受け取り、ストレージや画面には触れない。

import type { Phase, Settings, Task, TimerState } from "./storage";

/** フェーズが完了したことに、これより遅れて気づいたときは、音・通知・自動スタートを行わない */
export const LATE_LIMIT_MS = 60 * 1000;

/** 設定での、そのフェーズの長さ（秒） */
export function phaseLength(settings: Settings, phase: Phase): number {
	if (phase === "work") return settings.workMinutes * 60;
	if (phase === "shortBreak") return settings.shortBreakMinutes * 60;
	return settings.longBreakMinutes * 60;
}

/** 残り秒数（動作中は、終了予定時刻から。1 秒未満は切り上げ） */
export function remainingSeconds(
	state: TimerState,
	settings: Settings,
	now: number,
): number {
	if (state.status === "running" && state.endsAt !== null) {
		return Math.max(0, Math.ceil((Date.parse(state.endsAt) - now) / 1000));
	}
	if (state.status === "paused" && state.remainingSeconds !== null) {
		return state.remainingSeconds;
	}
	return phaseLength(settings, state.phase);
}

/** 残り時間の表示（MM:SS。100 分以上のときは、分を 3 桁） */
export function formatRemaining(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** 動作中で、終了予定時刻に達しているか */
export function isDue(state: TimerState, now: number): boolean {
	return (
		state.status === "running" &&
		state.endsAt !== null &&
		now >= Date.parse(state.endsAt)
	);
}

/** フェーズを開始する（フェーズの長さは、このときに設定から決める） */
export function start(
	state: TimerState,
	settings: Settings,
	now: number,
): TimerState {
	const seconds = phaseLength(settings, state.phase);
	return {
		...state,
		status: "running",
		phaseSeconds: seconds,
		endsAt: new Date(now + seconds * 1000).toISOString(),
		remainingSeconds: null,
	};
}

/** 一時停止する。残りが 0 秒以下のときは、何もしない（null） */
export function pause(state: TimerState, now: number): TimerState | null {
	if (state.status !== "running" || state.endsAt === null) return null;
	const left = Date.parse(state.endsAt) - now;
	if (left <= 0) return null;
	return {
		...state,
		status: "paused",
		endsAt: null,
		remainingSeconds: Math.ceil(left / 1000),
	};
}

/** 再開する */
export function resume(state: TimerState, now: number): TimerState {
	const left = state.remainingSeconds ?? 0;
	return {
		...state,
		status: "running",
		endsAt: new Date(now + left * 1000).toISOString(),
		remainingSeconds: null,
	};
}

/** リセットする（フェーズとサイクルの回は変えない） */
export function reset(state: TimerState): TimerState {
	return {
		...state,
		status: "idle",
		phaseSeconds: null,
		endsAt: null,
		remainingSeconds: null,
	};
}

/**
 * 次のフェーズへ進めて、開始前にする。
 * 次のフェーズが作業のときは、選択中のタスクが見つからないか、アーカイブ済みなら「タスクなし」にする
 */
export function advance(
	state: TimerState,
	settings: Settings,
	tasks: Task[],
): TimerState {
	let phase: Phase;
	let cycle = state.cycle;
	if (state.phase === "work") {
		phase = state.cycle < settings.cycles ? "shortBreak" : "longBreak";
	} else if (state.phase === "shortBreak") {
		phase = "work";
		cycle = state.cycle + 1;
	} else {
		phase = "work";
		cycle = 1;
	}

	let taskId = state.taskId;
	if (phase === "work" && taskId !== null) {
		const task = tasks.find((item) => item.id === taskId);
		if (!task || task.archived) taskId = null;
	}

	return {
		phase,
		cycle,
		status: "idle",
		phaseSeconds: null,
		endsAt: null,
		remainingSeconds: null,
		taskId,
	};
}

/** 次のフェーズを自動スタートする設定か */
export function shouldAutoStart(settings: Settings, phase: Phase): boolean {
	return phase === "work" ? settings.autoStartWork : settings.autoStartBreak;
}
