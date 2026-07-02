"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { ChevronLeft, RotateCcw, Ban, FileText, Calendar, Shield, Cpu, RefreshCw } from 'lucide-react';
import JobLifecycleDiagram, { type JobLifecycleStatus } from '@/components/JobLifecycleDiagram';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

type Job = {
  id: string;
  status: JobLifecycleStatus;
  type: string;
  attempt: number;
  payload: unknown;
  created_at: string;
  scheduled_at?: string;
  claimed_at?: string;
  queue_id: string;
  queues?: { name?: string };
};

type LogRow = {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [queueFilter, setQueueFilter] = useState<string>('all');

  const fetchJobs = async () => {
    setIsRefreshing(true);
    const { data } = await supabase.from('jobs').select('*, queues(name)').order('created_at', { ascending: false }).limit(50);
    if (data) {
      const nextJobs = data as Job[];
      setJobs(nextJobs);
      setSelectedJob((current) => current ? nextJobs.find((job) => job.id === current.id) ?? current : current);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
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

  // Fetch job logs when a job is selected
  useEffect(() => {
    if (!selectedJob) {
      setLogs([]);
      return;
    }
    const fetchLogs = async () => {
      try {
        const res = await api.getJobLogs(selectedJob.id) as { data: LogRow[] };
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, [selectedJob]);

  const handleCancel = async (jobId: string) => {
    try {
      await api.cancelJob(jobId);
      toast.success('Job cancelled successfully!');
      fetchJobs();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to cancel job: ' + (err.message || err));
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await api.retryJob(jobId);
      toast.success('Job queued for retry!');
      fetchJobs();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to retry job: ' + (err.message || err));
    }
  };

  // Get unique queue names for filtering
  const uniqueQueueNames = Array.from(new Set(jobs.map(j => j.queues?.name).filter(Boolean))) as string[];

  // Filtered jobs
  const filteredJobs = jobs.filter(job => {
    const matchStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchQueue = queueFilter === 'all' || job.queues?.name === queueFilter;
    return matchStatus && matchQueue;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Job Explorer
            {isRefreshing && <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />}
          </h2>
          <p className="text-slate-400 mt-2">View real-time job states, logs, and lifecycles.</p>
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
            <button 
              onClick={() => setSelectedJob(null)} 
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <ChevronLeft size={20} /> Back to List
            </button>
            
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    Job {selectedJob.id}
                  </h3>
                  <p className="text-slate-400 mt-1">
                    Queue: <span className="text-indigo-300 font-medium">{selectedJob.queues?.name || 'Unknown'}</span> | Type: <span className="capitalize">{selectedJob.type}</span> | Attempts: <span className="font-semibold text-slate-200">{selectedJob.attempt}</span>
                  </p>
                </div>
                
                {/* Actions Panel */}
                <div className="flex items-center gap-3">
                  {['queued', 'scheduled'].includes(selectedJob.status) && (
                    <button 
                      onClick={() => handleCancel(selectedJob.id)}
                      className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold flex items-center gap-2 transition-colors"
                    >
                      <Ban size={16} /> Cancel Job
                    </button>
                  )}
                  {['failed', 'cancelled'].includes(selectedJob.status) && (
                    <button 
                      onClick={() => handleRetry(selectedJob.id)}
                      className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw size={16} /> Retry Job
                    </button>
                  )}
                </div>
              </div>
              
              <JobLifecycleDiagram status={selectedJob.status} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl space-y-3">
                  <h4 className="text-slate-400 font-semibold text-sm flex items-center gap-2 uppercase tracking-wider">
                    <Cpu size={16} className="text-indigo-400" /> Payload
                  </h4>
                  <pre className="text-slate-300 font-mono text-xs overflow-x-auto p-3 bg-black/30 rounded-lg max-h-[250px]">
                    {JSON.stringify(selectedJob.payload, null, 2)}
                  </pre>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl space-y-3">
                  <h4 className="text-slate-400 font-semibold text-sm flex items-center gap-2 uppercase tracking-wider">
                    <Calendar size={16} className="text-indigo-400" /> Lifecycle Events
                  </h4>
                  <div className="space-y-3 text-sm">
                    <p className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-slate-500">Created:</span> 
                      <span className="text-slate-300">{new Date(selectedJob.created_at).toLocaleString()}</span>
                    </p>
                    {selectedJob.scheduled_at && (
                      <p className="flex justify-between items-center py-1.5 border-b border-white/5">
                        <span className="text-slate-500">Scheduled for:</span> 
                        <span className="text-slate-300">{new Date(selectedJob.scheduled_at).toLocaleString()}</span>
                      </p>
                    )}
                    {selectedJob.claimed_at && (
                      <p className="flex justify-between items-center py-1.5 border-b border-white/5">
                        <span className="text-slate-500">Claimed at:</span> 
                        <span className="text-slate-300">{new Date(selectedJob.claimed_at).toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Execution Logs Section */}
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl space-y-4">
                <h4 className="text-slate-400 font-semibold text-sm flex items-center gap-2 uppercase tracking-wider">
                  <FileText size={16} className="text-indigo-400" /> Chronological Execution Logs
                </h4>
                {logs.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 italic">No execution logs recorded yet for this job.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 font-mono text-xs">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-2.5 rounded hover:bg-white/5 transition-colors border-l-2 border-slate-700">
                        <span className="text-slate-500 shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 
                          ${log.level === 'error' ? 'bg-rose-500/20 text-rose-400' : 
                            log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' : 
                            'bg-slate-700/35 text-slate-300'}`}>
                          {log.level}
                        </span>
                        <span className="text-slate-300 break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)} 
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All States</option>
                  <option value="queued">Queued</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="dead_letter">Dead Letter</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Queue:</span>
                <select 
                  value={queueFilter} 
                  onChange={e => setQueueFilter(e.target.value)} 
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Queues</option>
                  {uniqueQueueNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="ml-auto text-xs text-slate-400 font-medium">
                Showing <span className="text-indigo-400 font-bold">{filteredJobs.length}</span> of {jobs.length} jobs
              </div>
            </div>

            {/* Jobs List Table */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
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
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 italic">
                        No jobs match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr 
                        key={job.id} 
                        onClick={() => setSelectedJob(job)} 
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-indigo-300 group-hover:text-indigo-200">
                          {job.id}
                        </td>
                        <td className="px-6 py-4 text-slate-200">{job.queues?.name || 'Unknown'}</td>
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
                        <td className="px-6 py-4 text-slate-500">
                          {Math.floor((now - new Date(job.created_at).getTime()) / 1000)}s ago
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
