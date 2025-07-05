import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Pink Poong Piano - Interactive Piano Game",
  description: "Play piano games with real-time audio detection. Compatible with toy pianos and touch screen. Features falling tiles game, audio analyzer, song manager, and music theory lessons.",
  keywords: ["piano", "game", "music", "audio", "education", "interactive", "real-time"],
  authors: [{ name: "Pink Poong Piano Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pink Poong Piano"
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  orientation: "landscape",
  themeColor: "#ec4899"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pink Poong Piano" />
        <meta name="application-name" content="Pink Poong Piano" />
        <meta name="msapplication-TileColor" content="#ec4899" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
