export const VoiceWaveform = () => {
  return (
    <div className="inline-flex items-center gap-0.5 h-5">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-red-400"
          style={{
            animation: 'waveform 0.8s ease-in-out infinite',
            animationDelay: `${[0, 0.1, 0.2, 0.3, 0.15][i]}s`,
            height: '8px',
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0%, 100% { height: 8px; }
          50% { height: 20px; }
        }
      `}</style>
    </div>
  );
};
