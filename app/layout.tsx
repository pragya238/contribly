import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contribly — Your first open-source contribution",
  description: "Find beginner-friendly issues, learn the contribution workflow, and make your first pull request.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
