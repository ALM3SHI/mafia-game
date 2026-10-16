import type { Metadata } from 'next';
import { Changa, Orbitron } from 'next/font/google';
import './globals.css';
import CRTOverlay from '@/components/shared/CRTOverlay';

const changa = Changa({ subsets: ['arabic', 'latin'], weight: ['400', '600', '800'], variable: '--next-changa' });
const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '900'], variable: '--next-orbitron' });

export const metadata: Metadata = {
  title: 'MAFIA | لعبة المافيا',
  description: 'لعبة مافيا عربية ضد بوتات ذكية بالصوت',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${changa.variable} ${orbitron.variable}`}>
      <body className="antialiased">
        <CRTOverlay />
        <div className="orientation-warning">
          <div className="font-orbitron text-4xl text-[#cfb06f] mb-4">🔄</div>
          <p className="font-changa text-xl text-white/60">يرجى تدوير جهازك للوضع الأفقي للعب</p>
        </div>
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
