import type { Metadata } from "next";
import "./globals.css";
import { pairFor } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "LokaLinc — Connect Locally, Live Fully",
  description:
    "LokaLinc helps you discover people, places, and moments in your neighborhood. Real connections, real proximity, real life.",
  icons: { icon: "/app-icon.png", apple: "/app-icon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={pairFor("bold")}
      style={{ "--brand": "160" } as React.CSSProperties}
    >
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
