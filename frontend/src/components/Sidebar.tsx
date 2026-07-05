"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, List, Activity, ShieldAlert, Users, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const TooltipIcon = ({ text }: { text: string }) => {
  return (
    <div className="relative flex items-center group/tooltip">
      <button 
        type="button" 
        className="p-1.5 text-slate-400 hover:text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8]/50 rounded-md transition-colors bg-transparent"
        aria-label={text}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Info size={15} strokeWidth={2.5} />
      </button>
      
      <div 
        className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-[220px] bg-white border border-[#E7E5E4] shadow-lg rounded-lg p-3 text-[13px] text-slate-700 font-normal z-[100] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-200 delay-150 leading-relaxed pointer-events-none"
      >
        {text}
      </div>
    </div>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  const navItems = [
    { name: 'Metrics', href: '/dashboard', icon: LayoutDashboard, tooltip: 'Real-time job counts, active workers, failure rate, and system throughput' },
    { name: 'Queues', href: '/queues', icon: List, tooltip: 'Create and configure queues - priority, concurrency limits, retry policy - and pause or resume processing' },
    { name: 'Job Explorer', href: '/jobs', icon: Activity, tooltip: 'Browse all jobs across queues, filter by status, and inspect each job\'s full lifecycle and execution logs' },
    { name: 'Workers', href: '/workers', icon: Users, tooltip: 'Live status of every worker process - capacity, uptime, and current heartbeat' },
    { name: 'Dead Letters', href: '/dlq', icon: ShieldAlert, tooltip: 'Jobs that permanently failed after exhausting retries - requeue or delete them here' },
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
            <div key={item.name} className="relative block">
              <Link href={item.href} className="block relative">
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-0 bg-[#5B4FE8]/10 border border-[#5B4FE8]/20 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl relative z-10 transition-colors duration-200 ${isActive ? 'text-[#5B4FE8]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <Icon size={20} className={isActive ? 'text-[#5B4FE8]' : ''} />
                    <span className="font-medium pr-6">{item.name}</span>
                  </div>
                </div>
              </Link>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                <TooltipIcon text={item.tooltip} />
              </div>
            </div>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-[#E7E5E4] flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>v1.0.0</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('lockstep_token');
              window.location.href = '/login';
            }
          }}
          className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors font-semibold text-sm border border-rose-100"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
