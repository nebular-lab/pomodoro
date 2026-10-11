import { createFileRoute } from "@tanstack/react-router";
import { useId } from "react";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import type { Settings } from "@/lib/storage";
import { usePageTitle, useTimer } from "@/lib/timer-context";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const range = (from: number, to: number, step: number) =>
	Array.from({ length: (to - from) / step + 1 }, (_, i) => from + i * step);

type SelectField =
	| "workMinutes"
	| "shortBreakMinutes"
	| "longBreakMinutes"
	| "cycles";

const SELECTS: {
	field: SelectField;
	label: string;
	values: number[];
	unit: string;
}[] = [
	{
		field: "workMinutes",
		label: "作業時間",
		values: range(5, 120, 5),
		unit: "分",
	},
	{
		field: "shortBreakMinutes",
		label: "小休憩時間",
		values: range(5, 60, 5),
		unit: "分",
	},
	{
		field: "longBreakMinutes",
		label: "長休憩時間",
		values: range(5, 60, 5),
		unit: "分",
	},
	{ field: "cycles", label: "サイクル", values: range(1, 10, 1), unit: "回" },
];

const CHECKS: { field: "autoStartBreak" | "autoStartWork"; label: string }[] = [
	{ field: "autoStartBreak", label: "休憩を自動スタートする" },
	{ field: "autoStartWork", label: "作業を自動スタートする" },
];

/** 設定（SCR-005）。値を変えた時点で保存する */
function SettingsPage() {
	usePageTitle("設定");
	const { settings, updateSettings } = useTimer();
	const id = useId();

	const change = (changes: Partial<Settings>) => updateSettings(changes);

	return (
		<main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
			<h1 className="text-2xl font-bold">設定</h1>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
				{SELECTS.map((item) => (
					<div key={item.field} className="flex flex-col gap-2">
						<label htmlFor={`${id}-${item.field}`} className="text-sm">
							{item.label}
						</label>
						<NativeSelect
							id={`${id}-${item.field}`}
							className="w-full"
							value={settings[item.field]}
							onChange={(event) =>
								change({ [item.field]: Number(event.target.value) })
							}
						>
							{item.values.map((value) => (
								<NativeSelectOption key={value} value={value}>
									{value} {item.unit}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</div>
				))}
			</div>

			{CHECKS.map((item) => (
				<label key={item.field} className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						className="size-4"
						checked={settings[item.field]}
						onChange={(event) => change({ [item.field]: event.target.checked })}
					/>
					{item.label}
				</label>
			))}
		</main>
	);
}
