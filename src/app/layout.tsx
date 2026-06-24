import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Docket",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

import { ThemeProvider } from "../components/ThemeProvider";

import { TaskEditProvider } from "../contexts/TaskEditContext";
import { ToastProvider } from "../contexts/ToastContext";
import { CommandPalette } from "../components/CommandPalette";

import LayoutWrapper from "../components/v2/LayoutWrapper";

import { SearchDialog } from '@/components/v2/SearchDialog';
import PwaRegister from '@/components/PwaRegister';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${platypi.variable} ${nunito.variable} ${jetbrainsMono.variable} antialiased flex h-screen overflow-hidden bg-gray-950 text-gray-100`}
      >
        <ThemeProvider
            attribute="class"
            forcedTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
        >
<ToastProvider>
                <TaskEditProvider>
                    <PwaRegister />
                    <CommandPalette />
                    <LayoutWrapper>
                        {children}
                    </LayoutWrapper>
                </TaskEditProvider>
            </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
