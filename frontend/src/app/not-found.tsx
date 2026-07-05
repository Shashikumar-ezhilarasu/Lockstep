import Link from 'next/link';
import { Cat, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full text-center space-y-10 relative">
        
        {/* 404 Graphic */}
        <div className="relative flex items-center justify-center h-48">
          {/* Numbers */}
          <h1 className="text-[10rem] md:text-[12rem] leading-none font-black text-slate-800 tracking-tighter flex gap-8">
            <span>4</span>
            <span className="opacity-0">0</span>
            <span>4</span>
          </h1>
          
          {/* Cat in the zero */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pb-4">
            <div className="bg-lime-300 w-32 h-32 md:w-40 md:h-40 rounded-full border-[10px] border-slate-800 shadow-[8px_8px_0px_rgba(30,41,59,1)] flex items-center justify-center animate-[bounce_4s_ease-in-out_infinite]">
              <Cat size={64} className="text-slate-800 drop-shadow-sm" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        
        <div className="space-y-4 relative z-20">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">You've found a stray page!</h2>
          <p className="text-lg text-slate-600 max-w-sm mx-auto font-medium">It seems this page wandered off to play with some yarn and got lost.</p>
        </div>
        
        <div className="flex justify-center pt-4 relative z-20">
          <Link href="/" className="flex items-center gap-3 bg-slate-800 text-white px-8 py-4 rounded-full font-bold hover:bg-slate-900 transition-all hover:-translate-y-1 hover:shadow-[0px_8px_0px_rgba(163,230,53,1)] shadow-[0px_4px_0px_rgba(163,230,53,1)]">
            <Home size={20} /> Back to Safety
          </Link>
        </div>
      </div>
    </div>
  );
}
