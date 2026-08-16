import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Maidly | Trusted Help. Happier Homes.",
  description: "Find trusted home services professionals including house cleaners, bathroom cleaners, kitchen cleaners, cooks, and caretakers.",
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
