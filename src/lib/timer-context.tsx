import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { MSG } from "./messages";
import {
	playChime,
	requestNotificationPermission,
	showNotification,
} from "./notify";
import {
	INITIAL_TIMER_STATE,
	readRecords,
	readSettings,
	readTasks,
	readTimerState,
	type Settings,
	type TimerState,
	writeRecords,
	writeSettings,
	writeTimerState,
} from "./storage";
import {
	advance,
	formatRemaining,
	isDue,
	LATE_LIMIT_MS,
	pause,
	remainingSeconds,
	reset,
	resume,
	shouldAutoStart,
	start,
} from "./timer";

type TimerContextValue = {
	settings: Settings;
	timer: TimerState;
	/** 現在の時刻。動作中は 1 秒ごとに変わる */
	now: number;
	/** 作業記録を足すたびに増える */
	recordsVersion: number;
	startTimer: () => void;
	pauseTimer: () => void;
	resumeTimer: () => void;
	skipPhase: () => void;
	resetTimer: () => void;
	selectTask: (taskId: string | null) => void;
	updateSettings: (changes: Partial<Settings>) => void;
	setPageTitle: (title: string) => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

/** タイマーの状態を読む。値がない、形式に合わないときは、最初の状態を作って保存する */
function loadTimerState(): TimerState {
	const saved = readTimerState();
	if (saved) return saved;
	writeTimerState(INITIAL_TIMER_STATE);
	return { ...INITIAL_TIMER_STATE };
}

/** タイマーを動かす処理（共通ヘッダーが受け持つ処理）。どの画面を開いていても動く */
export function TimerProvider({ children }: { children: ReactNode }) {
	const [settings, setSettings] = useState(readSettings);
	const [timer, setTimer] = useState(loadTimerState);
	const [now, setNow] = useState(() => Date.now());
	const [recordsVersion, setRecordsVersion] = useState(0);
	const [pageTitle, setPageTitle] = useState(document.title);

	// 1 秒ごとの処理から、いつも最新の値を読めるようにする
	const settingsRef = useRef(settings);
	const timerRef = useRef(timer);

	const commit = useCallback((next: TimerState) => {
		timerRef.current = next;
		writeTimerState(next);
		setTimer(next);
		setNow(Date.now());
	}, []);

	/** フェーズが完了する。終了予定時刻に完了したものとして扱う */
	const completePhase = useCallback(() => {
		const state = timerRef.current;
		const currentSettings = settingsRef.current;
		if (state.endsAt === null) return;
		const current = Date.now();
		const endsAt = Date.parse(state.endsAt);
		const onTime = current - endsAt <= LATE_LIMIT_MS;

		if (state.phase === "work") {
			writeRecords([
				...readRecords(),
				{
					completedAt: new Date(endsAt).toISOString(),
					taskId: state.taskId,
					seconds: state.phaseSeconds ?? 0,
				},
			]);
			setRecordsVersion((version) => version + 1);
		}

		let next = advance(state, currentSettings, readTasks());
		if (onTime) {
			playChime();
			showNotification(state.phase === "work" ? MSG.workDone : MSG.breakDone);
			if (shouldAutoStart(currentSettings, next.phase)) {
				next = start(next, currentSettings, current);
			}
		}
		commit(next);
	}, [commit]);

	/** タイマーが動作中に 1 秒たつ */
	const tick = useCallback(() => {
		const current = Date.now();
		if (isDue(timerRef.current, current)) {
			completePhase();
			return;
		}
		setNow(current);
	}, [completePhase]);

	// 画面を開いたときに、終了予定時刻を過ぎていれば、フェーズを完了にする
	// biome-ignore lint/correctness/useExhaustiveDependencies: 開いたときに 1 回だけ行う
	useEffect(() => {
		if (timerRef.current.status === "running") tick();
	}, []);

	// 動作中は 1 秒ごとに、またタブが表に戻ったときにも行う
	useEffect(() => {
		if (timer.status !== "running") return;
		const interval = window.setInterval(tick, 1000);
		const onVisible = () => {
			if (document.visibilityState === "visible") tick();
		};
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("focus", tick);
		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("focus", tick);
		};
	}, [timer.status, tick]);

	// 動作中は、タブのタイトルの頭に残り時間を付ける
	useEffect(() => {
		document.title =
			timer.status === "running"
				? `${formatRemaining(remainingSeconds(timer, settings, now))} ${pageTitle}`
				: pageTitle;
	}, [timer, settings, now, pageTitle]);

	const startTimer = useCallback(() => {
		requestNotificationPermission();
		commit(start(timerRef.current, settingsRef.current, Date.now()));
	}, [commit]);

	const pauseTimer = useCallback(() => {
		const next = pause(timerRef.current, Date.now());
		if (next) commit(next);
	}, [commit]);

	const resumeTimer = useCallback(() => {
		commit(resume(timerRef.current, Date.now()));
	}, [commit]);

	const skipPhase = useCallback(() => {
		const currentSettings = settingsRef.current;
		let next = advance(timerRef.current, currentSettings, readTasks());
		if (shouldAutoStart(currentSettings, next.phase)) {
			next = start(next, currentSettings, Date.now());
		}
		commit(next);
	}, [commit]);

	const resetTimer = useCallback(() => {
		commit(reset(timerRef.current));
	}, [commit]);

	const selectTask = useCallback(
		(taskId: string | null) => {
			commit({ ...timerRef.current, taskId });
		},
		[commit],
	);

	const updateSettings = useCallback((changes: Partial<Settings>) => {
		const next = { ...settingsRef.current, ...changes };
		settingsRef.current = next;
		writeSettings(next);
		setSettings(next);
	}, []);

	const value = useMemo(
		() => ({
			settings,
			timer,
			now,
			recordsVersion,
			startTimer,
			pauseTimer,
			resumeTimer,
			skipPhase,
			resetTimer,
			selectTask,
			updateSettings,
			setPageTitle,
		}),
		[
			settings,
			timer,
			now,
			recordsVersion,
			startTimer,
			pauseTimer,
			resumeTimer,
			skipPhase,
			resetTimer,
			selectTask,
			updateSettings,
		],
	);

	return (
		<TimerContext.Provider value={value}>{children}</TimerContext.Provider>
	);
}

export function useTimer(): TimerContextValue {
	const value = useContext(TimerContext);
	if (!value) throw new Error("TimerProvider の中で使ってください");
	return value;
}

/** その画面の document.title を決める（動作中は、残り時間が頭に付く） */
export function usePageTitle(title: string) {
	const { setPageTitle } = useTimer();
	useEffect(() => {
		setPageTitle(title);
	}, [title, setPageTitle]);
}
