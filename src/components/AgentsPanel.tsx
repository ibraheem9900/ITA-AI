import { AIAgent } from '../types/chat';
import { ChevronRight, Sparkles, Crown, Code, Search, Pen, FileText, Users, BarChart3, Brain, Lightbulb } from 'lucide-react';

interface AgentsPanelProps {
  agents: AIAgent[];
  onAgentSelect?: (agent: AIAgent) => void;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Icon Mapping ─────────────────────────────────────────────────────────────

const iconMap: Record<string, typeof Code> = {
  Code,
  Search,
  Pen,
  FileText,
  Users,
  BarChart3,
  Brain,
  Lightbulb,
};

function getAgentIcon(iconName: string) {
  return iconMap[iconName] || Code;
}

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: AIAgent['status'] }) {
  const config = {
    active: { label: 'Active', className: 'agent-badge-active' },
    inactive: { label: 'Inactive', className: 'agent-badge-inactive' },
    coming_soon: { label: 'Coming Soon', className: 'agent-badge-coming-soon' },
  };

  const { label, className } = config[status];

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}

// ─── Agent Card Component ─────────────────────────────────────────────────────

function AgentCard({ agent, onSelect }: { agent: AIAgent; onSelect: () => void }) {
  const Icon = getAgentIcon(agent.icon);
  
  return (
    <button
      onClick={onSelect}
      disabled={agent.status !== 'active'}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group ${
        agent.status === 'active'
          ? 'hover:bg-gray-800/60 border border-transparent hover:border-gray-700/50'
          : 'opacity-60 cursor-not-allowed border border-transparent'
      }`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${agent.color}20`, border: `1px solid ${agent.color}40` }}
      >
        <Icon className="w-5 h-5" style={{ color: agent.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{agent.name}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{agent.description}</p>
      </div>
      {agent.status === 'active' ? (
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
      ) : (
        <StatusBadge status={agent.status} />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentsPanel({ agents, onAgentSelect, isOpen, onClose }: AgentsPanelProps) {
  const activeAgents = agents.filter((a) => a.status === 'active');
  const otherAgents = agents.filter((a) => a.status !== 'active');

  const panelContent = (
    <div className="h-full flex flex-col bg-gray-900/98 border-l border-gray-800/60 backdrop-blur-xl">
      {/* Subscription Banner */}
      <div className="p-4 border-b border-gray-800/60">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-medium text-sm transition-all duration-200">
          <Crown className="w-4 h-4" />
          Manage Subscription
        </button>
      </div>

      {/* Agents Header */}
      <div className="p-4 border-b border-gray-800/60">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Specialized AI Agents</span>
        </div>
        <p className="text-xs text-gray-500">Configure agent for future chats.</p>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {activeAgents.length > 0 && (
          <div className="space-y-2">
            {activeAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSelect={() => onAgentSelect?.(agent)}
              />
            ))}
          </div>
        )}

        {otherAgents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800/60">
            <span className="text-xs font-medium text-gray-500 px-3">More Agents</span>
            <div className="mt-2 space-y-2">
              {otherAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSelect={() => onAgentSelect?.(agent)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop panel */}
      <div className="hidden xl:block w-72 h-screen flex-shrink-0 agents-panel">
        {panelContent}
      </div>

      {/* Mobile overlay + drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 xl:hidden animate-fade-in backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 right-0 w-72 z-50 xl:hidden animate-slide-in-right">
            {panelContent}
          </div>
        </>
      )}
    </>
  );
}
