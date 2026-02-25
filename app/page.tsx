import Link from "next/link";

export default function LandingPage() {
	return (
		<>
			<header className="sticky top-0 z-[1000] backdrop-blur-md bg-[rgba(11,14,17,0.75)] border-b border-line">
				<div className="max-w-[980px] mx-auto px-4 flex items-center justify-between gap-3 py-3.5">
					<div>
						<div className="font-[750] tracking-tight">PCT Tracker</div>
					</div>
					<nav className="flex gap-2 shrink-0">
						<Link
							href="/faq"
							className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
						>
							FAQ
						</Link>
						<Link
							href="/support"
							className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
						>
							Support
						</Link>
						<Link
							href="/login"
							className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
						>
							Login
						</Link>
					</nav>
				</div>
			</header>

			<main className="max-w-[980px] mx-auto px-4 pt-15 pb-15">
				<div className="max-w-[560px] mx-auto text-center">
					<h1 className="text-4xl font-black leading-tight mb-4">
						Track your PCT hike
					</h1>
					<p className="text-muted text-base leading-relaxed mb-9">
						Get a live map of your Pacific Crest Trail progress and share it
						with friends and family. Connect Strava for automatic activity sync,
						or sign up with email and post location updates manually.
					</p>
					<Link
						href="/login"
						className="inline-block no-underline px-7 py-3.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer text-base"
					>
						Get Started
					</Link>
					<p className="text-muted text-sm mt-4">
						or{" "}
						<Link href="/tracker/jane-doe" className="text-accent">
							see an example
						</Link>
					</p>

					<div className="bg-card border border-line rounded-2xl p-[18px] mt-12 text-left">
						<div className="font-bold mb-1">How it works</div>
						<ol className="m-0 pl-[18px] text-muted leading-relaxed">
							<li>Sign up with email or connect your Strava account</li>
							<li>Post trail updates with your current location</li>
							<li>
								Get a public tracker page with a live map, stats, and insights
							</li>
							<li>Optionally link Strava for automatic activity sync</li>
						</ol>
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
