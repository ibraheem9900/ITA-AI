import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ─── Voice Input (Web Speech API) ─────────────────────────────────────────

  const toggleVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please try Chrome.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setMessage((prev) => (prev ? prev + ' ' + finalTranscript : finalTranscript));
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ─── File Attach Handler ──────────────────────────────────────────────────

  const handleFileAttach = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.pdf,.doc,.docx,.txt,.csv,.json';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;
      
      // For now, add file names to the message
      // In production, you'd upload to Supabase Storage
      const fileNames = Array.from(files).map(f => f.name).join(', ');
      setMessage((prev) => prev ? `${prev}\n\nAttached: ${fileNames}` : `Attached: ${fileNames}`);
    };
    input.click();
  };

  return (
    <div className="border-t border-gray-800/60 bg-gray-900/80 backdrop-blur-xl sticky bottom-0 z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className={`flex items-end gap-2 sm:gap-3 bg-gray-800/50 rounded-2xl border transition-all duration-200 ${
          isFocused ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-gray-700/50'
        }`}>
          {/* Attach Button */}
          <button
            onClick={handleFileAttach}
            disabled={disabled}
            className="flex-shrink-0 p-2.5 sm:p-3 text-gray-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything..."
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none py-2.5 sm:py-3 text-sm sm:text-base max-h-[150px] disabled:opacity-50 min-h-[44px]"
          />

          {/* Voice Button */}
          <button
            onClick={toggleVoiceRecording}
            disabled={disabled}
            className={`flex-shrink-0 p-2.5 sm:p-3 transition-all duration-200 disabled:opacity-50 ${
              isRecording
                ? 'text-red-500 animate-voice-pulse'
                : 'text-gray-500 hover:text-cyan-400'
            }`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
            className={`flex-shrink-0 p-2.5 sm:p-3 rounded-xl transition-all duration-200 disabled:opacity-30 ${
              message.trim() && !disabled
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/20'
                : 'text-gray-500'
            }`}
          >
            {disabled ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Voice Recording Indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-2 mt-2 text-red-400 text-xs animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-voice-pulse" />
            <span>Recording... Click to stop</span>
          </div>
        )}
      </div>
    </div>
  );
}
