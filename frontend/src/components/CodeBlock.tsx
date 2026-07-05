"use client";
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export default function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 border border-[#E7E5E4] rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E7E5E4] bg-[#FAFAF9]">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{language}</span>
        <button
          onClick={copyToClipboard}
          className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? <span className="text-emerald-600">Copied</span> : 'Copy'}
        </button>
      </div>
      <div className="text-sm font-mono p-4 overflow-x-auto bg-white">
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
