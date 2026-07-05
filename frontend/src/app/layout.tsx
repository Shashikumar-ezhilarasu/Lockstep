import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import Providers from "@/components/Providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lockstep Dashboard",
  description: "Distributed Job Scheduler Dashboard",
};

import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} bg-[#FAFAF9] text-slate-900 flex h-screen overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900`}>
        <Providers>
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'bg-white text-slate-900 border border-[#E7E5E4] shadow-sm',
              duration: 4000,
            }}
          />
          <AuthGuard>
            {children}
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
