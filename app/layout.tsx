import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_ORIGIN ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const FAUCET_ICON_URL = new URL("/faucet.jpeg", APP_ORIGIN).toString();

export const metadata: Metadata = {
  metadataBase: new URL(APP_ORIGIN),
  title: "Faucet Launcher",
  description: "Pick a chain and open its faucet",
  icons: {
    icon: FAUCET_ICON_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://wallet.ring.exchange/dappsdk.js" strategy="beforeInteractive" />
        <link rel="icon" href={FAUCET_ICON_URL} type="image/jpeg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
