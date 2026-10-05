import type { Metadata, Viewport } from 'next';
import { Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Research-grade type pairing: Inter for prose, IBM Plex Mono for the technical
// overlays, readouts and labels.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EvoComb · Environmental Stress Index for The Globe',
  description:
    'Four signals — relative humidity, wind speed, solar radiation and temperature — blended into one Environmental Stress Index across The Globe. Street-level where data allows, honest where it does not.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow pinch-zoom for accessibility.
  maximumScale: 5,
  themeColor: '#0a0b0d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <div id="app-root">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
