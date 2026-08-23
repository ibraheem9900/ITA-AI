import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types/chat';
import ChatSidebar from './ChatSidebar';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingMessage from './LoadingMessage';
import Navbar from './Navbar';
import SettingsModal from './SettingsModal';
import { useAuth } from '../contexts/AuthContext';
import { getConversationalResponse } from '../lib/conversationalAI';
import { getAIResponse, generateSmartTitle } from '../lib/clientAI';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const greetings = ['Hello', 'Welcome back', 'Hi there', 'Good to see you', 'Hey'];
  const subtexts = [
    "I'm here to help you",
    'Ask me anything',
    'How can I assist you today?',
    'Let me search the web for you',
  ];

  useEffect(() => {
    const savedName = localStorage.getItem('userName') || '';
    const savedPersonality = localStorage.getItem('aiPersonality') || 'general';
    setUserName(savedName);
    setPersonality(savedPersonality);
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
      const aiResult = await getAIResponse(content, personality);

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

  const handlePersonalityChange = (p: string) => {
    setPersonality(p);
    localStorage.setItem('aiPersonality', p);
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-950 relative overflow-hidden" style={{ height: '100dvh' }}>
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
      />

      <div className="flex-1 flex flex-col relative z-10 min-w-0 overflow-hidden">
        <Navbar
          userName={getDisplayName()}
          onSettingsClick={() => setSettingsOpen(true)}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />

        {messages.length === 0 && !loading ? (
          <div className="flex-1 themed-scroll flex items-center justify-center px-4 py-8">
            <div className="text-center max-w-md w-full animate-slide-down">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600/40 to-cyan-500/40 rounded-3xl mb-5 shadow-2xl shadow-blue-500/20 animate-pulse-glow border border-blue-500/20">
                <img src={APP_LOGO} alt="ITA AI" className="w-12 h-12" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-wide gradient-text-animated">
                {greetingText}, {getDisplayName()}
              </h2>
              <p className="text-gray-500 text-base h-6 transition-all duration-500">
                {subtexts[subtextIndex]}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 themed-scroll">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
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
    </div>
  );
}
