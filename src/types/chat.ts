// ─── Conversation & Message Types ─────────────────────────────────────────────

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchSource[];
  created_at: string;
}

export interface SearchSource {
  title: string;
  link: string;
  snippet: string;
}

// ─── AI Agent Types ───────────────────────────────────────────────────────────

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  system_prompt: string;
  status: 'active' | 'inactive' | 'coming_soon';
  created_at: string;
}

// ─── AI Tool Types ────────────────────────────────────────────────────────────

export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'productivity' | 'creative' | 'analysis';
  is_enabled: boolean;
  created_at: string;
}

// ─── User Settings Types ──────────────────────────────────────────────────────

export interface UserSettings {
  id: string;
  user_id: string;
  selected_model: string;
  focus_mode: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Conversation Grouping ────────────────────────────────────────────────────

export interface ConversationGroup {
  label: string;
  conversations: Conversation[];
}

// ─── Model Version Types ──────────────────────────────────────────────────────

export interface ModelVersion {
  id: string;
  name: string;
  description: string;
  is_current?: boolean;
}

export const MODEL_VERSIONS: ModelVersion[] = [
  { id: 'ita-v2.1', name: 'ITA v2.1', description: 'Latest and most capable model', is_current: true },
  { id: 'ita-lite', name: 'ITA-Lite', description: 'Faster responses, lighter tasks' },
  { id: 'ita-legacy', name: 'Older Models', description: 'Previous generation models' },
];

// ─── Quick Action Types ───────────────────────────────────────────────────────

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
}

export const MESSAGE_ACTIONS: QuickAction[] = [
  { id: 'explain', label: 'Explain', icon: '💡', action: 'explain' },
  { id: 'elaborate', label: 'Elaborate', icon: '🔍', action: 'elaborate' },
  { id: 'rewrite-concise', label: 'Rewrite (Concise)', icon: '✏️', action: 'rewrite-concise' },
  { id: 'rewrite-detailed', label: 'Rewrite (Detailed)', icon: '📝', action: 'rewrite-detailed' },
  { id: 'summarize', label: 'Summarize', icon: '📋', action: 'summarize' },
  { id: 'generate-code', label: 'Generate Code', icon: '💻', action: 'generate-code' },
];
