import { cn } from "@/lib/utils";

/** 「タスクなし」の色（固定の灰色） */
export const NO_TASK_COLOR = "#9CA3AF";

/** 色の見本（飾り） */
export function ColorSwatch({
	color,
	className,
}: {
	color: string;
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-block size-4 shrink-0 rounded-full border border-black/10",
				className,
			)}
			style={{ backgroundColor: color }}
		/>
	);
}
