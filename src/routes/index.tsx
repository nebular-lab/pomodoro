import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useId, useMemo } from "react";
import { ColorSwatch, NO_TASK_COLOR } from "@/components/color-swatch";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { readTasks } from "@/lib/storage";
import { formatRemaining, remainingSeconds } from "@/lib/timer";
import { usePageTitle, useTimer } from "@/lib/timer-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: TimerPage });

/** 「タスクなし」を表す、選択欄の値 */
const NO_TASK = "none";

/** タイマー（SCR-002）。タイマーの表示と操作 */
function TimerPage() {
	usePageTitle("タイマー");
	const {
		settings,
		timer,
		now,
		startTimer,
		pauseTimer,
		resumeTimer,
		skipPhase,
		resetTimer,
		selectTask,
	} = useTimer();
	const labelId = useId();

	// タイマーの状態が変わるたびに、タスクを読み直す
	// biome-ignore lint/correctness/useExhaustiveDependencies: timer が変わったときに読み直す
	const tasks = useMemo(() => readTasks(), [timer]);

	const isWork = timer.phase === "work";
	// 作業フェーズを開始してから終わるまでは、タスクを変えられない
	const locked = isWork && timer.status !== "idle";
	const selected = tasks.find((task) => task.id === timer.taskId);

	// 変えられる状態で、選択中のタスクが見つからないか、アーカイブ済みなら「タスクなし」に戻す
	useEffect(() => {
		if (locked || timer.taskId === null) return;
		if (!selected || selected.archived) selectTask(null);
	}, [locked, timer.taskId, selected, selectTask]);

	const options = tasks.filter(
		(task) => !task.archived || (locked && task.id === timer.taskId),
	);
	const value = selected ? selected.id : NO_TASK;
	const items = [
		{ value: NO_TASK, label: "タスクなし" },
		...options.map((task) => ({ value: task.id, label: task.name })),
	];

	const doneCycles = Math.min(
		isWork ? timer.cycle - 1 : timer.cycle,
		settings.cycles,
	);
	const currentDot = isWork && timer.status !== "idle" ? timer.cycle - 1 : -1;

	return (
		<main
			className={cn(
				"flex min-h-[calc(100vh-57px)] flex-col items-center gap-10 p-6 transition-colors",
				!isWork && "bg-emerald-50",
			)}
		>
			<div className="flex flex-col items-center gap-6 pt-10">
				<span className="text-8xl tabular-nums">
					{formatRemaining(remainingSeconds(timer, settings, now))}
				</span>

				<div
					role="img"
					aria-label={`サイクル ${doneCycles} / ${settings.cycles}`}
					className="flex items-center gap-2"
				>
					{Array.from({ length: settings.cycles }, (_, index) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: 並びが変わらない
							key={index}
							className={cn(
								"h-3 rounded-full border border-foreground/40",
								index === currentDot ? "w-10 bg-muted" : "w-3",
								index < doneCycles && "border-foreground bg-foreground",
							)}
						/>
					))}
				</div>

				<div className="flex items-center gap-4">
					{timer.status !== "idle" && (
						<Button
							variant="ghost"
							size="icon"
							aria-label="リセット"
							onClick={resetTimer}
						>
							<RotateCcw />
						</Button>
					)}
					{timer.status === "idle" && (
						<Button
							size="icon-lg"
							className="size-16 rounded-full"
							aria-label="開始"
							onClick={startTimer}
						>
							<Play />
						</Button>
					)}
					{timer.status === "running" && (
						<Button
							size="icon-lg"
							className="size-16 rounded-full"
							aria-label="一時停止"
							onClick={pauseTimer}
						>
							<Pause />
						</Button>
					)}
					{timer.status === "paused" && (
						<Button
							size="icon-lg"
							className="size-16 rounded-full"
							aria-label="再開"
							onClick={resumeTimer}
						>
							<Play />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						aria-label="スキップ"
						onClick={skipPhase}
					>
						<SkipForward />
					</Button>
				</div>
			</div>

			<div className="flex w-full max-w-md flex-col gap-2">
				<span id={labelId} className="text-sm">
					作業するタスク
				</span>
				<div className="flex items-center gap-3">
					<ColorSwatch color={selected ? selected.color : NO_TASK_COLOR} />
					<Select
						items={items}
						value={value}
						disabled={locked}
						onValueChange={(next) =>
							selectTask(next === NO_TASK || next === null ? null : next)
						}
					>
						<SelectTrigger aria-labelledby={labelId} className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_TASK}>
								<ColorSwatch color={NO_TASK_COLOR} />
								タスクなし
							</SelectItem>
							{options.map((task) => (
								<SelectItem key={task.id} value={task.id}>
									<ColorSwatch color={task.color} />
									{task.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</main>
	);
}
