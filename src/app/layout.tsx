import type { Metadata } from "next";
import { Changa, Orbitron } from "next/font/google";
import "./globals.css";
import CRTOverlay from "@/components/shared/CRTOverlay";

const changa = Changa({
  subsets: ["arabic"],
  weight: ["400", "600", "800"],
  variable: "--font-changa",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "MAFIA | ساحة المعركة الأسطورية",
  description: "لعبة مافيا البطاقات التاريخية والاحترافية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${changa.variable} ${orbitron.variable} antialiased`}>
        <CRTOverlay />
        
        {/* Orientation Warning */}
        <div className="orientation-warning">
          <div className="font-orbitron text-4xl text-[#cfb06f] mb-4">🔄 تدوير الشاشة</div>
          <p className="font-changa text-xl text-white/60">يرجى تدوير جهازك للوضع الأفقي للعب</p>
        </div>

        <main className="relative z-10 h-full">
          {children}
        </main>
      </body>
    </html>
  );
}
