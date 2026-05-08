import type { Metadata } from "next";
import { Orbitron, Titillium_Web } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

const titillium = Titillium_Web({
  subsets: ["latin"],
  variable: "--font-titillium",
  weight: ["300", "400", "600", "700"],
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "RaceLine",
  description: "F1 stats dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${titillium.variable} ${orbitron.variable} antialiased`}>
        <header className="w-full h-13 bg-[#1A1A1A] z-100 sticky top-0 px-6 flex items-center justify-between relative">
          <div className="font-extrabold text-xl md:text-2xl">
            <h1>RaceLine</h1>
          </div>

          <nav className="hidden md:flex gap-6 text-lg font-semibold font-orbitron">
            <Link href="/" className="hover:text-[#0048b7] transition">
              Leaderboard
            </Link>
            <Link href="/drivers" className="hover:text-[#0048b7] transition">
              Drivers
            </Link>
            <Link href="/teams" className="hover:text-[#0048b7] transition">
              Teams
            </Link>
          </nav>

          <MobileNav />
        </header>

        {children}
      </body>
    </html>
  );
}