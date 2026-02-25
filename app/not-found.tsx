import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
			<div className="text-[72px] leading-none font-[900] tracking-tight text-accent opacity-20 select-none">
				404
			</div>
			<div className="mt-4 text-[28px] font-[850] tracking-tight">
				Trail Not Found
			</div>
			<p className="mt-3 text-muted max-w-[340px] leading-relaxed">
				Looks like this route went off trail. The page you&apos;re looking for
				doesn&apos;t exist. Make sure the url is correct.
			</p>
			<Link
				href="/"
				className="mt-8 no-underline inline-block px-6 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)]"
			>
				Back to home
			</Link>
		</div>
	);
}
