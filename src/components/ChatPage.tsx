import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Conversation, Message, AIAgent, UserSettings } from '../types/chat';
import ConversationSidebar from './ConversationSidebar';
import AgentsPanel from './AgentsPanel';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingMessage from './LoadingMessage';
import ModelDropdown from './ModelDropdown';
import Avatar from './Avatar';
import { useAuth } from '../contexts/AuthContext';
import { getConversationalResponse } from '../lib/conversationalAI';
import { getAIResponse, generateSmartTitle, getQuickActionPrompt, clearConversationMemory } from '../lib/clientAI';
import { Menu, Users, Minimize2 } from 'lucide-react';

const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ─── Core State ──────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ─── Settings State ──────────────────────────────────────────────────────────
  const [selectedModel, setSelectedModel] = useState('ita-v2.1');
  const [focusMode, setFocusMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [userName, setUserName] = useState('');
  const [personality, setPersonality] = useState('general');
  
  // ─── Panel State ─────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false);
  const [menuGlowDismissed, setMenuGlowDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // ─── Data State ──────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  
  // ─── Refs ────────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ─── Greetings ───────────────────────────────────────────────────────────────
  const greetings = ['Hello', 'Welcome back', 'Hi there', 'Good to see you', 'Hey'];
  const subtexts = [
    "I'm here to help you",
    'Ask me anything',
    'How can I assist you today?',
    "What's on your mind?",
    'Ready to help with anything!',
  ];
  const [greetingText] = useState(greetings[Math.floor(Math.random() * greetings.length)]);
  const [subtextIndex, setSubtextIndex] = useState(0);

  // ─── Initial Load ────────────────────────────────────────────────────────────

  useEffect(() => {
    const savedName = localStorage.getItem('userName') || '';
    const savedPersonality = localStorage.getItem('aiPersonality') || 'general';
    const savedDarkMode = localStorage.getItem('darkMode') !== 'false';
    const glowDismissed = localStorage.getItem('menuGlowDismissed') === 'true';
    setUserName(savedName);
    setPersonality(savedPersonality);
    setDarkMode(savedDarkMode);
    setMenuGlowDismissed(glowDismissed);
  }, []);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSubtextIndex((p) => (p + 1) % subtexts.length), 4000);
    return () => clearInterval(timer);
  }, []);

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      loadConversations();
      loadAgents();
      loadUserSettings();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversationId) loadMessages(currentConversationId);
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setConversations(data);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data);
  };

  const loadAgents = async () => {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setAgents(data);
  };

  const loadUserSettings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (!error && data) {
      setUserSettings(data);
      setSelectedModel(data.selected_model);
      setFocusMode(data.focus_mode);
    } else if (error?.code === 'PGRST116') {
      await createUserSettings();
    }
  };

  const createUserSettings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        selected_model: selectedModel,
        focus_mode: focusMode,
      })
      .select()
      .single();
    
    if (!error && data) setUserSettings(data);
  };

  const updateUserSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !userSettings) return;
    
    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', user.id);
    
    if (!error) {
      setUserSettings({ ...userSettings, ...updates });
    }
  };

  // ─── User Display Name ──────────────────────────────────────────────────────

  const getDisplayName = () => {
    if (userName) return userName;
    if (user?.email) {
      const base = user.email.split('@')[0];
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
    return 'User';
  };

  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || null;
  };

  // ─── Conversation Management ─────────────────────────────────────────────────

  const createConversation = async (firstMessage: string): Promise<string> => {
    const title = await generateSmartTitle(firstMessage);
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user!.id, title })
      .select()
      .single();
    
    if (error || !data) throw new Error('Failed to create conversation');
    setConversations((prev) => [data, ...prev]);
    setCurrentConversationId(data.id);
    return data.id;
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

  // ─── Message Handling ────────────────────────────────────────────────────────

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

      const conversationalReply = getConversationalResponse(content, personality);

      if (conversationalReply) {
        await new Promise((r) => setTimeout(r, 350));

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: 'assistant',
          content: conversationalReply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content });
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: conversationalReply });
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        await loadConversations();
        return;
      }

      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content });

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

      await supabase.from('messages').insert({
        conversation_id: conversationId, role: 'assistant',
        content: aiResult.response, sources: aiResult.sources,
      });
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      await loadConversations();

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error sending message:', msg);
      
      let errorMsg = `Something went wrong: ${msg}`;
      if (msg.includes('GROQ_API_KEY') || msg.includes('not configured')) {
        errorMsg = `AI is not configured. Please add VITE_GROQ_API_KEY to your environment variables.`;
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

  const handleAction = useCallback((action: string) => {
    const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAiMessage) {
      const prompt = getQuickActionPrompt(action, lastAiMessage.content);
      handleSendMessage(prompt);
    }
  }, [messages, handleSendMessage]);

  // ─── Settings Handlers ───────────────────────────────────────────────────────

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('selectedModel', modelId);
    await updateUserSettings({ selected_model: modelId });
  };

  const toggleFocusMode = async () => {
    const newValue = !focusMode;
    setFocusMode(newValue);
    localStorage.setItem('focusMode', String(newValue));
    await updateUserSettings({ focus_mode: newValue });
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
    localStorage.setItem('darkMode', String(!darkMode));
  };

  const handleAgentSelect = (agent: AIAgent) => {
    handleSendMessage(`I want to use the ${agent.name} agent. ${agent.description}`);
  };

  // ─── Hamburger Menu Handlers ─────────────────────────────────────────────────

  const handleMenuClick = () => {
    setSidebarOpen(true);
    if (!menuGlowDismissed) {
      setMenuGlowDismissed(true);
      localStorage.setItem('menuGlowDismissed', 'true');
    }
  };

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setCurrentConversationId(null);
        setMessages([]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
      }
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setAgentsPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [darkMode]);

  // ─── Mobile Focus Mode ──────────────────────────────────────────────────────
  const showMobileFocus = focusMode && isMobile;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col lg:flex-row h-[100dvh] relative overflow-hidden circuit-bg ${
      focusMode ? 'focus-mode-active' : ''
    }`}>
      {/* ─── Left Sidebar ────────────────────────────────────────────────────── */}
      {!showMobileFocus && (
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={(id) => { setCurrentConversationId(id); setMessages([]); }}
          onNewChat={() => { setCurrentConversationId(null); setMessages([]); }}
          onDeleteConversation={deleteConversation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Main Chat Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden chat-main">
        
        {/* ═══ Top Bar (hidden in focus mode) ═══════════════════════════ */}
        {!showMobileFocus && (
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-xl z-10 flex-shrink-0">
            {/* Left: Mobile hamburger + Logo */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Hamburger Menu — MOBILE ONLY with glow */}
              {isMobile && (
                <div className="relative">
                  <button
                    onClick={handleMenuClick}
                    className={`p-2 rounded-xl hover:bg-gray-800/50 text-gray-400 hover:text-white transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${
                      !menuGlowDismissed ? 'hamburger-glow text-cyan-400' : ''
                    }`}
                    aria-label="Open menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  {/* First-visit tooltip */}
                  {!menuGlowDismissed && (
                    <div className="absolute top-full left-0 mt-2 w-48 p-2.5 bg-gray-800 border border-cyan-500/30 rounded-xl shadow-xl shadow-cyan-500/10 animate-slide-down z-50">
                      <p className="text-[11px] text-gray-300 mb-2">Explore agents & tools</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuGlowDismissed(true);
                          localStorage.setItem('menuGlowDismissed', 'true');
                        }}
                        className="w-full py-1 text-[10px] font-medium text-cyan-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors"
                      >
                        Got it
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Logo + Title */}
              <div className="flex items-center gap-1.5">
                <img src={APP_LOGO} alt="ITA" className="w-6 h-6" />
                <span className="text-sm sm:text-base font-bold text-white">ITA</span>
              </div>
            </div>

            {/* Center: Model Dropdown (desktop only) */}
            <div className="hidden md:block">
              <ModelDropdown selectedModel={selectedModel} onModelChange={handleModelChange} />
            </div>

            {/* Right: Profile + Agents + Focus */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* User Profile */}
              <button
                onClick={() => navigate('/account')}
                className="flex items-center gap-1.5 sm:gap-2 hover:bg-gray-800/30 rounded-xl py-1 px-1.5 sm:px-2 transition-all duration-200 min-h-[40px] cursor-pointer"
                aria-label="Open profile"
              >
                <span className="text-[11px] sm:text-xs font-medium text-gray-300 hidden sm:block max-w-[80px] truncate">{getDisplayName()}</span>
                <Avatar src={getUserAvatar()} name={getDisplayName()} size="sm" />
              </button>

              {/* Agents Panel Toggle */}
              <button
                onClick={() => setAgentsPanelOpen(true)}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200"
                title="Switch to a specialized assistant"
              >
                <Users className="w-4 h-4 text-cyan-400" />
              </button>

              {/* Focus Mode Toggle (desktop + mobile) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500 hidden sm:inline">Focus</span>
                <button
                  onClick={toggleFocusMode}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                    focusMode ? 'bg-cyan-600' : 'bg-gray-700'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    focusMode ? 'translate-x-4' : ''
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Focus Mode — floating exit button */}
        {showMobileFocus && (
          <button
            onClick={toggleFocusMode}
            className="fixed top-3 right-3 z-50 p-2.5 rounded-full bg-gray-800/90 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/90 transition-all backdrop-blur-sm min-w-[44px] min-h-[44px] flex items-center justify-center shadow-lg"
            aria-label="Exit focus mode"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        )}

        {/* Chat Messages */}
        {messages.length === 0 && !loading ? (
          <div className="flex-1 themed-scroll flex items-center justify-center px-4 py-6 sm:py-8">
            <div className="text-center max-w-lg w-full animate-slide-down">
              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-600/30 to-cyan-500/30 rounded-3xl mb-4 sm:mb-6 shadow-2xl shadow-blue-500/20 animate-pulse-glow border border-blue-500/20">
                <img src={APP_LOGO} alt="ITA AI" className="w-12 h-12 sm:w-14 sm:h-14" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 sm:mb-3 gradient-text-animated">
                {greetingText}, {getDisplayName()}
              </h2>
              <p className="text-gray-500 text-sm sm:text-base h-6 transition-all duration-500 mb-6 sm:mb-8">
                {subtexts[subtextIndex]}
              </p>
              
              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Explain quantum computing',
                  'Help me debug code',
                  'Write a poem',
                  'Search latest AI news',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendMessage(suggestion)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-cyan-400 border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-200"
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
              <ChatMessage key={message.id} message={message} onAction={handleAction} />
            ))}
            {loading && <LoadingMessage />}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}

        {/* Chat Input */}
        <ChatInput onSend={handleSendMessage} disabled={loading} />
      </div>

      {/* ─── Right Agents Panel ──────────────────────────────────────────────── */}
      {!showMobileFocus && (
        <AgentsPanel
          agents={agents}
          onAgentSelect={handleAgentSelect}
          isOpen={agentsPanelOpen}
          onClose={() => setAgentsPanelOpen(false)}
        />
      )}
    </div>
  );
}
