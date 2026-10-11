import type { Metadata } from "next";
import { Bebas_Neue, Cairo, Inter } from "next/font/google";
import { headers } from "next/headers";
import { isLocale } from "@/lib/i18n";

import "./globals.css";
import "./rtl-support.css";

import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vi2 — Live Well, Live Fully",
  description: "Dietary, wellness and sports nutrition.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requested = (await headers()).get("x-vi2-locale");
  const locale = isLocale(requested) ? requested : "en";
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
<body
        className={`${bebasNeue.variable} ${inter.variable} ${cairo.variable}`}
        suppressHydrationWarning
      >
        <Providers locale={locale}>
          <Navbar />

          {children}

          <Footer />

          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}