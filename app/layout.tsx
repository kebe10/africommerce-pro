import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Important pour garder les styles Tailwind

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AfriCommerce Pro",
  description: "Gérez votre e-commerce africain avec clarté",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}