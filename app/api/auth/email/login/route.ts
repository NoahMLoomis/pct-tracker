import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import { createSession, sessionCookieOptions } from "@/lib/session";
import { withLogging } from "@/lib/with-logging";

export const POST = withLogging(async (request: NextRequest) => {
	const body = await request.json();
	const { email, password } = body;

	if (!email || !password) {
		return NextResponse.json(
			{ error: "Email and password are required." },
			{ status: 400 },
		);
	}

	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select("id, password_hash")
		.eq("email", email.toLowerCase())
		.single();

	if (!user || !user.password_hash) {
		return NextResponse.json(
			{ error: "Invalid email or password." },
			{ status: 401 },
		);
	}

	const valid = await bcrypt.compare(password, user.password_hash);
	if (!valid) {
		return NextResponse.json(
			{ error: "Invalid email or password." },
			{ status: 401 },
		);
	}

	const token = await createSession(user.id);
	const response = NextResponse.json({ ok: true });
	response.cookies.set(sessionCookieOptions(token));
	return response;
});
