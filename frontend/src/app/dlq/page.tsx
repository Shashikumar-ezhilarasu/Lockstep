"use client"

import { useState } from 'react';
import { api } from '@/lib/api';
import { RotateCw, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

type DlqItem = {
  id: string;
  jobId: string;
  failureReason: string;
  attemptsMade: number;
  originalPayload: unknown;
  movedAt: string;
};

export default function DLQPage() {
  const queryClient = useQueryClient();
  const [requeuing, setRequeuing] = useState<string | null>(null);

  const { data: dlqItems = [] } = useQuery({
    queryKey: ['dlq'],
    queryFn: async () => {
      const res = await api.getDlq() as { data: DlqItem[] };
      return res.data;
    },
    refetchInterval: 5000,
  });

  const requeueMutation = useMutation({
    mutationFn: (id: string) => api.requeueDlq(id),
    onMutate: (id) => setRequeuing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
      toast.success('Job requeued successfully!');
    },
    onError: () => toast.error('Failed to requeue job.'),
    onSettled: () => setRequeuing(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDlq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
      toast.success('DLQ entry deleted.');
    },
    onError: () => toast.error('Failed to delete DLQ entry.'),
  });

  const handleRequeue = (dlqId: string) => requeueMutation.mutate(dlqId);
  const handleDelete = (dlqId: string) => deleteMutation.mutate(dlqId);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-4">
          Dead Letter Queue
          <span className="px-3 py-1 text-sm bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full font-bold">
            {dlqItems.length} items
          </span>
        </h2>
        <p className="text-slate-400 mt-2">Manage jobs that permanently failed their retry policies.</p>
      </div>

      <div className="grid gap-6">
        <AnimatePresence>
          {dlqItems.map((item) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              className="p-6 bg-white/5 backdrop-blur-md border border-rose-900/30 rounded-2xl shadow-lg hover:border-rose-700/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white font-mono">Job ID: {item.jobId}</h3>
                    <p className="text-rose-400 text-sm mt-1 font-medium bg-rose-500/10 inline-block px-2 py-1 rounded">{item.failureReason}</p>
                    <div className="flex gap-4 mt-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <p>Attempts: <span className="text-white">{item.attemptsMade}</span></p>
                      <p>Moved: <span className="text-white">{new Date(item.movedAt).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleRequeue(item.id)}
                    disabled={requeuing === item.id}
                    className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 text-sm font-bold tracking-wide rounded-lg flex items-center gap-2 transition-colors border border-indigo-500/30 disabled:opacity-50"
                  >
                    <RotateCw size={16} className={requeuing === item.id ? 'animate-spin' : ''} /> 
                    {requeuing === item.id ? 'Requeuing...' : 'Requeue'}
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-white/10 hover:border-rose-500/30"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-slate-950/80 rounded-xl border border-white/5 overflow-x-auto">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Original Payload</p>
                <pre className="text-sm text-slate-300 font-mono">
                  {JSON.stringify(item.originalPayload, null, 2)}
                </pre>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {dlqItems.length === 0 && (
          <div className="p-16 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <RotateCw size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">DLQ is empty</h3>
            <p className="text-slate-400">All jobs are processing healthily. No dead letters found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
