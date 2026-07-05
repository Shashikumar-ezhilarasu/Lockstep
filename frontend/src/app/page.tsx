"use client";
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useInView, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, Lock, Repeat, AlertTriangle, GitMerge, CheckCircle2, PlayCircle, Clock } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';

export default function LandingPage() {
  return (
    <div className="absolute inset-0 bg-[#FAFAF9] text-slate-900 overflow-y-auto z-[100] font-sans selection:bg-[#5B4FE8]/10 selection:text-[#5B4FE8]">
      {/* 1. Header */}
      <header className="sticky top-0 z-50 bg-[#FAFAF9]/80 backdrop-blur-md border-b border-[#E7E5E4]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight text-slate-900">Lockstep</div>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/docs" className="text-slate-600 hover:text-slate-900 transition-colors">Docs</Link>
            <Link href="https://github.com/Shashikumar-ezhilarasu/Lockstep" className="text-slate-600 hover:text-slate-900 transition-colors">GitHub</Link>
            <Link href="/login" className="bg-[#5B4FE8] text-white px-4 py-2 rounded-md hover:bg-[#4a3fcc] transition-colors shadow-sm">
              View dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-32 space-y-32">
        {/* 2. Hero */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <ScrollReveal delay={0}>
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              Distributed job scheduling with a concurrency guarantee you can actually test.
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-normal">
              Postgres-backed, no Redis or RabbitMQ required. Atomic claiming under heavy concurrent worker load without deadlocks.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={2}>
            <div className="flex items-center justify-center gap-4 pt-4 relative z-20">
              <TiltButton href="/login">
                View the dashboard <ArrowRight size={18} />
              </TiltButton>
              <Link href="/docs" className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-md font-medium border border-[#E7E5E4] hover:bg-slate-50 transition-all shadow-sm">
                Read the docs
              </Link>
            </div>
          </ScrollReveal>

          {/* Hero Animation Strip */}
          <ScrollReveal delay={3}>
            <div className="pt-16 w-full overflow-hidden relative mask-edges">
              <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FAFAF9] to-transparent z-10"></div>
              <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#FAFAF9] to-transparent z-10"></div>
              
              <motion.div 
                className="flex gap-4 items-center whitespace-nowrap py-4"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
              >
                {/* Double the items for seamless looping */}
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <JobCard status="queued" id={`job_${i}a1`} delay={0} />
                    <JobCard status="running" id={`job_${i}b2`} delay={1} />
                    <JobCard status="completed" id={`job_${i}c3`} delay={2} />
                    <JobCard status="retrying" id={`job_${i}d4`} delay={3} />
                    <JobCard status="dead-lettered" id={`job_${i}e5`} delay={4} />
                  </div>
                ))}
              </motion.div>
            </div>
          </ScrollReveal>
        </section>

        {/* 3. Proof strip */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ScrollReveal delay={0}><ProofCard icon={<Lock className="text-slate-700" size={24} />} title="Atomic job claiming" desc="SERIALIZABLE isolation with retry-on-conflict, verified against 10 concurrent workers." /></ScrollReveal>
          <ScrollReveal delay={1}><ProofCard icon={<Repeat className="text-slate-700" size={24} />} title="Configurable retries" desc="Fixed, linear, or exponential backoff per queue." /></ScrollReveal>
          <ScrollReveal delay={2}><ProofCard icon={<AlertTriangle className="text-slate-700" size={24} />} title="Dead-letter queue" desc="Permanently failed jobs land here with one-click requeue." /></ScrollReveal>
          <ScrollReveal delay={3}><ProofCard icon={<GitMerge className="text-slate-700" size={24} />} title="Workflow dependencies" desc="Jobs can wait on other jobs to complete before claiming." /></ScrollReveal>
        </section>

        {/* 4. How it works */}
        <section className="space-y-12">
          <ScrollReveal delay={0}>
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
              <p className="text-slate-600 text-lg">A simple API for enqueueing, backed by robust transactional guarantees for execution.</p>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <ScrollReveal delay={1} className="h-full">
              <div className="bg-white border border-[#E7E5E4] rounded-xl p-6 shadow-sm flex flex-col space-y-4 h-full">
                <div className="flex items-center gap-3 border-b border-[#E7E5E4] pb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">1</div>
                  <h3 className="font-medium text-slate-900">Enqueue via API</h3>
                </div>
                <Link href="/docs/api#jobs" className="flex-1 bg-slate-900 rounded-lg p-4 overflow-x-auto text-slate-300 text-sm font-mono leading-relaxed hover:ring-2 hover:ring-[#5B4FE8] transition-all block relative group cursor-pointer">
                  <span className="text-indigo-400">POST</span> /queues/image-processing/jobs<br/>
                  &#123;<br/>
                  &nbsp;&nbsp;<span className="text-sky-300">"payload"</span>: &#123;<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">"userId"</span>: <span className="text-emerald-300">"usr_8f92k"</span>,<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-300">"image"</span>: <span className="text-emerald-300">"s3://bucket/img.jpg"</span><br/>
                  &nbsp;&nbsp;&#125;,<br/>
                  &nbsp;&nbsp;<span className="text-sky-300">"retries"</span>: <span className="text-rose-300">3</span><br/>
                  &#125;
                </Link>
              </div>
            </ScrollReveal>

            {/* Step 2 */}
            <ScrollReveal delay={2} className="h-full">
              <div className="bg-white border border-[#E7E5E4] rounded-xl p-6 shadow-sm flex flex-col space-y-4 h-full">
                <div className="flex items-center gap-3 border-b border-[#E7E5E4] pb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">2</div>
                  <h3 className="font-medium text-slate-900">Workers claim safely</h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-4">
                  <Lock size={32} className="text-[#5B4FE8]" />
                  <p className="text-slate-600 text-sm leading-relaxed">
                    A worker claims the job atomically using <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800 text-xs">FOR UPDATE SKIP LOCKED</span>, respecting queue concurrency limits globally.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Step 3 */}
            <ScrollReveal delay={3} className="h-full">
              <div className="bg-white border border-[#E7E5E4] rounded-xl p-6 shadow-sm flex flex-col space-y-4 h-full">
                <div className="flex items-center gap-3 border-b border-[#E7E5E4] pb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">3</div>
                  <h3 className="font-medium text-slate-900">Track it live</h3>
                </div>
                <div className="flex-1 border border-[#E7E5E4] rounded-lg bg-[#FAFAF9] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500">job_8f29x</span>
                    <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Completed</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 w-full h-full"></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-auto pt-2 border-t border-[#E7E5E4]">
                    <span>Processed in 1.2s</span>
                    <span>worker_3</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Live Simulation Section */}
        <section className="space-y-8">
          <ScrollReveal delay={0}>
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight">Real-time Visualization</h2>
              <p className="text-slate-600 text-lg">Monitor throughput and queue depth instantly with interactive dashboards.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <LiveSimulationMetrics />
          </ScrollReveal>
        </section>

        {/* 5. Architecture glance */}
        <section>
          <ScrollReveal delay={0}>
            <div className="space-y-8 bg-white border border-[#E7E5E4] rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-center">System Architecture</h2>
              <ArchitectureDiagram />
              <p className="text-center text-slate-500 text-sm">
                Read the full <Link href="/docs/architecture" className="text-[#5B4FE8] hover:underline">architecture documentation</Link> to learn how we prevent deadlocks and enforce global rate limits.
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* 6. Bonus features */}
        <section>
          <ScrollReveal delay={0}>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-3 py-1 bg-white border border-[#E7E5E4] text-slate-600 rounded-full text-sm font-medium shadow-sm">Workflow dependencies</span>
              <span className="px-3 py-1 bg-white border border-[#E7E5E4] text-slate-600 rounded-full text-sm font-medium shadow-sm">Distributed locking</span>
              <span className="px-3 py-1 bg-white border border-[#E7E5E4] text-slate-600 rounded-full text-sm font-medium shadow-sm">Live updates</span>
              <span className="px-3 py-1 bg-white border border-[#E7E5E4] text-slate-600 rounded-full text-sm font-medium shadow-sm">Role-based access control</span>
            </div>
          </ScrollReveal>
        </section>

        {/* 7. Final CTA */}
        <section className="text-center space-y-8 pt-16 pb-16">
          <ScrollReveal delay={0}>
            <h2 className="text-3xl font-semibold tracking-tight">Ready to deploy?</h2>
            <div className="flex items-center justify-center gap-4 pt-4 relative z-20">
              <TiltButton href="/login">
                View the dashboard
              </TiltButton>
              <Link href="/docs" className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-md font-medium border border-[#E7E5E4] hover:bg-slate-50 transition-all shadow-sm">
                Read the docs
              </Link>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="border-t border-[#E7E5E4] py-8 text-center text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
          <Link href="https://github.com/Shashikumar-ezhilarasu/Lockstep" className="hover:text-slate-900 transition-colors">GitHub</Link>
          <Link href="/docs" className="hover:text-slate-900 transition-colors">Documentation</Link>
          <Link href="/docs/api" className="hover:text-slate-900 transition-colors">API Reference</Link>
          <Link href="/docs/architecture" className="hover:text-slate-900 transition-colors">Architecture</Link>
        </div>
        <p>Built by Shashikumar.E</p>
      </footer>
    </div>
  );
}

