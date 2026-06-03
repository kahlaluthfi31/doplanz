import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UiProviders from "./components/UiProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "doplanZ",
  description: "Do it, Plan it",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "doplanZ",
  },
  applicationName: "doplanZ",
  icons: {
    apple: "/images/doplanz-logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UiProviders>{children}</UiProviders>
      </body>
    </html>
  );
}
