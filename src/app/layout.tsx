import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'KavachZero // Unified Security Command Center',
  description: 'Zero-Knowledge, $0-cost Unified Security Command Center: Fintech Fraud Shield + Omnichannel Phishing Scanner with SHA-256 Tamper-Evident Audit Ledger',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[#060913] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200`}>
        {/* Subtle background ambient mesh */}
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))]" />
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_80%_90%,rgba(16,185,129,0.06),rgba(255,255,255,0))]" />
        
        {children}
      </body>
    </html>
  );
}
