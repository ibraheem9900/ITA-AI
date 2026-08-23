const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';

const loadingTexts = [
  'Searching the web...',
  'Analyzing results...',
  'Thinking about your question...',
  'Gathering information...',
  'Processing your request...',
  'Finding the best answer...',
];

export default function LoadingMessage() {
  const randomText = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];

  return (
    <div className="flex gap-3 sm:gap-4 px-4 sm:px-6 py-4 bg-gradient-to-r from-gray-900/60 to-blue-950/20 animate-slide-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden">
        <img src={APP_LOGO} alt="ITA AI" className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-cyan-400">ITA AI</p>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-gray-500 animate-pulse">{randomText}</span>
        </div>
      </div>
    </div>
  );
}
