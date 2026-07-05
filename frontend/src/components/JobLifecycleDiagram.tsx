"use client"
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';

export type JobLifecycleStatus = 'queued' | 'scheduled' | 'claimed' | 'running' | 'completed' | 'failed' | 'dead_letter';

interface JobLifecycleProps {
  status: JobLifecycleStatus;
}

export default function JobLifecycleDiagram({ status }: JobLifecycleProps) {
  const nodes = [
    { id: 'queued', label: 'Queued', icon: Clock },
    { id: 'claimed', label: 'Claimed', icon: PlayCircle },
    { id: 'running', label: 'Running', icon: PlayCircle },
    { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];

  const getStatusIndex = () => {
    if (status === 'queued' || status === 'scheduled') return 0;
    if (status === 'claimed') return 1;
    if (status === 'running') return 2;
    if (status === 'completed' || status === 'failed' || status === 'dead_letter') return 3;
    return 0;
  };

  const currentIndex = getStatusIndex();
  const isFailed = status === 'failed' || status === 'dead_letter';

  return (
    <div className="w-full p-8 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4] relative overflow-hidden">
      {/* Background Track */}
      <div className="absolute top-1/2 left-12 right-12 h-1 bg-slate-200 -translate-y-1/2 rounded-full z-0" />
      
      {/* Active Progress Track */}
      <motion.div 
        className={`absolute top-1/2 left-12 h-1 -translate-y-1/2 rounded-full z-0 ${isFailed ? 'bg-rose-500' : 'bg-[#5B4FE8]'}`}
        initial={{ width: '0%' }}
        animate={{ width: `${(currentIndex / (nodes.length - 1)) * 100}%` }}
        transition={{ duration: 0.5, type: 'spring', damping: 20 }}
      />

      <div className="relative z-10 flex justify-between items-center">
        {nodes.map((node, i) => {
          const isActive = i === currentIndex;
          const isPast = i < currentIndex;
          const isEndFailed = i === 3 && isFailed;
          const Icon = isEndFailed ? XCircle : node.icon;

          return (
            <div key={node.id} className="flex flex-col items-center gap-3">
              <motion.div 
                className={`w-14 h-14 rounded-full flex items-center justify-center border-4 relative ${
                  isActive && !isEndFailed ? 'bg-white border-[#5B4FE8] text-[#5B4FE8]' : 
                  isEndFailed ? 'bg-white border-rose-500 text-rose-500' :
                  isPast ? 'bg-[#5B4FE8] border-[#5B4FE8] text-white' : 
                  'bg-white border-slate-200 text-slate-400'
                }`}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  boxShadow: isActive ? (isEndFailed ? '0 0 20px rgba(244, 63, 94, 0.2)' : '0 0 20px rgba(91, 79, 232, 0.2)') : '0 0 0px rgba(0,0,0,0)'
                }}
              >
                {isActive && (
                  <motion.div 
                    className={`absolute inset-0 rounded-full border-2 ${isEndFailed ? 'border-rose-400' : 'border-[#5B4FE8]'}`}
                    animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
                <Icon size={24} />
              </motion.div>
              <span className={`text-sm font-semibold ${isActive ? 'text-slate-900' : isPast ? 'text-slate-700' : 'text-slate-500'}`}>
                {isEndFailed ? 'Failed' : node.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
