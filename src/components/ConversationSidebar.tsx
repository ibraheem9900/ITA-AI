import { useMemo } from 'react';
import { Conversation, ConversationGroup } from '../types/chat';
import { Plus, MessageSquare, Clock, Calendar, Trash2 } from 'lucide-react';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation?: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Time Grouping Logic ──────────────────────────────────────────────────────

function groupConversationsByTime(conversations: Conversation[]): ConversationGroup[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: ConversationGroup[] = [
    { label: 'This Week', conversations: [] },
    { label: 'This Month', conversations: [] },
    { label: 'Older', conversations: [] },
  ];

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updated_at || conv.created_at);
    
    if (convDate >= startOfWeek) {
      groups[0].conversations.push(conv);
    } else if (convDate >= startOfMonth) {
      groups[1].conversations.push(conv);
    } else {
      groups[2].conversations.push(conv);
    }
  });

  return groups.filter((g) => g.conversations.length > 0);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onClose,
}: ConversationSidebarProps) {
  const conversationGroups = useMemo(() => groupConversationsByTime(conversations), [conversations]);

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
    <div className="h-full flex flex-col bg-gray-900/98 border-r border-gray-800/60 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/60">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversation History</span>
        </div>
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No conversations yet</p>
            <p className="text-xs text-gray-700 mt-1">Start a new chat above</p>
          </div>
        ) : (
          conversationGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 px-2 mb-2">
                {group.label === 'This Week' ? (
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{group.label}</span>
              </div>
              <div className="space-y-1">
                {group.conversations.map((conv) => (
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
                    {currentConversationId === conv.id && (
                      <span className="text-[10px] font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">active</span>
                    )}
                    {onDeleteConversation && (
                      <span
                        onClick={(e) => handleDelete(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task 5: Knowledge Library — disabled/coming soon, no active buttons */}
      <div className="border-t border-gray-800/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Knowledge Library</span>
        </div>
        <div className="px-3 py-3 rounded-xl bg-gray-800/30 border border-gray-800/50 cursor-not-allowed">
          <p className="text-xs text-gray-600">Coming soon — upload documents, link data sources, and build your personal knowledge base.</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 h-screen flex-shrink-0 sidebar-panel">
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
