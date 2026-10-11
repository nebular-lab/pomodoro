import {
	createFileRoute,
	useNavigate,
} from "@tanstack/react-router";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MSG } from "@/lib/messages";
import { readTasks, type Task, writeTasks } from "@/lib/storage";
import { nextTaskColor, PRESET_COLORS } from "@/lib/task-colors";
import { usePageTitle } from "@/lib/timer-context";

export const Route = createFileRoute("/tasks")({
	validateSearch: (search: Record<string, unknown>) => search,
	component: TasksPage,
});

const NAME_MAX = 50;

/** タスク名のバリデーション。エラーがなければ null */
function validateName(value: string): string | null {
	const name = value.trim();
	if (name === "") return MSG.required("タスク名");
	if (Array.from(name).length > NAME_MAX) {
		return MSG.tooLong("タスク名", NAME_MAX);
	}
	return null;
}

/** タスク管理（SCR-003） */
function TasksPage() {
	usePageTitle("タスク管理");
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/tasks" });
	const archivedTab = search.archived === "true";

	const [tasks, setTasks] = useState<Task[]>(readTasks);
	const [newName, setNewName] = useState("");
	const [newError, setNewError] = useState<string | null>(null);
	/** 保存されていないタスク名（行ごと） */
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
	/** 色を選ぶ枠を表示している行 */
	const [pickerTaskId, setPickerTaskId] = useState<string | null>(null);
	const newInputRef = useRef<HTMLInputElement>(null);
	const newErrorId = useId();

	// 受け取れない値の archived は、URL から取り除く
	useEffect(() => {
		if ("archived" in search && !archivedTab) {
			void navigate({ search: {}, replace: true });
		}
	}, [search, archivedTab, navigate]);

	// タブが変わったとき（タブの切り替え、ブラウザの戻る・進む）は、
	// 一覧を、保存されているタスクで作り直す
	// biome-ignore lint/correctness/useExhaustiveDependencies: タブが変わったときに行う
	useEffect(() => {
		setTasks(readTasks());
		setDrafts({});
		setRowErrors({});
		setNewError(null);
		setPickerTaskId(null);
	}, [archivedTab]);

	const save = useCallback((next: Task[]) => {
		writeTasks(next);
		setTasks(next);
	}, []);

	const update = (id: string, changes: Partial<Task>) =>
		save(
			tasks.map((task) => (task.id === id ? { ...task, ...changes } : task)),
		);

	const closePicker = useCallback(() => setPickerTaskId(null), []);

	// 色を選ぶ枠の外を押したとき、Esc キーを押したときは、枠を閉じる
	useEffect(() => {
		if (pickerTaskId === null) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Element | null;
			if (target?.closest("[data-color-picker], [data-color-button]")) return;
			closePicker();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closePicker();
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [pickerTaskId, closePicker]);

	const addTask = (event: FormEvent) => {
		event.preventDefault();
		const error = validateName(newName);
		if (error) {
			setNewError(error);
			newInputRef.current?.focus();
			return;
		}
		setNewError(null);
		save([
			...tasks,
			{
				id: crypto.randomUUID(),
				name: newName.trim(),
				color: nextTaskColor(tasks),
				archived: false,
				createdAt: new Date().toISOString(),
			},
		]);
		setNewName("");
		setPickerTaskId(null);
		if (archivedTab) void navigate({ search: {} });
	};

	const selectTab = (value: string) => {
		const toArchived = value === "archived";
		if (toArchived === archivedTab) return;
		void navigate({ search: toArchived ? { archived: "true" } : {} });
	};

	const blurName = (task: Task) => {
		const draft = drafts[task.id];
		if (draft === undefined) return;
		const clearDraft = () => setDrafts(({ [task.id]: _, ...rest }) => rest);
		const clearError = () => setRowErrors(({ [task.id]: _, ...rest }) => rest);
		if (draft.trim() === task.name) {
			clearDraft();
			clearError();
			return;
		}
		const error = validateName(draft);
		if (error) {
			setRowErrors((errors) => ({ ...errors, [task.id]: error }));
			return;
		}
		clearError();
		clearDraft();
		update(task.id, { name: draft.trim() });
	};

	const setArchived = (task: Task, archived: boolean) => {
		if (pickerTaskId === task.id) setPickerTaskId(null);
		update(task.id, { archived });
	};

	const setColor = (taskId: string, color: string) => {
		update(taskId, { color: color.toUpperCase() });
		setPickerTaskId(null);
	};

	const visible = tasks.filter((task) => task.archived === archivedTab);

	return (
		<main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
			<h1 className="text-2xl font-bold">タスク管理</h1>

			<form onSubmit={addTask} className="flex items-start gap-3" noValidate>
				<div className="flex flex-1 flex-col gap-1">
					<Input
						ref={newInputRef}
						type="text"
						aria-label="新しいタスクの名前"
						aria-invalid={newError ? true : undefined}
						aria-describedby={newError ? newErrorId : undefined}
						placeholder="新しいタスクを追加"
						autoComplete="off"
						value={newName}
						onChange={(event) => setNewName(event.target.value)}
					/>
					{newError && (
						<p id={newErrorId} className="text-sm text-destructive">
							{newError}
						</p>
					)}
				</div>
				<Button type="submit">追加</Button>
			</form>

			<Tabs
				value={archivedTab ? "archived" : "active"}
				onValueChange={selectTab}
			>
				<TabsList>
					<TabsTrigger value="active">使用中</TabsTrigger>
					<TabsTrigger value="archived">アーカイブ済み</TabsTrigger>
				</TabsList>
			</Tabs>

			{visible.length === 0 ? (
				<p className="text-muted-foreground">タスクはありません</p>
			) : (
				<ul className="flex flex-col divide-y rounded-lg border">
					{visible.map((task) => (
						<TaskRow
							key={task.id}
							task={task}
							draft={drafts[task.id]}
							error={rowErrors[task.id]}
							pickerOpen={pickerTaskId === task.id}
							onDraft={(value) =>
								setDrafts((current) => ({ ...current, [task.id]: value }))
							}
							onBlurName={() => blurName(task)}
							onTogglePicker={() =>
								setPickerTaskId((current) =>
									current === task.id ? null : task.id,
								)
							}
							onArchive={() => setArchived(task, !task.archived)}
							onColor={(color) => setColor(task.id, color)}
						/>
					))}
				</ul>
			)}
		</main>
	);
}

function TaskRow({
	task,
	draft,
	error,
	pickerOpen,
	onDraft,
	onBlurName,
	onTogglePicker,
	onArchive,
	onColor,
}: {
	task: Task;
	draft: string | undefined;
	error: string | undefined;
	pickerOpen: boolean;
	onDraft: (value: string) => void;
	onBlurName: () => void;
	onTogglePicker: () => void;
	onArchive: () => void;
	onColor: (color: string) => void;
}) {
	const errorId = useId();
	const otherColorId = useId();
	const colorInputRef = useRef<HTMLInputElement>(null);

	// 「その他の色」は、色を選び終えたとき（change）にだけ保存する。
	// React の onChange は、選んでいる途中（input）にも動くので、使わない
	useEffect(() => {
		const input = colorInputRef.current;
		if (!pickerOpen || !input) return;
		const onChange = () => onColor(input.value);
		input.addEventListener("change", onChange);
		return () => input.removeEventListener("change", onChange);
	}, [pickerOpen, onColor]);

	return (
		<li className="flex flex-col gap-3 p-3">
			<div className="flex items-start gap-3">
				<button
					type="button"
					data-color-button
					aria-label={`${task.name} の色を変更`}
					className="mt-1.5 size-5 shrink-0 rounded-full border border-black/10"
					style={{ backgroundColor: task.color }}
					onClick={onTogglePicker}
				/>
				<div className="flex flex-1 flex-col gap-1">
					<input
						type="text"
						aria-label={`${task.name} の名前`}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? errorId : undefined}
						autoComplete="off"
						className="h-8 w-full rounded-md bg-transparent px-2 outline-none hover:bg-muted focus-visible:bg-muted"
						value={draft ?? task.name}
						onChange={(event) => onDraft(event.target.value)}
						onBlur={onBlurName}
					/>
					{error && (
						<p id={errorId} className="px-2 text-sm text-destructive">
							{error}
						</p>
					)}
				</div>
				<Button
					type="button"
					variant="outline"
					aria-label={
						task.archived
							? `${task.name} のアーカイブを解除`
							: `${task.name} をアーカイブ`
					}
					onClick={onArchive}
				>
					{task.archived ? "アーカイブを解除" : "アーカイブ"}
				</Button>
			</div>

			{pickerOpen && (
				<div
					data-color-picker
					className="flex flex-col gap-3 rounded-lg bg-muted p-3"
				>
					<div className="flex flex-wrap gap-2">
						{PRESET_COLORS.map((preset) => (
							<button
								key={preset.color}
								type="button"
								aria-label={preset.name}
								className="size-6 rounded-full border border-black/10"
								style={{ backgroundColor: preset.color }}
								onClick={() => onColor(preset.color)}
							/>
						))}
					</div>
					<div className="flex items-center gap-3 text-sm">
						<label htmlFor={otherColorId}>その他の色</label>
						<input
							ref={colorInputRef}
							id={otherColorId}
							type="color"
							className="h-8 w-12"
							defaultValue={task.color.toLowerCase()}
						/>
					</div>
				</div>
			)}
		</li>
	);
}
