import type { Metadata } from "next";
import { JetBrains_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const sans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://shipcheck.vercel.app";
const DESCRIPTION =
  "Paste a URL. ShipCheck runs the indexing and metadata checks that actually keep pages out of Google, and gives you the exact Next.js fix. No login.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "ShipCheck — pre-flight SEO check for your site",
    template: "%s · ShipCheck",
  },
  description: DESCRIPTION,
  applicationName: "ShipCheck",
  alternates: { canonical: "/" },
  keywords: ["SEO checker", "Next.js SEO", "canonical tag", "metadata linter", "indexing"],
  authors: [{ name: "Alex Pappas", url: "https://twitter.com/apappasdev" }],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "ShipCheck",
    title: "ShipCheck — pre-flight SEO check for your site",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "ShipCheck — pre-flight SEO check",
    description: DESCRIPTION,
    creator: "@apappasdev",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ShipCheck",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: SITE,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body className="grain min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
