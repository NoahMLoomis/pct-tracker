import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { withLogging } from "@/lib/with-logging";

export const POST = withLogging(async (request: NextRequest) => {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get("file") as File | null;
	if (!file) {
		return NextResponse.json({ error: "No file provided" }, { status: 400 });
	}
	if (!file.type.startsWith("image/")) {
		return NextResponse.json({ error: "File must be an image" }, { status: 400 });
	}

	const ext = file.type === "image/png" ? "png" : "jpg";
	const path = `${session.userId}/${crypto.randomUUID()}.${ext}`;

	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);

	const supabase = createServiceClient();

	const { error } = await supabase.storage
		.from("update-photos")
		.upload(path, buffer, { contentType: file.type, upsert: false });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const { data: { publicUrl } } = supabase.storage
		.from("update-photos")
		.getPublicUrl(path);

	return NextResponse.json({ url: publicUrl });
});
