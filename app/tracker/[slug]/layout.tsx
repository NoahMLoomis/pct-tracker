import { createServiceClient } from "@/lib/supabase/server";
import TrackerHeader from "@/components/TrackerHeader";
import { notFound } from "next/navigation";

export default async function TrackerLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select("display_name, slug, lighterpack_url")
		.eq("slug", slug)
		.single();

	if (!user) notFound();

	return (
		<>
			<TrackerHeader
				slug={user.slug}
				displayName={user.display_name}
				lighterpackUrl={user.lighterpack_url}
			/>
			<main className="lg:max-w-5/6 max-w-[980px] mx-auto px-4">{children}</main>
		</>
	);
}
