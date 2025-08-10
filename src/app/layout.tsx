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

const platypi = {
  variable: "--font-platypi",
  // We'll load Platypi from Google Fonts via CSS import
};

const nunito = {
  variable: "--font-nunito", 
  // We'll load Nunito from Google Fonts via CSS import
};

const jetbrainsMono = {
  variable: "--font-jetbrains",
  // We'll load JetBrains Mono from Google Fonts via CSS import
};

export const metadata: Metadata = {
  title: "The Docket",
  description: "Personal productivity application with seamless note-taking and task management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${platypi.variable} ${nunito.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
