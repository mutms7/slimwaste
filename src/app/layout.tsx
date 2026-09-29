import type { Metadata } from "next";
import localFont from "next/font/local";
import { Shell } from "@/components/shell";
import "./globals.css";

const display = localFont({
  src: "./fonts/bricolage.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "200 800",
});
const body = localFont({
  src: "./fonts/dm-sans.ttf",
  variable: "--font-body",
  display: "swap",
  weight: "100 1000",
});

export const metadata: Metadata = {
  title: "SlimWaste",
  description: "A small, practical way to notice and reduce food waste.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
