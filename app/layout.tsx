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
  title: "NanoSprint - Carreras Virtuales",
  description: "Apuestas en carreras virtuales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "linear-gradient(135deg, #05080f 0%, #070d1a 50%, #040a12 100%)" }}>
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
