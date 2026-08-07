import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  weight: "variable",
});

const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Un solo texto para la descripción: lo reutilizan la meta description
// (resultados de Google) y las tarjetas de Open Graph/Twitter (WhatsApp,
// Telegram, redes), así que no pueden desincronizarse. Coincide con el
// párrafo del hero a propósito — antes hablaba de "dunas"/"arena" y de "La
// Picota", que ya se corrigieron en la web por no ser exactos.
const SITE_DESCRIPTION =
  "Un trail costero por Cantabria, entre acantilados y pinares, hasta el mirador de Monte Picota, con la ría de Mogro abriéndose debajo. 13,1 km y 372 m de desnivel positivo en Liencres.";

export const metadata: Metadata = {
  // metadataBase resuelve las rutas relativas de abajo a URLs absolutas:
  // Open Graph las exige absolutas o la tarjeta sale sin imagen.
  metadataBase: new URL("https://desafio-picota.vercel.app"),
  title: "Desafío Picota | Trail costero, Liencres",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Desafío Picota",
    title: "Desafío Picota | Trail costero, Liencres",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Vista desde Monte Picota: la ría de Mogro abriéndose en herradura sobre el Cantábrico",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Desafío Picota | Trail costero, Liencres",
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/favicon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('picota-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}",
          }}
        />
        <MotionProvider>{children}</MotionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
