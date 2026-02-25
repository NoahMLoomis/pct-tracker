import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

async function notifySubscribers(
	supabase: ReturnType<typeof createServiceClient>,
	userId: string,
	update: { title: string; body: string; created_at: string },
) {
	const [{ data: user }, { data: subs }] = await Promise.all([
		supabase.from("users").select("display_name, slug").eq("id", userId).single(),
		supabase.from("subscriptions").select("email, unsubscribe_token").eq("user_id", userId),
	]);

	if (!user || !subs || subs.length === 0) return;

	const trackerUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/tracker/${user.slug}/updates`;
	const date = new Date(update.created_at).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	await Promise.allSettled(
		subs.map((sub) => {
			const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?token=${sub.unsubscribe_token}`;
			return resend.emails.send({
				from: process.env.RESEND_FROM_EMAIL!,
				to: sub.email,
				subject: `New update from ${user.display_name}: ${update.title}`,
				html: `
					<p><strong>${date}</strong></p>
					<h2>${update.title}</h2>
					<p style="white-space: pre-wrap">${update.body}</p>
					<p><a href="${trackerUrl}">View all updates</a></p>
					<hr />
					<p style="font-size: 12px; color: #888;">
						You're receiving this because you subscribed to ${user.display_name}'s PCT tracker.
						<a href="${unsubscribeUrl}">Unsubscribe</a>
					</p>
				`,
			});
		}),
	);
}

export async function POST(request: NextRequest) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const supabase = createServiceClient();
	const userId = session.userId;

	if (body.action === "create") {
		if (!body.title?.trim() || !body.body?.trim()) {
			return NextResponse.json(
				{ error: "Title and body are required" },
				{ status: 400 },
			);
		}
		if (body.body.trim().length > 500) {
			return NextResponse.json(
				{ error: "Body must be 500 characters or less" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("trail_updates")
			.insert({
				user_id: userId,
				title: body.title.trim(),
				body: body.body.trim(),
				lat: body.lat ?? null,
				lon: body.lon ?? null,
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Fire-and-forget — don't let email failures block the response
		notifySubscribers(supabase, userId, data).catch(console.error);

		return NextResponse.json(data);
	}

	if (body.action === "update") {
		if (!body.id) {
			return NextResponse.json(
				{ error: "Update ID is required" },
				{ status: 400 },
			);
		}
		if (!body.title?.trim() || !body.body?.trim()) {
			return NextResponse.json(
				{ error: "Title and body are required" },
				{ status: 400 },
			);
		}
		if (body.body.trim().length > 300) {
			return NextResponse.json(
				{ error: "Body must be 300 characters or less" },
				{ status: 400 },
			);
		}

		const { error } = await supabase
			.from("trail_updates")
			.update({
				title: body.title.trim(),
				body: body.body.trim(),
				lat: body.lat ?? null,
				lon: body.lon ?? null,
			})
			.eq("id", body.id)
			.eq("user_id", userId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	}

	if (body.action === "delete") {
		if (!body.id) {
			return NextResponse.json(
				{ error: "Update ID is required" },
				{ status: 400 },
			);
		}

		const { error } = await supabase
			.from("trail_updates")
			.delete()
			.eq("id", body.id)
			.eq("user_id", userId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	}

	return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
