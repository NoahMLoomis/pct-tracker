import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "PCT Tracker",
	description: "Track your Pacific Crest Trail hike",
	icons: { icon: "/fav.png" },
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
