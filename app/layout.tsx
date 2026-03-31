import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faucet Launcher",
  description: "Pick a chain and open its faucet",
  icons: {
    icon: "/faucet.jpeg",
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
        <Script src="/dappsdk.js" strategy="beforeInteractive" />
        <link rel="icon" href="/faucet.jpeg" type="image/jpeg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
