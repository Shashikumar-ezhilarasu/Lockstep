"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft } from 'lucide-react';
import JobLifecycleDiagram, { type JobLifecycleStatus } from '@/components/JobLifecycleDiagram';
import { motion, AnimatePresence } from 'framer-motion';

type Job = {
  id: string;
  status: JobLifecycleStatus;
  type: string;
  attempt: number;
  payload: unknown;
  created_at: string;
  scheduled_at?: string;
  claimed_at?: string;
  queues?: { name?: string };
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase.from('jobs').select('*, queues(name)').order('created_at', { ascending: false }).limit(50);
      if (data) {
        const nextJobs = data as Job[];
        setJobs(nextJobs);
        setSelectedJob((current) => current ? nextJobs.find((job) => job.id === current.id) ?? current : current);
      }
    };
    
    fetchJobs();
    const sub = supabase.channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">Job Explorer</h2>
          <p className="text-slate-400 mt-2">View real-time job states and lifecycles.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedJob ? (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <button onClick={() => setSelectedJob(null)} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              <ChevronLeft size={20} /> Back to List
            </button>
            
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <h3 className="text-2xl font-bold text-white mb-2">Job {selectedJob.id.substring(0,8)}</h3>
              <p className="text-slate-400 mb-8">Queue: {selectedJob.queues?.name} | Type: {selectedJob.type} | Attempts: {selectedJob.attempt}</p>
              
              <JobLifecycleDiagram status={selectedJob.status} />

              <div className="mt-8 grid grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <h4 className="text-slate-500 font-medium text-sm mb-2 uppercase tracking-wider">Payload</h4>
                  <pre className="text-slate-300 font-mono text-xs overflow-x-auto p-2">
                    {JSON.stringify(selectedJob.payload, null, 2)}
                  </pre>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <h4 className="text-slate-500 font-medium text-sm mb-2 uppercase tracking-wider">Timestamps</h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between"><span className="text-slate-500">Created:</span> <span className="text-slate-300">{new Date(selectedJob.created_at).toLocaleString()}</span></p>
                    {selectedJob.scheduled_at && <p className="flex justify-between"><span className="text-slate-500">Scheduled:</span> <span className="text-slate-300">{new Date(selectedJob.scheduled_at).toLocaleString()}</span></p>}
                    {selectedJob.claimed_at && <p className="flex justify-between"><span className="text-slate-500">Claimed:</span> <span className="text-slate-300">{new Date(selectedJob.claimed_at).toLocaleString()}</span></p>}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden"
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Job ID</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Queue</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((job) => (
                  <tr key={job.id} onClick={() => setSelectedJob(job)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-mono text-xs text-indigo-300 group-hover:text-indigo-200">{job.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-slate-200">{job.queues?.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full 
                        ${job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                          job.status === 'failed' || job.status === 'dead_letter' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                          job.status === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                          job.status === 'claimed' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{Math.floor((now - new Date(job.created_at).getTime()) / 1000)}s ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
