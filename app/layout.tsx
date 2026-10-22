import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Diamond Business Suite — Multi-Company Operations & Management',
  description: 'Multi-company business management suite for customers, sales, operations, tasks, and invoicing.',
  openGraph: {
    title: 'Diamond Business Suite — Multi-Company Operations & Management',
    description: 'Multi-company business management suite for customers, sales, operations, tasks, and invoicing.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Diamond Business Suite — Multi-Company Operations & Management',
    description: 'Multi-company business management suite for customers, sales, operations, tasks, and invoicing.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="font-sans text-slate-800 bg-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}
