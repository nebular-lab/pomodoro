// Better Auth が提供する API（/api/auth/*）の OpenAPI 定義を書き出す。
// プラグインや設定を変えたら、pnpm api:export で作り直す。
import { mkdirSync, writeFileSync } from "node:fs";
import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { authOptions } from "../src/lib/auth-options.ts";

const auth = betterAuth({
	...authOptions,
	baseURL: "http://localhost:3000",
	plugins: [...authOptions.plugins, openAPI()],
});
const schema = await auth.api.generateOpenAPISchema();

mkdirSync("docs/api", { recursive: true });
writeFileSync(
	"docs/api/auth-openapi.json",
	`${JSON.stringify(schema, null, 2)}\n`,
);
