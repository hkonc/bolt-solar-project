import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast-provider';
import { Navbar } from '@/components/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '発電量データ取得アプリ',
  description: '発電量データを取得して保存するアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ToastProvider />
        <div className="flex">
          <Navbar />
          <div className="flex-1 ml-64">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}