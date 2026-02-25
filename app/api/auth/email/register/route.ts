import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import { createSession, sessionCookieOptions } from "@/lib/session";

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { email, password, displayName } = body;

	if (!email || !password || !displayName) {
		return NextResponse.json(
			{ error: "Email, password, and display name are required." },
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

	if (password.length < 8) {
		return NextResponse.json(
			{ error: "Password must be at least 8 characters." },
			{ status: 400 },
		);
	}

	if (displayName.trim().length < 2) {
		return NextResponse.json(
			{ error: "Display name must be at least 2 characters." },
			{ status: 400 },
		);
	}

	const supabase = createServiceClient();

	const { data: existing } = await supabase
		.from("users")
		.select("id")
		.eq("email", email.toLowerCase())
		.single();

	if (existing) {
		return NextResponse.json(
			{ error: "An account with this email already exists." },
			{ status: 409 },
		);
	}

	const passwordHash = await bcrypt.hash(password, 12);

	const baseSlug = slugify(displayName.trim()) || "hiker";
	let slug = baseSlug;
	let attempt = 0;
	while (true) {
		const { data: conflict } = await supabase
			.from("users")
			.select("id")
			.eq("slug", slug)
			.single();
		if (!conflict) break;
		attempt++;
		slug = `${baseSlug}-${attempt}`;
	}

	const { data: newUser, error } = await supabase
		.from("users")
		.insert({
			email: email.toLowerCase(),
			password_hash: passwordHash,
			display_name: displayName.trim(),
			slug,
			hike_start_date: new Date().toISOString().slice(0, 10),
		})
		.select("id")
		.single();

	if (error || !newUser) {
		return NextResponse.json(
			{ error: "Failed to create account." },
			{ status: 500 },
		);
	}

	await supabase.from("sync_state").insert({ user_id: newUser.id });

	const token = await createSession(newUser.id);
	const response = NextResponse.json({ ok: true });
	response.cookies.set(sessionCookieOptions(token));
	return response;
}
