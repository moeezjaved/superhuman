import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HiUnicorn — your business, running',
  description: 'HiUnicorn learns how your company works, then does the repetitive work for you — and asks before anything that matters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
