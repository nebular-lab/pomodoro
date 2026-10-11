import type { Task } from "./storage";

/** 既定の 12 色（並び順）と、読み上げ名 */
export const PRESET_COLORS = [
	{ color: "#EF4444", name: "赤" },
	{ color: "#F97316", name: "オレンジ" },
	{ color: "#EAB308", name: "黄" },
	{ color: "#84CC16", name: "黄緑" },
	{ color: "#22C55E", name: "緑" },
	{ color: "#14B8A6", name: "青緑" },
	{ color: "#06B6D4", name: "水色" },
	{ color: "#3B82F6", name: "青" },
	{ color: "#6366F1", name: "藍" },
	{ color: "#A855F7", name: "紫" },
	{ color: "#EC4899", name: "ピンク" },
	{ color: "#92400E", name: "茶" },
] as const;

/**
 * 追加するタスクの色。アーカイブしていないタスクで使われている数が、いちばん少ない既定の色。
 * 同じ数の色が複数あるときは、並び順で先のもの
 */
export function nextTaskColor(tasks: Task[]): string {
	const active = tasks.filter((task) => !task.archived);
	let best: string = PRESET_COLORS[0].color;
	let bestCount = Number.POSITIVE_INFINITY;
	for (const preset of PRESET_COLORS) {
		const count = active.filter(
			(task) => task.color.toUpperCase() === preset.color,
		).length;
		if (count < bestCount) {
			best = preset.color;
			bestCount = count;
		}
	}
	return best;
}
