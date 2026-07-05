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
    <div className="p-8 space-y-8 bg-[#FAFAF9] min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Worker Monitor</h2>
          <p className="text-slate-500 mt-2">Real-time status of all execution nodes.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors font-medium">
          <input 
            type="checkbox" 
            checked={hideOffline} 
            onChange={(e) => setHideOffline(e.target.checked)} 
            className="rounded border-[#E7E5E4] bg-white text-[#5B4FE8] focus:ring-[#5B4FE8]"
          />
          Hide Offline
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.filter(w => !hideOffline || w.status !== 'offline').map((worker) => (
          <Link key={worker.id} href={`/jobs?worker=${worker.id}`} className="block">
            <div className="p-6 bg-white border border-[#E7E5E4] rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md hover:border-[#5B4FE8]/30 transition-all cursor-pointer">
              <div className={`absolute top-0 left-0 w-1 h-full ${worker.status === 'offline' ? 'bg-slate-300' : worker.status === 'busy' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg text-slate-500">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{worker.hostname}</h3>
                  <p className="text-xs font-mono font-medium text-[#5B4FE8]">{worker.id.substring(0,8)}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${worker.status === 'offline' ? 'bg-slate-100 text-slate-600 border border-slate-200' : worker.status === 'busy' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                {worker.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1 font-medium uppercase tracking-wider">Capacity</p>
                <p className="text-slate-900 font-medium font-mono">{worker.capacity} <span className="font-sans font-normal text-slate-500 text-xs">concurrent</span></p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1 font-medium uppercase tracking-wider">Uptime</p>
                <p className="text-slate-900 font-medium font-mono">
                  {worker.started_at ? Math.floor((now - new Date(worker.started_at).getTime()) / 60000) : 0} <span className="font-sans font-normal text-slate-500 text-xs">mins</span>
                </p>
              </div>
            </div>
          </div>
          </Link>
        ))}

        {workers.length === 0 && (
          <div className="col-span-full p-12 text-center border border-dashed border-[#E7E5E4] bg-white rounded-xl text-slate-500">
            No active workers found. Start a worker process to see it here.
          </div>
        )}
      </div>
    </div>
  );
}
