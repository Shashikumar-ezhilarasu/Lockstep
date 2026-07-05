export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#FAFAF9]/80 backdrop-blur-sm z-[9999]">
      <div className="flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-4 h-4 bg-[#2dd4bf] rounded-full"
            style={{
              animation: `pulse-dot 1.4s infinite ease-in-out both`,
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
