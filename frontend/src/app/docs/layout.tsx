import DocsSidebar from '@/components/DocsSidebar';
import DocsTOC from '@/components/DocsTOC';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#FAFAF9] text-slate-900 selection:bg-[#5B4FE8]/10 selection:text-[#5B4FE8]">
      <DocsSidebar />
      <div className="flex-1 flex min-w-0">
        <main className="flex-1 max-w-4xl px-8 py-12 md:px-12 md:py-16 mx-auto w-full">
          {children}
        </main>
        <DocsTOC />
      </div>
    </div>
  );
}
