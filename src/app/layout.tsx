import type { Metadata, Viewport } from 'next';
import '@fontsource/aref-ruqaa/arabic-400.css';
import '@fontsource/aref-ruqaa/arabic-700.css';
import '@fontsource/reem-kufi/arabic-500.css';
import '@fontsource/reem-kufi/arabic-700.css';
import '@fontsource/reem-kufi/latin-700.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'المافيا — مدينة لا تنام',
  description: 'لعبة مافيا عربية بطابع نوار: العب ضد بوتات ذكية أو مع أصحابك أونلاين.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0b0809',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
