import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types/chat';
import ChatSidebar from './ChatSidebar';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingMessage from './LoadingMessage';

import SettingsModal from './SettingsModal';
import { useAuth } from '../contexts/AuthContext';
import { getConversationalResponse } from '../lib/conversationalAI';
import { getAIResponse, generateSmartTitle, getQuickActionPrompt, clearConversationMemory } from '../lib/clientAI';
import { Download, Trash2, Sun, Moon, Keyboard } from 'lucide-react';

const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';

export default function ChatContainer() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [personality, setPersonality] = useState('general');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [subtextIndex, setSubtextIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const greetings = ['Hello', 'Welcome back', 'Hi there', 'Good to see you', 'Hey'];
  const subtexts = [
    "I'm here to help you",
    'Ask me anything',
    'How can I assist you today?',
    'Let me search the web for you',
    "What's on your mind?",
    'Ready to help with anything!',
  ];

  useEffect(() => {
    const savedName = localStorage.getItem('userName') || '';
    const savedPersonality = localStorage.getItem('aiPersonality') || 'general';
    const savedDarkMode = localStorage.getItem('darkMode') !== 'false';
    setUserName(savedName);
    setPersonality(savedPersonality);
    setDarkMode(savedDarkMode);
    setGreetingText(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSubtextIndex((p) => (p + 1) % subtexts.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const getDisplayName = () => {
    if (userName) return userName;
    if (user?.email) {
      const base = user.email.split('@')[0];
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
    return 'User';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (currentConversationId) loadMessages(currentConversationId);
  }, [currentConversationId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N = New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setCurrentConversationId(null);
        setMessages([]);
      }
      // Ctrl/Cmd + / = Toggle shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      // Escape = Close modals
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setSettingsOpen(false);
      }
      // Ctrl/Cmd + D = Toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations').select('*').order('updated_at', { ascending: false });
    if (!error && data) setConversations(data);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (!error && data) setMessages(data);
  };

  const createConversation = async (firstMessage: string): Promise<string> => {
    // Generate a smart title using AI
    const title = await generateSmartTitle(firstMessage);
    
    const { data, error } = await supabase
      .from('conversations').insert({ user_id: user!.id, title }).select().single();
    if (error || !data) throw new Error('Failed to create conversation');
    setConversations((prev) => [data, ...prev]);
    setCurrentConversationId(data.id);
    return data.id;
  };

  const handleSendMessage = async (content: string) => {
    setLoading(true);
    try {
      let conversationId = currentConversationId;
      if (!conversationId) conversationId = await createConversation(content);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // ── Conversational detection — instant response, no API call ──────────
      const conversationalReply = getConversationalResponse(content, personality);

      if (conversationalReply) {
        // Tiny delay to feel natural (not instant-robotic)
        await new Promise((r) => setTimeout(r, 350));

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: 'assistant',
          content: conversationalReply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Save both messages to Supabase in the background
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content });
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: conversationalReply });
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        await loadConversations();
        return;
      }

      // ── Real query — call client-side AI directly ─────────────────────────
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content });

      // Call AI directly from client (no edge function needed)
      const aiResult = await getAIResponse(content, personality, conversationId, userName);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResult.response,
        sources: aiResult.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save to Supabase in background
      await supabase.from('messages').insert({
        conversation_id: conversationId, role: 'assistant',
        content: aiResult.response, sources: aiResult.sources,
      });
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      await loadConversations();

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error sending message:', msg);
      
      // Show a more helpful error message
      let errorMsg = `Something went wrong: ${msg}`;
      if (msg.includes('GROQ_API_KEY') || msg.includes('not configured')) {
        errorMsg = `AI is not configured. \n\nTo fix this in Vercel:\n1. Go to Settings → Environment Variables\n2. Add: VITE_GROQ_API_KEY = your_groq_api_key\n3. Redeploy\n\nNote: Variables MUST start with VITE_ prefix!`;
      } else if (msg.includes('API error')) {
        errorMsg = `AI error: ${msg}. Please check your API key is valid.`;
      }
      
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        conversation_id: currentConversationId || '',
        role: 'assistant',
        content: errorMsg,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = useCallback((action: string) => {
    // Get the last AI message to act upon
    const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAiMessage) {
      const prompt = getQuickActionPrompt(action, lastAiMessage.content);
      handleSendMessage(prompt);
    }
  }, [messages, handleSendMessage]);

  const handlePersonalityChange = (p: string) => {
    setPersonality(p);
    localStorage.setItem('aiPersonality', p);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
    localStorage.setItem('darkMode', String(!darkMode));
  };

  const exportChat = () => {
    if (!currentConversationId || messages.length === 0) return;
    
    const conversation = conversations.find(c => c.id === currentConversationId);
    const title = conversation?.title || 'Chat';
    
    let content = `# ${title}\n\n`;
    content += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    
    messages.forEach(msg => {
      const role = msg.role === 'user' ? '**You**' : '**ITA AI**';
      content += `### ${role}\n${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        content += `*Sources:*\n`;
        msg.sources.forEach((s, i) => {
          content += `${i + 1}. [${s.title}](${s.link})\n`;
        });
        content += '\n';
      }
    });
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    await supabase.from('messages').delete().eq('conversation_id', id);
    await supabase.from('conversations').delete().eq('id', id);
    
    clearConversationMemory(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([]);
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row relative overflow-hidden ${darkMode ? 'bg-gray-950' : 'bg-gray-100'}`} style={{ height: '100dvh' }}>
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1" style={{ top: '-10%', left: '-5%' }} />
        <div className="blob blob-2" style={{ bottom: '-5%', right: '-5%' }} />
        <div className="blob blob-3" style={{ top: '40%', right: '30%' }} />
      </div>

      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => { setCurrentConversationId(id); setMessages([]); }}
        onNewChat={() => { setCurrentConversationId(null); setMessages([]); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onDeleteConversation={deleteConversation}
      />

      <div className="flex-1 flex flex-col relative z-10 min-w-0 overflow-hidden">
        <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src={APP_LOGO} alt="ITA AI" className="w-6 h-6" />
              <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>ITA AI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentConversationId && (
              <>
                <button
                  onClick={exportChat}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-cyan-400' : 'hover:bg-gray-200 text-gray-600 hover:text-cyan-600'}`}
                  title="Export chat (Ctrl+E)"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteConversation(currentConversationId)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-600 hover:text-red-600'}`}
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-yellow-400' : 'hover:bg-gray-200 text-gray-600 hover:text-indigo-600'}`}
              title="Toggle dark mode (Ctrl+D)"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-cyan-400' : 'hover:bg-gray-200 text-gray-600 hover:text-cyan-600'}`}
              title="Keyboard shortcuts (Ctrl+/)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-cyan-400' : 'hover:bg-gray-200 text-gray-600 hover:text-cyan-600'}`}
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {getDisplayName()}
            </div>
          </div>
        </div>

        {messages.length === 0 && !loading ? (
          <div className={`flex-1 themed-scroll flex items-center justify-center px-4 py-8 ${darkMode ? '' : 'bg-gray-50'}`}>
            <div className="text-center max-w-md w-full animate-slide-down">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600/40 to-cyan-500/40 rounded-3xl mb-5 shadow-2xl shadow-blue-500/20 animate-pulse-glow border border-blue-500/20">
                <img src={APP_LOGO} alt="ITA AI" className="w-12 h-12" />
              </div>
              <h2 className={`text-3xl sm:text-4xl font-black mb-2 tracking-wide gradient-text-animated ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {greetingText}, {getDisplayName()}
              </h2>
              <p className={`text-base h-6 transition-all duration-500 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {subtexts[subtextIndex]}
              </p>
              
              {/* Quick suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  'Explain quantum computing',
                  'Help me debug code',
                  'Write a poem',
                  'Search latest AI news',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendMessage(suggestion)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      darkMode 
                        ? 'bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-cyan-400 border border-gray-700/50 hover:border-cyan-500/40' 
                        : 'bg-white hover:bg-gray-100 text-gray-600 hover:text-cyan-600 border border-gray-200 hover:border-cyan-400'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div ref={chatContainerRef} className="flex-1 themed-scroll">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onQuickAction={handleQuickAction} />
            ))}
            {loading && <LoadingMessage />}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}

        <ChatInput onSend={handleSendMessage} disabled={loading} />
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={userName}
        onUserNameChange={(name) => { setUserName(name); localStorage.setItem('userName', name); }}
        personality={personality}
        onPersonalityChange={handlePersonalityChange}
      />

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className={`rounded-2xl max-w-md w-full p-6 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className={`p-1 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {[
                ['Ctrl + N', 'New chat'],
                ['Ctrl + D', 'Toggle dark mode'],
                ['Ctrl + /', 'Show/hide shortcuts'],
                ['Esc', 'Close modals'],
              ].map(([key, action]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{action}</span>
                  <kbd className={`px-2 py-1 rounded text-xs font-mono ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