// Subcomponents

// --- React Bits Components ---

function ScrollReveal({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SpotlightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => { setIsFocused(true); setOpacity(1); };
  const handleBlur = () => { setIsFocused(false); setOpacity(0); };
  const handleMouseEnter = () => { setOpacity(1); };
  const handleMouseLeave = () => { setOpacity(0); };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(91, 79, 232, 0.08), transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

function CountUp({ to, duration = 2 }: { to: number, duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const prefersReducedMotion = useReducedMotion();
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  });
  
  const [display, setDisplay] = useState("0");
  
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(to.toString());
      return;
    }
    if (inView) {
      motionValue.set(to);
    }
  }, [inView, to, motionValue, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    return springValue.on("change", (latest) => {
      setDisplay(Math.floor(latest).toString());
    });
  }, [springValue, prefersReducedMotion]);

  return <span ref={ref}>{display}</span>;
}

function TiltButton({ children, href }: { children: React.ReactNode, href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-3deg", "3deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current || prefersReducedMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      href={href}
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        transformStyle: "preserve-3d",
      }}
      className="flex items-center gap-2 bg-[#5B4FE8] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a3fcc] transition-colors shadow-sm cursor-pointer z-20 relative"
    >
      {children}
    </motion.a>
  );
}

// --- Specific Page Components ---

function ProofCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <SpotlightCard className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm transition-shadow h-full">
      <div className="p-5 h-full">
        <div className="mb-4 bg-[#FAFAF9] border border-[#E7E5E4] w-12 h-12 rounded-lg flex items-center justify-center relative z-10">
          {icon}
        </div>
        <h3 className="font-semibold text-slate-900 mb-2 relative z-10">{title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed relative z-10">{desc}</p>
      </div>
    </SpotlightCard>
  );
}

function JobCard({ status, id, delay }: { status: 'queued' | 'running' | 'completed' | 'retrying' | 'dead-lettered', id: string, delay: number }) {
  const colors = {
    'queued': 'bg-slate-100 text-slate-600 border-slate-200',
    'running': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'retrying': 'bg-amber-50 text-amber-700 border-amber-200',
    'dead-lettered': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const icons = {
    'queued': <Clock size={14} />,
    'running': <PlayCircle size={14} />,
    'completed': <CheckCircle2 size={14} />,
    'retrying': <Repeat size={14} />,
    'dead-lettered': <AlertTriangle size={14} />,
  };

  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg p-3 min-w-[200px] shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">{id}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 capitalize ${colors[status]}`}>
          {icons[status]} {status}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1 relative">
        {status === 'running' && (
          <motion.div 
            className="h-full bg-indigo-500 absolute left-0 top-0" 
            initial={{ width: "0%" }}
            animate={prefersReducedMotion ? { width: "100%" } : { width: "100%" }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Infinity, delay }}
            style={prefersReducedMotion ? { width: "100%" } : {}}
          />
        )}
        {status === 'completed' && <div className="h-full w-full bg-emerald-500" />}
        {status === 'retrying' && <div className="h-full w-full bg-amber-500" />}
        {status === 'dead-lettered' && <div className="h-full w-full bg-rose-500" />}
        {status === 'queued' && <div className="h-full w-0" />}
      </div>
    </div>
  );
}

