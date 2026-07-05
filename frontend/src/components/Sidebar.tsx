"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, List, Activity, ShieldAlert, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  const navItems = [
    { name: 'Metrics', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Queues', href: '/queues', icon: List },
    { name: 'Job Explorer', href: '/jobs', icon: Activity },
    { name: 'Workers', href: '/workers', icon: Users },
    { name: 'Dead Letters', href: '/dlq', icon: ShieldAlert },
  ];

  return (
    <div className="w-72 bg-[#FAFAF9] border-r border-[#E7E5E4] flex flex-col h-screen relative z-50">
      <div className="p-8 border-b border-[#E7E5E4]">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 drop-shadow-sm">
          LOCKSTEP
        </h1>
        
        <div className="mt-6 relative">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Project Scope</label>
          <select className="w-full bg-white border border-[#E7E5E4] text-slate-900 text-sm font-semibold rounded-lg p-2 appearance-none focus:outline-none focus:border-[#5B4FE8]/50 cursor-pointer shadow-sm">
            <option value="test-org">Acme Corp / Test Project</option>
            <option value="demo-org">Demo Org / Production</option>
          </select>
          <div className="absolute right-3 top-8 pointer-events-none text-slate-500">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-6 space-y-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href} className="block relative">
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute inset-0 bg-[#5B4FE8]/10 border border-[#5B4FE8]/20 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`flex items-center gap-4 px-4 py-3 rounded-xl relative z-10 transition-colors duration-200 ${isActive ? 'text-[#5B4FE8]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                <Icon size={20} className={isActive ? 'text-[#5B4FE8]' : ''} />
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-[#E7E5E4] flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>v1.0.0</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          System Online
        </div>
      </div>
    </div>
  );
}
