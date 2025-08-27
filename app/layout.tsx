import { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';

export const metadata: Metadata = {
  title: 'School Stats Platform - NCAA Athletic Data API',
  description: 'Comprehensive NCAA athletic program data collection and API service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistMono.className}>
      <body>{children}</body>
    </html>
  );
}