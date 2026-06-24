export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Toaster } from "react-hot-toast";

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
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Roman Series — Post-UTME Past Questions",
    description: "Practice Post-UTME past questions for UI, OAU, UNILAG, ABU, FUTA and more.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-navy bg-blush`}
        style={{ colorScheme: 'light' }}
      >
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
