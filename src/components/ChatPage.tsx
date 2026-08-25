import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Conversation, Message, AIAgent, AITool, UserSettings } from '../types/chat';
import ConversationSidebar from './ConversationSidebar';
import AgentsPanel from './AgentsPanel';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingMessage from './LoadingMessage';
import ModelDropdown from './ModelDropdown';
import { useAuth } from '../contexts/AuthContext';
import { getConversationalResponse } from '../lib/conversationalAI';
import { getAIResponse, generateSmartTitle, getQuickActionPrompt, clearConversationMemory } from '../lib/clientAI';
import { Menu } from 'lucide-react';

const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';

export default function ChatPage() {
  const { user } = useAuth();
  
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
  
  // ─── Data State ──────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
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
    setUserName(savedName);
    setPersonality(savedPersonality);
    setDarkMode(savedDarkMode);
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
      loadTools();
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

  const loadTools = async () => {
    const { data, error } = await supabase
      .from('ai_tools')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setTools(data);
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
      // No settings yet, create default
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

      // Conversational detection — instant response, no API call
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

        // Save to Supabase in background
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content });
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: conversationalReply });
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        await loadConversations();
        return;
      }

      // Real query — call client-side AI directly
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
    // Start a new conversation with the agent's system prompt
    handleSendMessage(`I want to use the ${agent.name} agent. ${agent.description}`);
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col lg:flex-row h-screen relative overflow-hidden circuit-bg ${
      focusMode ? 'focus-mode-active' : ''
    }`}>
      {/* ─── Left Sidebar ────────────────────────────────────────────────────── */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        tools={tools}
        onSelectConversation={(id) => { setCurrentConversationId(id); setMessages([]); }}
        onNewChat={() => { setCurrentConversationId(null); setMessages([]); }}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ─── Main Chat Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden chat-main">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-xl z-10">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src={APP_LOGO} alt="ITA" className="w-7 h-7" />
              <span className="text-lg font-bold text-white hidden sm:block">ITA</span>
            </div>
          </div>

          {/* Center: Model Dropdown */}
          <div className="hidden md:block">
            <ModelDropdown selectedModel={selectedModel} onModelChange={handleModelChange} />
          </div>

          {/* Right: Focus Mode + Profile */}
          <div className="flex items-center gap-3">
            {/* Focus Mode Toggle */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-500">Focus Mode</span>
              <button
                onClick={toggleFocusMode}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  focusMode ? 'bg-cyan-600' : 'bg-gray-700'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  focusMode ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-700/50">
              <span className="text-sm font-medium text-gray-300 hidden sm:block">{getDisplayName()}</span>
              {getUserAvatar() ? (
                <img src={getUserAvatar()} alt={getDisplayName()} className="w-8 h-8 rounded-full border border-gray-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-sm font-medium">
                  {getDisplayName().charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Agents Panel Toggle */}
            <button
              onClick={() => setAgentsPanelOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-cyan-400 transition-colors xl:hidden"
              title="AI Agents"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        {messages.length === 0 && !loading ? (
          <div className="flex-1 themed-scroll flex items-center justify-center px-4 py-8">
            <div className="text-center max-w-lg w-full animate-slide-down">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600/30 to-cyan-500/30 rounded-3xl mb-6 shadow-2xl shadow-blue-500/20 animate-pulse-glow border border-blue-500/20">
                <img src={APP_LOGO} alt="ITA AI" className="w-14 h-14" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-3 gradient-text-animated">
                {greetingText}, {getDisplayName()}
              </h2>
              <p className="text-gray-500 text-base h-6 transition-all duration-500 mb-8">
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
                    className="px-4 py-2 rounded-full text-sm bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-cyan-400 border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-200"
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
      <AgentsPanel
        agents={agents}
        onAgentSelect={handleAgentSelect}
        isOpen={agentsPanelOpen}
        onClose={() => setAgentsPanelOpen(false)}
      />
    </div>
  );
}
