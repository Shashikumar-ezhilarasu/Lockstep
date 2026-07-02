"use client"

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Play, Pause, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Queue = {
  id: string;
  name: string;
  status: string;
  priority: number;
  concurrency_limit: number;
  total_jobs: number;
};

type Org = { id: string; name: string };
type Project = { id: string; name: string };

function CreateJobModal({ queueId, onClose }: { queueId: string, onClose: () => void }) {
  const [type, setType] = useState('immediate');
  const [handler, setHandler] = useState('sleep_simulate');
  const [ms, setMs] = useState('1000');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = { type, payload: { handler, ms: parseInt(ms, 10) } };
      if (type === 'delayed') payload.delay_ms = 5000;
      await api.createJob(queueId, payload);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create job');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h3 className="text-xl font-bold text-white">Create New Job</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Job Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200">
              <option value="immediate">Immediate</option>
              <option value="delayed">Delayed (5s)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Handler Function</label>
            <select value={handler} onChange={e => setHandler(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200">
              <option value="sleep_simulate">Simulate Work (Sleep)</option>
              <option value="fail_simulate">Simulate Failure</option>
            </select>
          </div>
          {handler === 'sleep_simulate' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Execution Time (ms)</label>
              <input type="number" value={ms} onChange={e => setMs(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200" />
            </div>
          )}
          <button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors">
            Dispatch Job
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function CreateQueueModal({ projectId, onClose, onCreated }: { projectId: string, onClose: () => void, onCreated: () => void }) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createQueue(projectId, {
        name,
        priority: parseInt(priority, 10),
        concurrency_limit: 10,
        retry_policy: {
          strategy: 'exponential',
          base_delay_ms: 1000,
          multiplier: 2,
          max_attempts: 3,
          max_delay_ms: 30000,
        },
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h3 className="text-xl font-bold text-white">Create New Queue</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Queue Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200" placeholder="e.g. email-sending" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Priority</label>
            <input type="number" value={priority} onChange={e => setPriority(e.target.value)} required min="1" max="100" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200" />
          </div>
          <button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors">
            Create Queue
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [showCreateQueue, setShowCreateQueue] = useState<boolean>(false);

  const ensureProject = useCallback(async () => {
    const orgResponse = await api.getOrgs() as { data: Org[] };
    let org = orgResponse.data[0];
    if (!org) {
      const createdOrg = await api.createOrg({ name: 'Default Organization' }) as { data: Org };
      org = createdOrg.data;
    }

    const projectResponse = await api.getProjects(org.id) as { data: Project[] };
    let project = projectResponse.data[0];
    if (!project) {
      const createdProject = await api.createProject(org.id, { name: 'Default Project' }) as { data: Project };
      project = createdProject.data;
    }

    setProjectId(project.id);
    return project.id;
  }, []);

  const fetchQueues = useCallback(async () => {
    const activeProjectId = projectId ?? await ensureProject();
    const response = await api.getProjectQueues(activeProjectId) as { data: Queue[] };
    setQueues(response.data);
  }, [ensureProject, projectId]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchQueues();
    }, 0);
    const timer = window.setInterval(fetchQueues, 5000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(timer);
    };
  }, [fetchQueues]);

  const handleToggle = async (queueId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') await api.pauseQueue(queueId);
      else await api.resumeQueue(queueId);
      fetchQueues();
    } catch (e) {
      console.error(e);
      alert('Failed to toggle queue. Is the backend running?');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">Queue Management</h2>
          <p className="text-slate-400 mt-2">Monitor, pause, and dispatch jobs to queues.</p>
        </div>
        <button 
          onClick={() => setShowCreateQueue(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} /> Create Queue
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {queues.map((q) => (
          <div key={q.id} className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-lg flex justify-between items-center group hover:border-indigo-500/50 transition-all">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-white">{q.name}</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${q.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  {q.status}
                </span>
              </div>
              <div className="flex gap-6 mt-4 text-sm text-slate-400">
                <p>Priority: <span className="text-slate-200 font-mono">{q.priority}</span></p>
                <p>Concurrency: <span className="text-slate-200 font-mono">{q.concurrency_limit}</span></p>
                <p>Jobs Processed: <span className="text-slate-200 font-mono">{q.total_jobs}</span></p>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowModal(q.id)}
                className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 font-medium rounded-lg flex items-center gap-2 transition-colors border border-indigo-500/30"
              >
                <Plus size={18} /> New Job
              </button>
              
              {q.status === 'active' ? (
                <button onClick={() => handleToggle(q.id, q.status)} className="p-2 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 text-slate-300 transition-colors border border-slate-700">
                  <Pause size={20} />
                </button>
              ) : (
                <button onClick={() => handleToggle(q.id, q.status)} className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 transition-colors border border-slate-700">
                  <Play size={20} />
                </button>
              )}
            </div>
          </div>
        ))}
        {queues.length === 0 && (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-white/5 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <Plus size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Queues Found</h3>
            <p className="text-slate-400 max-w-md">Create your first queue to start dispatching and processing jobs.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <CreateJobModal queueId={showModal} onClose={() => setShowModal(null)} />}
        {showCreateQueue && projectId && <CreateQueueModal projectId={projectId} onCreated={fetchQueues} onClose={() => setShowCreateQueue(false)} />}
      </AnimatePresence>
    </div>
  );
}
