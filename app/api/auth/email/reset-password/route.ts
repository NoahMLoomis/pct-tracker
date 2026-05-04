import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import { withLogging } from "@/lib/with-logging";

export const POST = withLogging(async (request: NextRequest) => {
	const body = await request.json();
	const { token, newPassword } = body;

	if (!token || !newPassword) {
		return NextResponse.json(
			{ error: "Token and new password are required." },
			{ status: 400 },
		);
	}

	if (newPassword.length < 8) {
		return NextResponse.json(
			{ error: "Password must be at least 8 characters." },
			{ status: 400 },
		);
	}

	const tokenHash = createHash("sha256").update(token).digest("hex");
	const supabase = createServiceClient();

	const { data: resetToken } = await supabase
		.from("password_reset_tokens")
		.select("id, user_id, expires_at, used_at")
		.eq("token_hash", tokenHash)
		.single();

	if (!resetToken) {
		return NextResponse.json(
			{ error: "Invalid or expired reset link." },
			{ status: 400 },
		);
	}

	if (resetToken.used_at) {
		return NextResponse.json(
			{ error: "This reset link has already been used." },
			{ status: 400 },
		);
	}

	if (new Date(resetToken.expires_at) < new Date()) {
		return NextResponse.json(
			{ error: "This reset link has expired. Please request a new one." },
			{ status: 400 },
		);
	}

	const passwordHash = await bcrypt.hash(newPassword, 12);

	await Promise.all([
		supabase
			.from("users")
			.update({ password_hash: passwordHash })
			.eq("id", resetToken.user_id),
		supabase
			.from("password_reset_tokens")
			.update({ used_at: new Date().toISOString() })
			.eq("id", resetToken.id),
	]);

	return NextResponse.json({ ok: true });
});
