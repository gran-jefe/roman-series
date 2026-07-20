export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { PWARegister } from "@/components/PWARegister";
import { Toaster } from "react-hot-toast";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Roman Series — Post-UTME Past Questions",
  description: "Practice Post-UTME past questions for UI, OAU, UNILAG, ABU, FUTA and more. Timed practice, instant scoring, performance tracking.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Roman Series",
  },
  openGraph: {
    title: "Roman Series — Post-UTME Past Questions",
    description: "Practice Post-UTME past questions for UI, OAU, UNILAG, ABU, FUTA and more.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1B2A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body
        className={`${jakartaSans.variable} ${geistSans.variable} ${geistMono.variable} antialiased text-navy bg-blush`}
        style={{ colorScheme: 'light' }}
      >
        <PWARegister />
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            success: { style: { background: "#8B2252", color: "#fff" } },
            error: { style: { background: "#C4522A", color: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
