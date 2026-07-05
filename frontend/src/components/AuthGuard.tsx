"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('lockstep_token');
    
    if (!token && pathname !== '/login' && pathname !== '/') {
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Don't render anything while checking authentication state to prevent flashes
  if (isAuthenticated === null) {
    return <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>;
  }

  // Only render sidebar on dashboard routes
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/jobs') || 
                           pathname.startsWith('/queues') || 
                           pathname.startsWith('/workers') || 
                           pathname.startsWith('/dlq');

  if (!isDashboardRoute) {
    return <main className="flex-1 overflow-y-auto relative z-10 w-full">{children}</main>;
  }

  // Render authenticated layout with sidebar
  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-10">
        {children}
      </main>
    </>
  );
}
