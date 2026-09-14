import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gigfinances.app"),
  title: "Gig Finances — Smart Money Management for Freelancers",
  description:
    "Track income, manage expenses, monitor loans, and log your work hours — all offline, all secure. The ultimate financial companion for freelancers & gig workers.",
  keywords: [
    "gig finances",
    "freelancer finance app",
    "expense tracker",
    "loan manager",
    "income tracker",
    "work log",
    "offline finance app",
    "android app",
  ],
  openGraph: {
    title: "Gig Finances",
    description:
      "Smart finance management for freelancers. Free, offline, secure.",
    type: "website",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.png" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
