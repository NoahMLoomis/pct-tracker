"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TrackerHeaderProps {
	slug: string;
	displayName: string;
	lighterpackUrl?: string | null;
}

export default function TrackerHeader({
	slug,
	displayName,
	lighterpackUrl,
}: TrackerHeaderProps) {
	const pathname = usePathname();
	const base = `/tracker/${slug}`;

	const tabs = [
		{ label: "Map", href: base },
		{ label: "Updates", href: `${base}/updates` },
	];

	return (
		<header className="sticky top-0 z-[1000] backdrop-blur-md bg-[rgba(11,14,17,0.75)] border-b border-line">
			<div className="max-w-[980px] mx-auto px-4 flex items-center justify-between gap-3 py-3.5 max-[540px]:flex-col max-[540px]:items-start">
				<div>
					<Link href={base} className="font-[750] tracking-tight" style={{ color: "inherit", textDecoration: "none" }}>
						{displayName}&apos;s PCT Tracker
					</Link>
				</div>

				<nav className="flex gap-2 shrink-0">
					{tabs.map((t) => (
						<Link
							key={t.href}
							href={t.href}
							className={`no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)] ${pathname === t.href ? "!text-text !border-[rgba(126,231,135,0.35)] shadow-[inset_0_0_0_1px_rgba(126,231,135,0.25)]" : ""}`}
						>
							{t.label}
						</Link>
					))}
					{lighterpackUrl && (
						<a
							href={`https://lighterpack.com/r/${lighterpackUrl}`}
							target="_blank"
							rel="noopener noreferrer"
							className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
						>
							Gear
						</a>
					)}
				</nav>
			</div>
		</header>
	);
}
