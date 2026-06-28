import type { Metadata } from "next";
import { display, body } from "@/lib/fonts";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Atmosphere from "@/components/Atmosphere";
import Cursor from "@/components/Cursor";
import ViewProvider from "@/components/ViewProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Louis Dedieu — Photographe de destination",
  description:
    "Book photo de destination : Maroc, Espagne, Antibes. Récits de voyage en images, du grand paysage au détail. Ouvert aux missions.",
  openGraph: {
    title: "Louis Dedieu — Photographe de destination",
    description:
      "Faire exister un lieu en images. Maroc, Espagne, Antibes — un book photo immersif.",
    type: "website",
    images: ["/images/maroc-01.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>
        <Cursor />
        <Atmosphere />
        <SmoothScrollProvider>
          <ViewProvider>{children}</ViewProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
