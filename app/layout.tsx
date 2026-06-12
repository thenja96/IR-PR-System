import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegis MarketPulse AI",
  description:
    "AI-powered market intelligence, investor narrative, and IR/PR opportunity platform for Aegis Communication Sdn Bhd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
