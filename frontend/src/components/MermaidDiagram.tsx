"use client";
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontFamily: 'inherit',
    primaryColor: '#FAFAF9',
    primaryBorderColor: '#E7E5E4',
    lineColor: '#94A3B8',
    secondaryColor: '#5B4FE8',
    tertiaryColor: '#fff',
  }
});

export default function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart).then((result) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = result.svg;
        }
      }).catch((e) => {
        console.error("Mermaid parsing error", e);
      });
    }
  }, [chart]);

  return (
    <div className="my-8 p-6 bg-white border border-[#E7E5E4] rounded-xl shadow-sm flex items-center justify-center overflow-x-auto">
      <div ref={containerRef} className="mermaid-diagram" />
    </div>
  );
}
