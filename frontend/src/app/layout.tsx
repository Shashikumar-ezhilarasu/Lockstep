import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lockstep Dashboard",
  description: "Distributed Job Scheduler Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 flex h-screen overflow-hidden relative`}>
        {/* Abstract background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-900/10 blur-[120px] pointer-events-none" />
        
        <Providers>
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'bg-slate-900 text-slate-100 border border-slate-800',
              duration: 4000,
            }}
          />
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative z-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
