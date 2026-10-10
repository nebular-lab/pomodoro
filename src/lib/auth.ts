import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db";
import { authOptions } from "./auth-options";

export const auth = betterAuth({
	...authOptions,
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: "sqlite" }),
	// tanstackStartCookies は最後に置く
	plugins: [...authOptions.plugins, tanstackStartCookies()],
});
