import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF préféré, WebP en repli — meilleure compression pour les grandes images.
    formats: ["image/avif", "image/webp"],
    // En Next 16 la liste des qualités doit être explicitement autorisée.
    qualities: [70, 80, 90],
  },
};

export default nextConfig;
