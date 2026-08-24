import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DapurKasir | Operasional kuliner yang lebih rapi",
  description: "POS, stok, produksi, dan laba dalam satu ruang kerja untuk UMKM kuliner.",
  applicationName: "DapurKasir",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "DapurKasir",
    description: "Jual lebih cepat. Produksi lebih rapi. Laba lebih jelas.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
