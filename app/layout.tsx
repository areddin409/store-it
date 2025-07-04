import type { Metadata } from 'next';
import './globals.css';
import { Poppins } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'StoreIt',
  description: 'Storage management app similar to Google Drive and Dropbox',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        {children}
        <Toaster richColors toastOptions={{}} />
      </body>
    </html>
  );
}
