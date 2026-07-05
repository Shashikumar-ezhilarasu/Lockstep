"use client"
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let res;
      if (isLogin) {
        res = await api.login({ email, password });
      } else {
        res = await api.register({ email, password, name });
      }
      
      setAuthToken(res.token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#FAFAF9]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-4xl font-black tracking-tight text-slate-900 drop-shadow-sm mb-2"
          >
            LOCKSTEP
          </motion.h1>
          <p className="text-slate-500 font-medium">Distributed Job Scheduler</p>
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-3xl p-8 shadow-sm relative overflow-hidden">
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="w-full bg-[#FAFAF9] border border-[#E7E5E4] focus:border-[#5B4FE8] rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm"
                    placeholder="Acme Corp"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#FAFAF9] border border-[#E7E5E4] focus:border-[#5B4FE8] rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#FAFAF9] border border-[#E7E5E4] focus:border-[#5B4FE8] rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#5B4FE8] hover:bg-[#4a3fcc] text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-4 shadow-sm"
            >
              {loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-6 text-center relative z-10">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
