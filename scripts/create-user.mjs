// ログインに使うアカウントを 1 つ作る。サインアップは無効にしているので、
// パスワードを Better Auth と同じ方法でハッシュ化し、D1 に直接入れる。
//
//   pnpm user:create            ローカルの D1 に作る
//   pnpm user:create --remote   本番の D1 に作る
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { hashPassword } from "better-auth/crypto";

const target = process.argv.includes("--remote") ? "--remote" : "--local";

// 入力をパイプで渡しても読めるように、行を 1 つずつ取り出す
const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
const ask = async (prompt) => {
	process.stderr.write(prompt);
	return (await lines.next()).value ?? "";
};
const id = (await ask("ID（半角英数字・_・. の 3〜30 文字）: ")).trim();
const password = await ask("パスワード（8 文字以上）: ");
rl.close();

if (!/^[a-zA-Z0-9_.]{3,30}$/.test(id)) {
	console.error("ID は半角英数字・_・. の 3〜30 文字で入力してください");
	process.exit(1);
}
if (password.length < 8 || password.length > 128) {
	console.error("パスワードは 8〜128 文字で入力してください");
	process.exit(1);
}

const userId = randomUUID();
const now = Date.now();
const hash = await hashPassword(password);
// メールアドレスは使わないが必須の項目なので、ダミーの値を入れる
const sql = `
INSERT INTO user (id, name, email, email_verified, username, display_username)
VALUES ('${userId}', '${id}', '${id.toLowerCase()}@pomodoro.invalid', 1, '${id.toLowerCase()}', '${id}');
INSERT INTO account (id, account_id, provider_id, user_id, password, updated_at)
VALUES ('${randomUUID()}', '${userId}', 'credential', '${userId}', '${hash}', ${now});
`;

mkdirSync(".wrangler", { recursive: true });
const file = ".wrangler/create-user.sql";
writeFileSync(file, sql);
const result = spawnSync(
	"pnpm",
	["exec", "wrangler", "d1", "execute", "pomodoro", target, "--file", file],
	{ stdio: "inherit" },
);
rmSync(file);
process.exit(result.status ?? 1);
