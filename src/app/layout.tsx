import type { Metadata } from "next";
import Link from "next/link";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Application Assistant",
  description:
    "Track job applications and generate tailored resumes with AI and LaTeX.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <span className="text-xl">📋</span>
                <span>Job Application Assistant</span>
              </Link>
              <nav className="flex gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <ToastProvider>
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
