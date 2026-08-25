import ReactMarkdown from 'react-markdown';
import { Message, MESSAGE_ACTIONS } from '../types/chat';
import { User, ExternalLink, Globe, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
  onAction?: (action: string) => void;
}

const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';

export default function ChatMessage({ message, onAction }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get relevant actions based on message content
  const getRelevantActions = () => {
    const content = message.content.toLowerCase();
    const hasCode = content.includes('```') || content.includes('function') || content.includes('class');
    const hasLongText = message.content.length > 200;
    
    // Always show core actions for AI messages
    const actions = MESSAGE_ACTIONS.filter(action => {
      if (action.id === 'generate-code') return hasCode;
      if (action.id === 'summarize') return hasLongText;
      return true;
    });
    
    return actions.slice(0, 6); // Max 6 actions
  };

  return (
    <div className={`flex gap-4 px-6 py-5 animate-slide-up ${
      isUser 
        ? 'bg-transparent' 
        : 'bg-gradient-to-r from-gray-900/40 via-gray-900/60 to-gray-900/40'
    }`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden ${
        isUser 
          ? 'bg-gradient-to-br from-blue-600 to-cyan-600' 
          : 'bg-gradient-to-br from-slate-800 to-gray-800 border border-gray-700'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <img src={APP_LOGO} alt="ITA AI" className="w-5 h-5" />
        }
      </div>

      <div className="flex-1 min-w-0">
        {/* Message Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            isUser ? 'text-blue-400' : 'text-cyan-400'
          }`}>
            {isUser ? 'YOU' : 'ITA AI'}
          </span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-800/50 text-gray-500 hover:text-cyan-400 transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Message Content */}
        {isUser ? (
          <div className="text-gray-100 leading-relaxed text-sm sm:text-base break-words whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="markdown-body text-sm sm:text-base break-words">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !className;
                  
                  if (isInline) {
                    return (
                      <code className="bg-gray-800/80 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                        {children}
                      </code>
                    );
                  }
                  
                  const codeContent = String(children).replace(/\n$/, '');
                  const language = match ? match[1] : 'code';
                  
                  return (
                    <div className="my-3 rounded-xl overflow-hidden border border-gray-700/50">
                      <div className="flex items-center justify-between bg-gray-800/80 px-4 py-2 border-b border-gray-700/50">
                        <span className="text-xs text-gray-400 font-mono">{language}</span>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(codeContent);
                          }}
                          className="text-xs text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <pre className="bg-gray-900/80 p-4 overflow-x-auto">
                        <code className="text-sm text-gray-100 font-mono" {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 hover:decoration-cyan-300/50 transition-colors"
                    >
                      {children}
                    </a>
                  );
                },
                ul({ children }) {
                  return (
                    <ul className="list-disc list-inside space-y-1 my-2 text-gray-200">
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol className="list-decimal list-inside space-y-1 my-2 text-gray-200">
                      {children}
                    </ol>
                  );
                },
                p({ children }) {
                  return (
                    <p className="my-2 leading-relaxed text-gray-100">{children}</p>
                  );
                },
                h1({ children }) {
                  return <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-base font-semibold text-white mt-2 mb-1">{children}</h3>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-cyan-500/50 pl-4 my-3 italic text-gray-300">
                      {children}
                    </blockquote>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Quick Action Buttons */}
        {!isUser && onAction && (
          <div className="flex flex-wrap gap-2 mt-4">
            {getRelevantActions().map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.action)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800/50 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-cyan-400 transition-all duration-200 border border-gray-700/50 hover:border-cyan-500/30"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sources Section */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-cyan-400 transition-colors mb-2"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Sources ({message.sources.length})</span>
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {showSources && (
              <div className="space-y-2 animate-slide-down">
                {message.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 bg-gray-800/40 hover:bg-gray-800/70 rounded-xl border border-gray-700/50 hover:border-blue-500/40 transition-all duration-200 group"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-700/50 rounded-lg flex items-center justify-center mt-0.5">
                      <span className="text-[10px] font-bold text-cyan-400">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-cyan-400 group-hover:text-cyan-300 transition truncate">
                        {source.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {source.snippet}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5 group-hover:text-cyan-400 transition" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
