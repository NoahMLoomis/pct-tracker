import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { withLogging } from "@/lib/with-logging";

export const POST = withLogging(async (request: NextRequest) => {
	const body = await request.json();
	const { slug, email } = body;

	if (!slug || !email) {
		return NextResponse.json(
			{ error: "Missing required fields." },
			{ status: 400 },
		);
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return NextResponse.json(
			{ error: "Invalid email address." },
			{ status: 400 },
		);
	}

	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("slug", slug)
		.single();

	if (!user) {
		return NextResponse.json({ error: "Tracker not found." }, { status: 404 });
	}

	// Upsert — idempotent if already subscribed
	const { error } = await supabase.from("subscriptions").upsert(
		{
			user_id: user.id,
			email: email.toLowerCase(),
			unsubscribe_token: randomBytes(32).toString("hex"),
		},
		{ onConflict: "user_id,email", ignoreDuplicates: true },
	);

	if (error) {
		return NextResponse.json(
			{ error: "Failed to subscribe." },
			{ status: 500 },
		);
	}

	return NextResponse.json({ ok: true });
});

export const DELETE = withLogging(async (request: NextRequest) => {
	const token = request.nextUrl.searchParams.get("token");

	if (!token) {
		return NextResponse.json({ error: "Missing token." }, { status: 400 });
	}

	const supabase = createServiceClient();

	const { error } = await supabase
		.from("subscriptions")
		.delete()
		.eq("unsubscribe_token", token);

	if (error) {
		return NextResponse.json(
			{ error: "Failed to unsubscribe." },
			{ status: 500 },
		);
	}

	return NextResponse.json({ ok: true });
});
