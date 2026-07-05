"use client"
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const router = useRouter();

  const handleAuth = async (authEmail: string, authPass: string, authName?: string, isLoginForm: boolean = true) => {
    setLoading(true);
    try {
      let res;
      if (isLoginForm) {
        res = await api.login({ email: authEmail, password: authPass });
      } else {
        res = await api.register({ email: authEmail, password: authPass, name: authName });
      }
      
      setAuthToken(res.token);
      toast.success(isLoginForm ? 'Welcome back!' : 'Account created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuth(email, password, name, isLogin);
  };

  const handleDefaultLogin = () => {
    handleAuth('a@gmail.com', 'bala', 'Default User', true);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#FAFAF9] p-4 md:p-8">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10 md:mb-12">
          <motion.h1 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 drop-shadow-sm mb-2"
          >
            LOCKSTEP
          </motion.h1>
          <p className="text-slate-500 font-medium">Distributed Job Scheduler</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start relative z-10">
          
          {/* Left Column: Login Form */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-[#E7E5E4] rounded-3xl p-8 shadow-sm relative overflow-hidden"
          >
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

              <div className="pt-2 flex gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-3.5 px-4 bg-[#5B4FE8] hover:bg-[#4a3fcc] text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm flex justify-center items-center"
                >
                  {loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>

                <button 
                  type="button"
                  onClick={handleDefaultLogin}
                  disabled={loading}
                  className="flex-1 py-3.5 px-4 bg-[#FAFAF9] border-2 border-[#E7E5E4] hover:border-[#5B4FE8] text-slate-700 rounded-xl font-bold transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  Default Sign In
                </button>
              </div>
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
          </motion.div>

          {/* Right Column: Auth Explainer */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-[#E7E5E4] rounded-3xl overflow-hidden shadow-sm flex flex-col h-full"
          >
            {/* Mobile Toggle */}
            <div 
              className="p-6 border-b border-[#E7E5E4] flex justify-between items-center md:cursor-default cursor-pointer bg-[#FAFAF9] md:bg-white"
              onClick={() => setShowExplainer(!showExplainer)}
            >
              <h3 className="text-xl font-bold text-slate-900">How login works</h3>
              <div className="md:hidden text-slate-500">
                {showExplainer ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            <div className={`p-6 md:p-8 flex-1 ${showExplainer ? 'block' : 'hidden md:block'}`}>
              <p className="text-slate-600 mb-6 leading-relaxed text-sm md:text-base">
                Requests in Lockstep are authenticated via JWTs verified against Supabase Auth (GoTrue). The token's <code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">sub</code> claim is extracted and attached to each request to securely identify the calling user.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#5B4FE8]/10 text-[#5B4FE8] flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">1</div>
                  <p className="text-slate-700 text-sm leading-relaxed">Login submitted <span className="text-slate-400 mx-1">→</span> Supabase issues a signed <code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">JWT</code></p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#5B4FE8]/10 text-[#5B4FE8] flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">2</div>
                  <p className="text-slate-700 text-sm leading-relaxed">Token sent as a <code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">Bearer</code> header on every subsequent request</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#5B4FE8]/10 text-[#5B4FE8] flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">3</div>
                  <p className="text-slate-700 text-sm leading-relaxed">API verifies the signature and resolves the user's identity and org/role before allowing any action</p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E7E5E4]">
                <h4 className="text-sm font-bold text-slate-900 mb-2">Authorization</h4>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Every request is also checked against the caller's organization membership and role (<code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">owner</code>, <code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">admin</code>, or <code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">member</code>) before touching any resource.
                </p>
                <Link href="/docs" className="text-sm text-[#5B4FE8] hover:text-[#4a3fcc] font-medium transition-colors">
                  Read the full security documentation &rarr;
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
