import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ColorSwatch, NO_TASK_COLOR } from "@/components/color-swatch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compareYmd, formatYmd, parseYmd, toJst, type Ymd } from "@/lib/date";
import {
	barLabels,
	formatDuration,
	formatPeriod,
	periodOf,
	shiftDate,
	summarize,
	VIEWS,
	type View,
} from "@/lib/history";
import { readRecords, readTasks } from "@/lib/storage";
import { usePageTitle, useTimer } from "@/lib/timer-context";

export const Route = createFileRoute("/history")({
	validateSearch: (search: Record<string, unknown>) => search,
	component: HistoryPage,
});

const VIEW_LABELS: Record<View, string> = {
	day: "日",
	week: "週",
	month: "月",
	year: "年",
};

/** 今日（日本時間） */
const today = (): Ymd => {
	const { year, month, day } = toJst(Date.now());
	return { year, month, day };
};

/** 履歴（SCR-004） */
function HistoryPage() {
	usePageTitle("履歴");
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/history" });
	const { recordsVersion } = useTimer();

	const viewValid = VIEWS.includes(search.view as View);
	const view: View = viewValid ? (search.view as View) : "day";
	const dateParam = typeof search.date === "string" ? search.date : undefined;

	// 「今日」は、表示を作るときの日付で決める（開いたまま日付が変わっても、作り直さない）
	// biome-ignore lint/correctness/useExhaustiveDependencies: 表示を作り直すときにだけ、今日を決め直す
	const display = useMemo(() => {
		const now = today();
		const parsed = parseYmd(dateParam);
		const dateValid = parsed !== null && compareYmd(parsed, now) <= 0;
		const date = dateValid && parsed ? parsed : now;
		const period = periodOf(view, date);
		return {
			date,
			dateValid,
			period,
			// 今日を含む期間より先へは、進めない
			canGoNext: compareYmd(period.end, now) < 0,
			summary: summarize(view, period, readTasks(), readRecords()),
		};
	}, [view, dateParam, recordsVersion]);

	// 受け取れない値のパラメータは、URL から取り除く
	useEffect(() => {
		const next: Record<string, unknown> = { ...search };
		let changed = false;
		if ("view" in search && !viewValid) {
			delete next.view;
			changed = true;
		}
		if ("date" in search && !display.dateValid) {
			delete next.date;
			changed = true;
		}
		if (changed) void navigate({ search: next, replace: true });
	}, [search, viewValid, display.dateValid, navigate]);

	const selectView = (value: string) => {
		if (value === view) return;
		const { view: _, ...rest } = search;
		void navigate({
			search: value === "day" ? rest : { ...rest, view: value },
		});
	};

	const move = (direction: 1 | -1) => {
		// 日付を省略しているときは、押した時点の今日を基準にする
		const now = today();
		const parsed = parseYmd(dateParam);
		const base = parsed && compareYmd(parsed, now) <= 0 ? parsed : now;
		let next = shiftDate(view, base, direction);
		if (compareYmd(next, now) > 0) next = now;
		void navigate({ search: { ...search, date: formatYmd(next) } });
	};

	const { period, summary, canGoNext } = display;
	const labels = barLabels(view, period);
	const maxBar = Math.max(
		1,
		...summary.bars.map((bar) =>
			bar.reduce((sum, segment) => sum + segment.seconds, 0),
		),
	);
	const colorOf = (taskId: string | null) =>
		summary.rows.find((row) => row.taskId === taskId)?.task?.color ??
		NO_TASK_COLOR;

	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
			<h1 className="text-2xl font-bold">履歴</h1>

			<Tabs value={view} onValueChange={selectView}>
				<TabsList>
					{VIEWS.map((item) => (
						<TabsTrigger key={item} value={item}>
							{VIEW_LABELS[item]}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<div className="flex items-center justify-between">
				<Button
					variant="ghost"
					size="icon"
					aria-label="前の期間"
					onClick={() => move(-1)}
				>
					<ChevronLeft />
				</Button>
				<div className="flex items-baseline gap-3">
					<strong>{formatPeriod(view, period)}</strong>
					<span>
						{summary.pomodoroCount.toLocaleString("en-US")} ポモドーロ
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					aria-label="次の期間"
					disabled={!canGoNext}
					onClick={() => move(1)}
				>
					<ChevronRight />
				</Button>
			</div>

			<div
				role="img"
				aria-label="作業時間のグラフ"
				className="flex flex-col gap-2"
			>
				<div className="flex h-56 items-stretch gap-1">
					{summary.bars.map((bar, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: 並びが変わらない
							key={index}
							className="flex flex-1 flex-col-reverse overflow-hidden rounded-md bg-muted"
						>
							{bar.map((segment) => (
								<div
									key={segment.taskId ?? "none"}
									style={{
										height: `${(segment.seconds / maxBar) * 100}%`,
										backgroundColor: colorOf(segment.taskId),
									}}
								/>
							))}
						</div>
					))}
				</div>
				<div className="flex gap-1 text-xs text-muted-foreground">
					{labels.map((label, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: 並びが変わらない
						<span key={index} className="flex-1 text-center">
							{label}
						</span>
					))}
				</div>
			</div>

			{summary.rows.length === 0 ? (
				<p className="text-muted-foreground">この期間の作業記録はありません</p>
			) : (
				<>
					<div className="flex items-baseline gap-3">
						<span>合計作業時間</span>
						<strong>{formatDuration(summary.totalSeconds)}</strong>
					</div>
					<ul className="flex flex-col divide-y rounded-lg border">
						{summary.rows.map((row) => (
							<li
								key={row.taskId ?? "none"}
								className="flex items-center justify-between p-3"
							>
								<span className="flex items-center gap-3">
									<ColorSwatch color={row.task?.color ?? NO_TASK_COLOR} />
									<span>{row.task ? row.task.name : "タスクなし"}</span>
								</span>
								<strong>{formatDuration(row.seconds)}</strong>
							</li>
						))}
					</ul>
				</>
			)}
		</main>
	);
}
