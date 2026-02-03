import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GO SAFE - Your Go to App for Everything",
  description: "Book rides, get around town, and travel safely with GO SAFE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* When app is bundled in Capacitor (file:// or Capacitor), send /api/* to Vercel so data works when online */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var b=(typeof window!=='undefined'&&(window.Capacitor||(location&&location.protocol==='file:')))?'https://gosafezimbabwe.vercel.app':'';if(b){var f=window.fetch;window.fetch=function(u,o){var url=typeof u==='string'?u:(u&&u.url)?u.url:'';if(url&&url.startsWith&&url.startsWith('/api/'))return f(b+url,o);return f(u,o);};}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
            },
          }}
        />
      </body>
    </html>
  );
}