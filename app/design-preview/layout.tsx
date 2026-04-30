import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./azure-horizon.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-azure-headline",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-azure-body",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "VisaMap — превью Azure Horizon",
  description: "Экспериментальный макет навигации и карты (Azure Horizon)",
};

export default function DesignPreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`azure-horizon-root ${plusJakarta.variable} ${inter.variable} ${inter.className} min-h-screen bg-surface text-on-surface azure-font-body antialiased`}
    >
      {children}
    </div>
  );
}
