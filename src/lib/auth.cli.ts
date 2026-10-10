import { betterAuth } from "better-auth";
import { authOptions } from "./auth-options";

// Better Auth の CLI（pnpm db:generate）がスキーマ生成のために読む設定。
// CLI は cloudflare:workers を解決できないので、DB を持たない形で分けている
export const auth = betterAuth(authOptions);
