import { Conversation } from '../types/chat';
import { Plus, MessageSquare, X, Trash2 } from 'lucide-react';

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
  onDeleteConversation?: (id: string) => void;
}

export default function ChatSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  isOpen,
  onClose,
  onDeleteConversation,
}: ChatSidebarProps) {

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteConversation?.(id);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-gray-900/95 border-r border-gray-800/60 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversations</span>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all duration-200 active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className="btn-primary w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No conversations yet</p>
            <p className="text-xs text-gray-700 mt-1">Start a new chat above</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${
                currentConversationId === conv.id
                  ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/20 border border-blue-500/30 text-white'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-white border border-transparent'
              }`}
            >
              <MessageSquare className={`w-4 h-4 flex-shrink-0 transition-colors ${
                currentConversationId === conv.id ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'
              }`} />
              <span className="truncate text-sm flex-1">{conv.title}</span>
              {onDeleteConversation && (
                <span
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay + drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden animate-slide-in-left">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
