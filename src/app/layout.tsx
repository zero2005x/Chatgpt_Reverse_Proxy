import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AI Chat Multi-Service Platform",
  description: "A comprehensive chat platform supporting 27+ AI services with secure API key management",
  keywords: ["ai", "chat", "openai", "claude", "gemini", "multi-service"],
  authors: [{ name: "AI Proxy Team" }],
  robots: "index, follow",
  openGraph: {
    title: "AI Chat Multi-Service Platform",
    description: "A comprehensive chat platform supporting 27+ AI services",
    type: "website",
    url: "https://your-domain.vercel.app",
    siteName: "AI Proxy",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Chat Multi-Service Platform",
    description: "A comprehensive chat platform supporting 27+ AI services",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}