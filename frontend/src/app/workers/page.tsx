"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Server } from 'lucide-react';
import Link from 'next/link';

type Worker = {
  id: string;
  hostname: string;
  status: string;
  capacity: number;
  started_at?: string;
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [hideOffline, setHideOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const fetchWorkers = async () => {
      const { data } = await supabase.from('workers').select('*');
      if (data) setWorkers(data as Worker[]);
    };
    
    fetchWorkers();

    const sub = supabase
      .channel('workers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, fetchWorkers)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Worker Monitor</h2>
          <p className="text-slate-400 mt-2">Real-time status of all execution nodes.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
          <input 
            type="checkbox" 
            checked={hideOffline} 
            onChange={(e) => setHideOffline(e.target.checked)} 
            className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          Hide Offline
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.filter(w => !hideOffline || w.status !== 'offline').map((worker) => (
          <Link key={worker.id} href={`/jobs?worker=${worker.id}`} className="block">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg relative overflow-hidden group hover:bg-slate-800/80 transition-colors cursor-pointer">
              <div className={`absolute top-0 left-0 w-1 h-full ${worker.status === 'offline' ? 'bg-slate-600' : worker.status === 'busy' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">{worker.hostname}</h3>
                  <p className="text-xs font-mono text-slate-500">{worker.id.substring(0,8)}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${worker.status === 'offline' ? 'bg-slate-800 text-slate-400' : worker.status === 'busy' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {worker.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Capacity</p>
                <p className="text-slate-200 font-medium">{worker.capacity} concurrent</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Uptime</p>
                <p className="text-slate-200 font-medium">
                  {worker.started_at ? Math.floor((now - new Date(worker.started_at).getTime()) / 60000) : 0} mins
                </p>
              </div>
            </div>
          </div>
          </Link>
        ))}

        {workers.length === 0 && (
          <div className="col-span-full p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
            No active workers found. Start a worker process to see it here.
          </div>
        )}
      </div>
    </div>
  );
}
