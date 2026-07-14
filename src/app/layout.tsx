import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mini CRM",
  description: "A lightweight contact & relationship manager.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
            <Link
              href="/contacts"
              className="font-heading text-base font-semibold"
            >
              Mini CRM
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {/* Dashboard is a later slice — shown but inactive. */}
              <span className="text-muted-foreground" aria-disabled>
                Dashboard
              </span>
              <Link href="/contacts" className="font-medium hover:underline">
                Contacts
              </Link>
              <Link href="/companies" className="font-medium hover:underline">
                Companies
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
