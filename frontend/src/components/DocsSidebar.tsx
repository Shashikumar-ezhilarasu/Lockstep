"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const docsPages = [
  { name: 'Getting started', href: '/docs' },
  { name: 'System architecture', href: '/docs/architecture' },
  { name: 'Database schema', href: '/docs/database' },
  { name: 'API reference', href: '/docs/api' },
  { name: 'Backend engineering', href: '/docs/backend' },
  { name: 'Reliability & concurrency', href: '/docs/reliability' },
  { name: 'Testing strategy', href: '/docs/testing' },
  { name: 'Feature matrix', href: '/docs/features' },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-[#1C1917] border-r border-white/5 flex flex-col h-screen sticky top-0 z-40">
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="text-xl font-black tracking-tight text-white drop-shadow-sm hover:text-slate-200 transition-colors">
          LOCKSTEP
        </Link>
        <div className="mt-1 text-xs text-slate-400 font-mono">Documentation</div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {docsPages.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link key={item.name} href={item.href} className="block relative">
              {isActive && (
                <motion.div 
                  layoutId="docs-active-pill"
                  className="absolute inset-0 bg-[#5B4FE8]/10 border border-[#5B4FE8]/20 rounded-lg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`px-4 py-2.5 rounded-lg relative z-10 transition-colors duration-200 text-sm ${isActive ? 'text-[#5B4FE8] font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'}`}>
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <Link href="/login" className="flex items-center justify-center w-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
