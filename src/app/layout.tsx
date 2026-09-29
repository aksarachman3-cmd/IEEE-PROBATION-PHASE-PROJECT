import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IEEE ITB Events — Find your next event",
    template: "%s · IEEE ITB Events",
  },
  description:
    "Browse workshops, conferences, and community events organised by IEEE ITB Student Branch. Free registration for members.",
  applicationName: "IEEE ITB Events",
  keywords: ["IEEE", "ITB", "Student Branch", "events", "workshop", "conference"],
};

export const viewport: Viewport = {
  themeColor: "#101c2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
