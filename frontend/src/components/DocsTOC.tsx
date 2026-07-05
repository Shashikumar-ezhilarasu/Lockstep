"use client";
import { useEffect, useState } from 'react';

type Heading = {
  id: string;
  text: string;
};

export default function DocsTOC() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Small delay to ensure the page has rendered
    const timer = setTimeout(() => {
      const elements = Array.from(document.querySelectorAll('main h2'));
      const parsed = elements.map((elem) => {
        if (!elem.id) {
          elem.id = elem.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
        }
        return {
          id: elem.id,
          text: elem.textContent || '',
        };
      });
      setHeadings(parsed);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0px 0px -80% 0px' }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="hidden lg:block w-64 shrink-0 px-6 py-12 sticky top-0 h-screen overflow-y-auto">
      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">On this page</h4>
      <nav className="space-y-2">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`block text-sm transition-colors ${activeId === heading.id ? 'text-[#5B4FE8] font-medium' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
