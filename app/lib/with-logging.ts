import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import { getSession } from "./session";

export function withLogging<Args extends unknown[]>(
	handler: (req: NextRequest, ...args: Args) => Promise<NextResponse | Response>,
): (req: NextRequest, ...args: Args) => Promise<NextResponse | Response> {
	return async (req, ...args) => {
		const start = Date.now();
		const method = req.method;
		const path = new URL(req.url).pathname;

		let userId: string | undefined;
		try {
			const session = await getSession();
			userId = session?.userId;
		} catch {}

		try {
			const res = await handler(req, ...args);
			logger.info("api", {
				method,
				path,
				status: res.status,
				durationMs: Date.now() - start,
				...(userId && { userId }),
			});
			return res;
		} catch (err) {
			logger.error("api error", {
				method,
				path,
				durationMs: Date.now() - start,
				...(userId && { userId }),
				error: err instanceof Error ? err.message : String(err),
				stack: err instanceof Error ? err.stack : undefined,
			});
			return NextResponse.json({ error: "Internal server error" }, { status: 500 });
		}
	};
}
