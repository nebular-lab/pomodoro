import type { BetterAuthOptions } from "better-auth";
import { username } from "better-auth/plugins";

// DB に依存しない設定。CLI でのスキーマ生成（auth.cli.ts）と共有する
export const authOptions = {
	emailAndPassword: {
		enabled: true,
		// アカウントはあらかじめ用意した 1 つだけ（scripts/create-user.mjs で作る）
		disableSignUp: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
	},
	rateLimit: {
		// Workers はリクエストごとにメモリが共有されないので、DB に持つ
		storage: "database",
	},
	plugins: [username()],
} satisfies BetterAuthOptions;
