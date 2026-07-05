"use client"

import { useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { motion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const STATUS_COLORS: Record<string, string> = {
  queued: '#94a3b8',
  immediate: '#94a3b8',
  scheduled: '#94a3b8',
  running: '#5B4FE8',
  completed: '#22c55e',
  failed: '#ef4444',
  dead_letter: '#ef4444',
  cancelled: '#cbd5e1'
};

export default function Home() {
  const { data: metrics, refetch } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const json = await api.getMetrics();
      return json.data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const sub = supabase.channel('dashboard-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        refetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [refetch]);

  if (!metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B4FE8]"></div>
      </div>
    );
  }

  const { 
    chartData = [], 
    totalCompleted = 0, 
    activeWorkers = 0, 
    failureRate = '0.0%', 
    dlqCount = 0, 
    averageDuration = 0,
    jobStatusDistribution = [],
    queueHealth = [],
    executionDuration = [],
    dlqTrend = [],
    workerUtilization = []
  } = metrics;

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
      className="p-8 space-y-8 bg-[#FAFAF9] min-h-screen"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Dashboard Overview
        </h2>
        <p className="text-slate-500 mt-2 text-lg">Real-time metrics and system health.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Jobs Completed</h3>
          <p className="text-5xl font-black text-slate-900 mt-3 tracking-tight">{totalCompleted}</p>
          <p className="text-emerald-600 text-sm mt-3 flex items-center gap-2 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            {averageDuration > 0 ? `Avg duration: ${averageDuration.toFixed(2)}s` : 'Waiting for jobs'}
          </p>
        </div>
        
        {/* Metric 2 */}
        <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Active Workers</h3>
          <p className="text-5xl font-black text-slate-900 mt-3 tracking-tight">{activeWorkers}</p>
          {activeWorkers > 0 ? (
            <p className="text-[#5B4FE8] text-sm mt-3 flex items-center gap-2 font-medium">
              <span className="flex h-2 w-2 rounded-full bg-[#5B4FE8]"></span>
              All nodes healthy
            </p>
          ) : (
            <p className="text-rose-600 text-sm mt-3 flex items-center gap-2 font-medium">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              No active workers — jobs will not be processed
            </p>
          )}
        </div>
        
        {/* Metric 3 */}
        <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Failure Rate</h3>
          <p className="text-5xl font-black text-slate-900 mt-3 tracking-tight">{failureRate}</p>
          <p className="text-rose-600 text-sm mt-3 flex items-center gap-2 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-rose-500"></span>
            {dlqCount} items in DLQ
          </p>
        </div>
      </motion.div>

      {/* Main Throughput Chart */}
      <motion.div variants={itemVariants} className="p-8 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-8">System Throughput</h3>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B4FE8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#5B4FE8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E7E5E4', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a', fontWeight: 500 }}
              />
              <Area type="monotone" dataKey="jobs" stroke="#5B4FE8" strokeWidth={3} fillOpacity={1} fill="url(#colorJobs)" activeDot={{ r: 6, stroke: '#5B4FE8', strokeWidth: 2, fill: '#fff' }} />
              <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Grid for new analytics */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Status Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-900 mb-4 w-full">Job Status</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={jobStatusDistribution}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {jobStatusDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || STATUS_COLORS.queued} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Duration */}
        <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Execution Duration</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={executionDuration}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="count" fill="#5B4FE8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DLQ Trend */}
        <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">DLQ Trend (Last 7 Days)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dlqTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#fef2f2'}} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Queue Health Matrix */}
        <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm col-span-1 md:col-span-2 lg:col-span-2 overflow-x-auto">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Queue Health</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7E5E4] text-slate-500 text-xs uppercase tracking-wider">
                <th className="pb-3 font-semibold">Queue Name</th>
                <th className="pb-3 font-semibold">Concurrency</th>
                <th className="pb-3 font-semibold">Active Jobs</th>
                <th className="pb-3 font-semibold">Completed</th>
              </tr>
            </thead>
            <tbody>
              {queueHealth.map((q: any) => (
                <tr key={q.id} className="border-b border-[#E7E5E4]/50 last:border-0 text-sm">
                  <td className="py-3 font-medium text-slate-900">{q.name}</td>
                  <td className="py-3 text-slate-500">{q.limit} slots</td>
                  <td className="py-3 text-[#5B4FE8] font-medium">{q.active} running</td>
                  <td className="py-3 text-emerald-600 font-medium">{q.completed}</td>
                </tr>
              ))}
              {queueHealth.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">No queues found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Worker Utilization */}
        {activeWorkers > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Worker Utilization</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workerUtilization} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="hostname" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="count" fill="#5B4FE8" radius={[0, 4, 4, 0]} name="Active Jobs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </motion.div>
    </motion.div>
  );
}
