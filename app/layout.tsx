import { Metadata } from 'next';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}