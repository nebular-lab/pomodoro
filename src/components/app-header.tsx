import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LINKS = [
	{ to: "/", label: "タイマー" },
	{ to: "/tasks", label: "タスク管理" },
	{ to: "/history", label: "履歴" },
	{ to: "/settings", label: "設定" },
] as const;

/** 共通ヘッダー（HDR-001） */
export function AppHeader() {
	const { pathname } = useLocation();
	return (
		<header className="flex items-center justify-between border-b px-6 py-3">
			<strong>ポモドーロタイマー</strong>
			<nav className="flex items-center gap-1">
				{LINKS.map((link) => {
					const current = pathname === link.to;
					return (
						<Link
							key={link.to}
							to={link.to}
							aria-current={current ? "page" : undefined}
							// いまの画面のリンクを押したときは、何もしない
							onClick={(event) => {
								if (current) event.preventDefault();
							}}
							className={cn(
								"rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground",
								current && "bg-muted font-semibold text-foreground",
							)}
						>
							{link.label}
						</Link>
					);
				})}
			</nav>
		</header>
	);
}