function LiveSimulationMetrics() {
  const [queues, setQueues] = useState([
    { name: 'image-processing', depth: 45, max: 100 },
    { name: 'email-notifications', depth: 82, max: 100 },
    { name: 'webhooks-out', depth: 12, max: 100 },
  ]);

  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setQueues(current => current.map(q => {
        let change = Math.floor(Math.random() * 15) - 7;
        let newDepth = Math.max(0, Math.min(q.max, q.depth + change));
        return { ...q, depth: newDepth };
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#E7E5E4]">
        <div className="flex gap-8">
           <div className="space-y-1">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jobs Processed</h4>
             <div className="text-3xl font-semibold text-slate-900">~<CountUp to={35} />/s</div>
           </div>
           <div className="space-y-1">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Global Capacity</h4>
             <div className="text-3xl font-semibold text-slate-900"><CountUp to={82} />%</div>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full self-start">
          <div className={`w-2 h-2 rounded-full bg-emerald-500 ${prefersReducedMotion ? '' : 'animate-pulse'}`} />
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Live View</span>
        </div>
      </div>
      
      <div className="space-y-6">
        {queues.map(q => (
          <div key={q.name} className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-mono text-slate-700 font-medium">{q.name}</span>
              <span className="font-mono text-slate-500">{q.depth} pending</span>
            </div>
            <div className="h-3 w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${q.depth > 80 ? 'bg-amber-400' : 'bg-[#5B4FE8]'}`}
                animate={{ width: `${(q.depth / q.max) * 100}%` }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, ease: "linear" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="w-full flex items-center justify-center py-12 overflow-x-auto">
      <div className="min-w-[650px] flex items-center justify-between gap-4">
        
        {/* API */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-16 bg-white border border-[#E7E5E4] rounded-lg shadow-sm flex flex-col items-center justify-center font-medium text-slate-700">
            <span className="text-sm">API</span>
          </div>
        </div>

        <Arrow />

        {/* Postgres */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-24 bg-[#5B4FE8]/5 border border-[#5B4FE8]/20 rounded-xl flex flex-col items-center justify-center gap-2 relative shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#5B4FE8] absolute top-2 right-2" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5B4FE8]">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span className="font-semibold tracking-tight text-[#5B4FE8] text-sm">Postgres</span>
          </div>
        </div>

        <Arrow />

        {/* Workers & Scheduler */}
        <div className="flex flex-col gap-4">
          <div className="w-36 h-12 bg-white border border-[#E7E5E4] rounded-lg shadow-sm flex items-center justify-center font-medium text-slate-700 text-sm">
            Worker Pool
          </div>
          <div className="w-36 h-12 bg-white border border-[#E7E5E4] rounded-lg shadow-sm flex items-center justify-center font-medium text-slate-700 text-sm">
            Scheduler
          </div>
        </div>

        <Arrow />

        {/* Dashboard */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-16 bg-slate-900 border border-slate-800 rounded-lg shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] flex items-center justify-center font-medium text-white">
            <span className="text-sm">Dashboard</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-[#E7E5E4] shrink-0">
      <path d="M0 12H38M38 12L30 4M38 12L30 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
