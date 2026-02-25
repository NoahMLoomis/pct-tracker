import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { email } = body;

	// Always return success to avoid email enumeration
	const ok = NextResponse.json({ ok: true });

	if (!email) return ok;

	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select("id, display_name, password_hash")
		.eq("email", email.toLowerCase())
		.single();

	if (!user) return ok;

	if (!user.password_hash) {
		// Account exists but was created via Strava — no password to reset
		return NextResponse.json(
			{ error: "This account uses Strava to sign in. Use the Strava login button instead." },
			{ status: 400 },
		);
	}

	const rawToken = randomBytes(32).toString("hex");
	const tokenHash = createHash("sha256").update(rawToken).digest("hex");
	const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

	await supabase.from("password_reset_tokens").insert({
		user_id: user.id,
		token_hash: tokenHash,
		expires_at: expiresAt,
	});

	const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${rawToken}`;

	await resend.emails.send({
		from: process.env.RESEND_FROM_EMAIL!,
		to: email,
		subject: "Reset your PCT Tracker password",
		html: `
			<p>Hi ${user.display_name},</p>
			<p>Someone requested a password reset for your PCT Tracker account. If this was you, click the link below to set a new password:</p>
			<p><a href="${resetUrl}">${resetUrl}</a></p>
			<p>This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
		`,
	});

	return ok;
}
