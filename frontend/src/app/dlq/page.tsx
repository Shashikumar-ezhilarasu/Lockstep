"use client"

import { useState } from 'react';
import { api } from '@/lib/api';
import { RotateCw, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

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
    <div className="p-8 space-y-8 bg-[#FAFAF9] min-h-screen">
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-4">
          Dead Letter Queue
          <span className="px-3 py-1 text-sm bg-rose-100 text-rose-700 border border-rose-200 rounded-full font-bold">
            {dlqItems.length} items
          </span>
        </h2>
        <p className="text-slate-500 mt-2">Manage jobs that permanently failed their retry policies.</p>
      </div>

      <div className="grid gap-6">
        <AnimatePresence>
          {dlqItems.map((item) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              className="p-6 bg-white border border-[#E7E5E4] rounded-2xl shadow-sm hover:shadow-md hover:border-rose-200 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 font-mono">
                      Job ID: <Link href={`/jobs?job_id=${item.jobId}`} className="text-[#5B4FE8] hover:text-[#4a3fcc] transition-colors underline decoration-[#5B4FE8]/30 underline-offset-4">{item.jobId}</Link>
                    </h3>
                    <p className="text-rose-700 text-sm mt-1 font-medium bg-rose-50 border border-rose-100 inline-block px-2 py-1 rounded">{item.failureReason}</p>
                    <div className="flex gap-4 mt-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <p>Attempts: <span className="text-slate-900 font-mono">{item.attemptsMade}</span></p>
                      <p>Moved: <span className="text-slate-900 font-mono">{new Date(item.movedAt).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleRequeue(item.id)}
                    disabled={requeuing === item.id}
                    className="px-4 py-2 bg-[#FAFAF9] hover:bg-slate-100 text-[#5B4FE8] text-sm font-bold tracking-wide rounded-lg flex items-center gap-2 transition-colors border border-[#E7E5E4] disabled:opacity-50"
                  >
                    <RotateCw size={16} className={requeuing === item.id ? 'animate-spin' : ''} /> 
                    {requeuing === item.id ? 'Requeuing...' : 'Requeue'}
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-[#E7E5E4] hover:border-rose-200"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-[#FAFAF9] rounded-xl border border-[#E7E5E4] overflow-x-auto">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Original Payload</p>
                <pre className="text-sm text-slate-700 font-mono">
                  {JSON.stringify(item.originalPayload, null, 2)}
                </pre>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {dlqItems.length === 0 && (
          <div className="p-16 flex flex-col items-center justify-center text-center border border-dashed border-[#E7E5E4] rounded-2xl bg-white">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
              <RotateCw size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">DLQ is empty</h3>
            <p className="text-slate-500">All jobs are processing healthily. No dead letters found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
