import Link from "next/link";

export const metadata = {
	title: "Support - PCT Tracker",
};

export default function SupportPage() {
	return (
		<>
			<header className="sticky top-0 z-[1000] backdrop-blur-md bg-[rgba(11,14,17,0.75)] border-b border-line">
				<div className="max-w-[980px] mx-auto px-4 flex items-center justify-between gap-3 py-3.5 max-[540px]:flex-col max-[540px]:items-start">
					<div>
						<div className="font-[750] tracking-tight">PCT Tracker</div>
					</div>
					<nav className="flex gap-2 shrink-0">
						<Link
							href="/"
							className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
						>
							Home
						</Link>
						<Link
							href="/faq"
							className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
						>
							FAQ
						</Link>
						<Link
							href="/api/auth/strava"
							className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
						>
							Login
						</Link>
					</nav>
				</div>
			</header>

			<main className="max-w-[980px] mx-auto px-4 pt-10 pb-15">
				<div className="max-w-[700px] mx-auto">
					<h1 className="text-[28px] font-black mb-6">Support</h1>

					<div className="bg-card-light border border-line rounded-2xl p-[18px] mb-4">
						<h2 className="text-lg font-bold mb-2">Report an Issue</h2>
						<p className="text-[rgba(232,238,245,0.8)] leading-[1.7] text-sm mb-4">
							Found a bug or something not working as expected?
						</p>
						<a
							href="https://github.com/NoahMLoomis/pct-tracker/issues"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] text-sm"
						>
							Open an Issue on GitHub
						</a>
					</div>

					<div className="bg-card-light border border-line rounded-2xl p-[18px] mb-4">
						<h2 className="text-lg font-bold mb-2">Request a Feature</h2>
						<p className="text-[rgba(232,238,245,0.8)] leading-[1.7] text-sm mb-4">
							Have an idea for something that would make PCT Tracker better?
						</p>
						<a
							href="https://github.com/NoahMLoomis/pct-tracker/issues/"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-block no-underline px-5 py-2.5 rounded-full border border-line text-muted bg-[rgba(17,22,28,0.35)] hover:bg-[rgba(17,22,28,0.55)] text-sm"
						>
							Request a Feature
						</a>
					</div>

					<div className="bg-card-light border border-line rounded-2xl p-[18px]">
						<h2 className="text-lg font-bold mb-2">Common Questions</h2>
						<p className="text-[rgba(232,238,245,0.8)] leading-[1.7] text-sm">
							Before opening an issue, check the{" "}
							<Link href="/faq" className="text-accent">
								FAQ
							</Link>{" "}
							&mdash; your question may already be answered there.
						</p>
					</div>
				</div>
			</main>

			<footer className="border-t border-line text-muted text-xs py-[18px] pb-7 text-center">
				<div className="max-w-[980px] mx-auto px-4">
					PCT Tracker &middot;{" "}
					<a
						href="https://github.com/NoahMLoomis/pct-tracker"
						target="_blank"
						rel="noopener noreferrer"
					>
						GitHub
					</a>
				</div>
			</footer>
		</>
	);
}
