import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  weight: ["600"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  weight: ["500"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VerisVisuals — Photography Beyond Documentation",
  description:
    "VerisVisuals by Salim Shaikh. Premium commercial photography, luxury destination weddings, and editorial portraiture. Mumbai, India.",
  keywords: [
    "luxury photography",
    "commercial photography",
    "architectural photography",
    "destination wedding photography",
    "Salim Shaikh",
    "Mumbai photographer",
    "VerisVisuals",
  ],
  authors: [{ name: "Salim Shaikh" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>V</text></svg>",
  },
  openGraph: {
    title: "VerisVisuals — Photography Beyond Documentation",
    description:
      "Premium commercial photography, luxury destination weddings, and editorial portraiture by Salim Shaikh.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${inter.variable} antialiased`}
        style={{ background: "#050505", color: "#F5F5F5" }}
      >
        {children}
      </body>
    </html>
  );
}