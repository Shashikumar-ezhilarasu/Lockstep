"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function Home() {
  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const json = await api.getMetrics();
      return json.data;
    },
    refetchInterval: 10000,
    initialData: {
      chartData: [],
      totalCompleted: 0,
      activeWorkers: 0,
      failureRate: '0.0%',
      dlqCount: 0,
      averageDuration: 0,
    }
  });

  if (!metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const { chartData, totalCompleted, activeWorkers, failureRate, dlqCount, averageDuration } = metrics;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="p-8 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Dashboard Overview
        </h2>
        <p className="text-slate-400 mt-2 text-lg">Real-time metrics and system health.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="relative group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden hover:bg-white/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider relative z-10">Total Jobs Completed</h3>
          <p className="text-5xl font-black text-white mt-3 relative z-10 tracking-tight">{totalCompleted}</p>
          <p className="text-emerald-400 text-sm mt-3 flex items-center gap-1 font-medium relative z-10">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {averageDuration > 0 ? `Avg duration: ${averageDuration.toFixed(2)}s` : 'Waiting for jobs'}
          </p>
        </div>
        
        {/* Metric 2 */}
        <div className="relative group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden hover:bg-white/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider relative z-10">Active Workers</h3>
          <p className="text-5xl font-black text-white mt-3 relative z-10 tracking-tight">{activeWorkers}</p>
          {activeWorkers > 0 ? (
            <p className="text-blue-400 text-sm mt-3 flex items-center gap-1 font-medium relative z-10">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              All nodes healthy
            </p>
          ) : (
            <p className="text-rose-400 text-sm mt-3 flex items-center gap-1 font-medium relative z-10">
              <span className="flex h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>
              No active workers — jobs will not be processed
            </p>
          )}
        </div>
        
        {/* Metric 3 */}
        <div className="relative group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden hover:bg-white/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider relative z-10">Failure Rate</h3>
          <p className="text-5xl font-black text-white mt-3 relative z-10 tracking-tight">{failureRate}</p>
          <p className="text-rose-400 text-sm mt-3 flex items-center gap-1 font-medium relative z-10">
            {dlqCount} items in DLQ
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <h3 className="text-xl font-bold text-slate-200 mb-8 relative z-10">System Throughput</h3>
        <div className="h-96 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                itemStyle={{ color: '#f8fafc', fontWeight: 500 }}
              />
              <Area type="monotone" dataKey="jobs" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorJobs)" activeDot={{ r: 6, stroke: '#c7d2fe', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="failed" stroke="#fb7185" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
