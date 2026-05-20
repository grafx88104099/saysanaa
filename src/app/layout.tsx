import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SayaSanaa OS",
  description: "Интерьер дизайны студийн дотоод удирдлагын систем",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
