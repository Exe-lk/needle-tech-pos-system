import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/src/components/common/footer";
import { SidebarProvider } from "@/src/contexts/SidebarContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeedleTech POS",
  description: "Point of Sale System for NeedleTech",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-[100dvh] h-[100dvh] max-h-[100dvh] overflow-hidden print:min-h-0 print:h-auto print:max-h-none print:overflow-visible`}
      >
        <SidebarProvider>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y print:overflow-visible print:min-h-0">
            {children}
          </div>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}