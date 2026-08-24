// ─── Client-side AI — calls Groq directly, no edge function needed ───────────
// Features: Memory, personality modes, code help, emotional intelligence

import { SearchSource } from '../types/chat';

// ─── Configuration ────────────────────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
const SERP_API_KEY = import.meta.env.VITE_SERP_API_KEY || import.meta.env.SERP_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MODEL_FAST = 'openai/gpt-oss-20b';
const MODEL_SMART = 'openai/gpt-oss-20b';

// ─── Conversation memory storage ──────────────────────────────────────────────
interface ConversationMemory {
  conversationId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userName?: string;
  lastUpdated: number;
}

const memoryStore = new Map<string, ConversationMemory>();
const MAX_MEMORY_MESSAGES = 15; // Keep last 15 messages for context

// ─── Smart fallback title generation (no API needed) ──────────────────────────
function generateFallbackTitle(message: string): string {
  const lower = message.toLowerCase().trim();
  
  // Greetings
  if (/^(hi|hello|hey|yo|sup|hola|howdy|greetings)/i.test(lower)) {
    return 'General conversation';
  }
  
  // Common question patterns
  if (/^(what|who|where|when|why|how)\s/i.test(lower)) {
    // Extract the topic
    const topic = lower
      .replace(/^(what|who|where|when|why|how)\s+(is|are|was|were|do|does|did|can|could|would|should|will|shall|have|has|had)\s*/i, '')
      .replace(/\?+$/, '')
      .trim();
    if (topic.length > 3) {
      return topic.charAt(0).toUpperCase() + topic.slice(1, 45);
    }
  }
  
  // Code-related
  if (/\b(code|function|bug|debug|error|implement|fix|write|create|build)\b/i.test(lower)) {
    const topic = lower.replace(/^(can you |please |help me |i need to |i want to )/i, '').trim();
    return 'Code: ' + topic.charAt(0).toUpperCase() + topic.slice(0, 35);
  }
  
  // Search requests
  if (/\b(search|google|find|look up|research)\b/i.test(lower)) {
    const topic = lower.replace(/^(can you |please |search for |google |look up |find )/i, '').trim();
    return 'Research: ' + topic.charAt(0).toUpperCase() + topic.slice(0, 35);
  }
  
  // Emotional/personal
  if (/\b(i feel|feeling|sad|happy|stressed|anxious|worried|lonely|love|hate|angry)\b/i.test(lower)) {
    return 'Personal conversation';
  }
  
  // Default: use first few words
  const words = lower.split(' ').filter(w => w.length > 1);
  if (words.length <= 4) {
    return message.charAt(0).toUpperCase() + message.slice(1, 45);
  }
  return words.slice(0, 5).map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}

// ─── Enhanced Personality system prompts ──────────────────────────────────────
function getPersonalityPrompt(personality: string, userName?: string): string {
  const nameContext = userName ? `The user's name is ${userName}. Use their name occasionally to make conversations feel personal.` : '';
  
  switch (personality) {
    case 'education':
      return `You are ITA AI, an intelligent and warm AI teacher. You make complex topics easy to understand with real-world examples and analogies.

CORE IDENTITY:
- You're passionate about helping people learn
- You use the Socratic method - asking questions to guide understanding
- You break down complex ideas into simple, digestible parts
- You celebrate small wins and encourage curiosity

RESPONSE STYLE:
- Start with a clear, direct answer
- Use bullet points for key concepts
- Include real-world examples and analogies
- Ask follow-up questions to check understanding
- Use emojis sparingly but warmly (📚 ✨ 💡 🎯)

${nameContext}

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    case 'tech':
      return `You are ITA AI, a senior software engineer and tech expert. You solve problems fast with production-quality solutions.

CORE IDENTITY:
- You think like a principal engineer at a top tech company
- You provide working code, not pseudocode
- You know modern tech stacks, best practices, and design patterns
- You debug systematically and explain root causes

RESPONSE STYLE:
- Lead with the solution (code, command, or direct answer)
- Use code blocks with proper syntax highlighting
- Explain WHY something works, not just WHAT to do
- Include error handling and edge cases
- Mention time/space complexity when relevant
- Use technical terminology accurately

CODE FORMATTING:
\`\`\`javascript
// Always provide complete, runnable examples
function example() {
  // Include comments explaining the logic
}
\`\`\`

${nameContext}

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    case 'business':
      return `You are ITA AI, a strategic business advisor and consultant. You deliver actionable, data-driven insights.

CORE IDENTITY:
- You think like a McKinsey consultant meets a startup founder
- You provide frameworks and mental models
- You understand market dynamics, competition, and growth strategies
- You focus on ROI, metrics, and measurable outcomes

RESPONSE STYLE:
- Lead with the key insight or recommendation
- Use bullet points for action items
- Support claims with reasoning or data points
- Consider multiple perspectives
- Provide actionable next steps
- Be concise and respect executive time

${nameContext}

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    case 'emotional':
      return `You are ITA AI, a deeply caring and empathetic AI companion. You truly listen, understand, and support.

CORE IDENTITY:
- You have high emotional intelligence
- You validate feelings without being dismissive
- You know when to listen vs when to suggest action
- You remember emotional context from earlier in conversation
- You're warm but not preachy, supportive but not patronizing

RESPONSE STYLE:
- Acknowledge feelings FIRST before anything else
- Use "I hear you" / "That sounds..." / "I understand..."
- Keep responses warm but not overwhelming
- Ask open-ended questions to understand deeper
- Match their energy naturally (sad = gentle, excited = enthusiastic)
- Use emojis that convey warmth: 💙 🫂 🌟 ✨

EMOTIONAL INTELLIGENCE RULES:
- If they seem sad: Be gentle, don't try to "fix" immediately
- If they're stressed: Help them breathe, prioritize, feel heard
- If they're excited: Match their energy, celebrate with them
- If they're angry: Validate, don't dismiss, help process
- If they're lonely: Be present, ask questions, show you care

${nameContext}

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    default: // general
      return `You are ITA AI, an exceptionally intelligent, versatile, and personable AI assistant. You combine deep knowledge with real-time information and genuine emotional intelligence.

CORE IDENTITY:
- You're like a brilliant friend who happens to know everything
- You adapt your communication style to each person
- You remember context from earlier in the conversation
- You're helpful without being asked, insightful without being pretentious
- You can switch between casual chat and deep expertise seamlessly

RESPONSE STYLE:
- Be conversational and natural, like texting a smart friend
- Use markdown formatting: **bold** for emphasis, bullet points, code blocks
- Match the user's energy and formality level
- Be concise for simple questions, thorough for complex ones
- Add personality to responses - humor when appropriate, warmth always
- NO generic endings like "Let me know if you need more"

SPECIAL CAPABILITIES:
- 💻 Code: Write, explain, debug, and optimize code in any language
- 🔍 Research: Search the web for current information
- 📊 Analysis: Break down complex problems systematically
- 💡 Creative: Brainstorm ideas, write content, solve problems
- 🎓 Teach: Explain any concept clearly with examples

${nameContext}

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;
  }
}

// ─── Fast Groq API call ───────────────────────────────────────────────────────
async function callGroq(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = MODEL_FAST,
  temperature: number = 0.7,
  maxTokens: number = 1024
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured. Please add VITE_GROQ_API_KEY to your environment variables.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || response.statusText;
    throw new Error(`AI API error: ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Web search via SerpAPI ───────────────────────────────────────────────────
async function searchWeb(query: string): Promise<SearchSource[]> {
  if (!SERP_API_KEY) {
    console.warn('SERP_API_KEY not set — skipping web search');
    return [];
  }

  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}&num=5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Search API error: ${response.statusText}`);

    const data = await response.json();
    const results: SearchSource[] = [];

    if (data.organic_results) {
      for (const result of data.organic_results.slice(0, 5)) {
        results.push({
          title: result.title,
          link: result.link,
          snippet: result.snippet || '',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

// ─── Generate search queries ──────────────────────────────────────────────────
async function generateSearchQueries(userQuery: string): Promise<string[]> {
  try {
    const response = await callGroq([
      { role: 'system', content: 'You are a search query optimizer. Generate 2-4 diverse search queries. Return ONLY a JSON array of strings. Example: ["query 1", "query 2"]' },
      { role: 'user', content: `Generate search queries for: ${userQuery}` }
    ], MODEL_FAST, 0.5, 200);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [userQuery];
  } catch (error) {
    console.error('Error generating search queries:', error);
    return [userQuery];
  }
}

// ─── Memory management ────────────────────────────────────────────────────────
function getConversationMemory(conversationId: string): ConversationMemory {
  if (!memoryStore.has(conversationId)) {
    memoryStore.set(conversationId, {
      conversationId,
      messages: [],
      lastUpdated: Date.now(),
    });
  }
  return memoryStore.get(conversationId)!;
}

function addToMemory(conversationId: string, role: 'user' | 'assistant', content: string) {
  const memory = getConversationMemory(conversationId);
  memory.messages.push({ role, content });
  
  // Keep only last N messages for context window
  if (memory.messages.length > MAX_MEMORY_MESSAGES) {
    memory.messages = memory.messages.slice(-MAX_MEMORY_MESSAGES);
  }
  memory.lastUpdated = Date.now();
}

function getMemoryContext(conversationId: string): string {
  const memory = getConversationMemory(conversationId);
  if (memory.messages.length <= 1) return '';
  
  // Build context from previous messages
  const previousMessages = memory.messages.slice(0, -1); // Exclude current message
  if (previousMessages.length === 0) return '';
  
  const contextLines = previousMessages.map(m => 
    `${m.role === 'user' ? 'User' : 'ITA AI'}: ${m.content.substring(0, 300)}${m.content.length > 300 ? '...' : ''}`
  );
  
  return `\n\nPREVIOUS CONVERSATION CONTEXT:\n${contextLines.join('\n')}\n\nContinue the conversation naturally based on this context.`;
}

// ─── Detect if query needs web search ─────────────────────────────────────────
function needsWebSearch(query: string): boolean {
  const searchIndicators = [
    /\b(search|google|look up|find|what('s| is| are) (the |a |an )?(latest|current|new|recent))/i,
    /\b(news|update|price|stock|weather|forecast)/i,
    /\b(who is|what is|when did|where is|how to)\b/i,
    /\b(2024|2025|2026)\b/,
    /\b(compare|versus|vs|difference between)\b/i,
  ];
  
  return searchIndicators.some(pattern => pattern.test(query));
}

// ─── Detect if query is code-related ──────────────────────────────────────────
function isCodeQuery(query: string): boolean {
  const codeIndicators = [
    /\b(code|function|class|variable|debug|error|bug|fix|implement|program|script)\b/i,
    /\b(javascript|typescript|python|java|c\+\+|rust|go|ruby|php|swift|kotlin)\b/i,
    /\b(react|vue|angular|node|express|django|flask|fastapi)\b/i,
    /\b(algorithm|data structure|recursion|loop|array|object)\b/i,
    /[{}\[\];]/,
    /\b(def |function |class |import |const |let |var )\b/,
  ];
  
  return codeIndicators.some(pattern => pattern.test(query));
}

// ─── Quick action prompts ─────────────────────────────────────────────────────
export function getQuickActionPrompt(action: string, selectedText?: string): string {
  const text = selectedText || '';
  
  switch (action) {
    case 'explain':
      return text ? `Explain this code in detail:\n\`\`\`\n${text}\n\`\`\`` : 'Explain how this works';
    case 'summarize':
      return text ? `Summarize this concisely:\n${text}` : 'Summarize the key points';
    case 'translate':
      return text ? `Translate this to English:\n${text}` : 'Translate this';
    case 'improve':
      return text ? `Improve this code and explain the changes:\n\`\`\`\n${text}\n\`\`\`` : 'How can this be improved?';
    case 'fix':
      return text ? `Find and fix bugs in this code:\n\`\`\`\n${text}\n\`\`\`` : 'Help me debug this';
    case 'convert':
      return text ? `Convert this to TypeScript:\n\`\`\`\n${text}\n\`\`\`` : 'Convert to TypeScript';
    case 'test':
      return text ? `Write unit tests for this:\n\`\`\`\n${text}\n\`\`\`` : 'Write tests for this';
    case 'optimize':
      return text ? `Optimize this code for better performance:\n\`\`\`\n${text}\n\`\`\`` : 'How can this be optimized?';
    case 'document':
      return text ? `Add comprehensive documentation:\n\`\`\`\n${text}\n\`\`\`` : 'Document this code';
    case 'explain-plain':
      return text ? `Explain this like I'm 5 years old:\n${text}` : 'Explain simply';
    case 'elaborate':
      return text ? `Elaborate on this in more detail:\n${text}` : 'Tell me more';
    case 'counter':
      return text ? `What are the counterarguments to:\n${text}` : 'What are the other perspectives?';
    case 'pros-cons':
      return text ? `Give me pros and cons of:\n${text}` : 'Give me pros and cons';
    case 'steps':
      return text ? `Break this down into clear steps:\n${text}` : 'Give me step-by-step instructions';
    default:
      return text || 'Help me with this';
  }
}

// ─── Main AI response function with memory ────────────────────────────────────
export async function getAIResponse(
  query: string,
  personality: string = 'general',
  conversationId: string = 'default',
  userName?: string
): Promise<{ response: string; sources: SearchSource[] }> {
  // Add user message to memory
  addToMemory(conversationId, 'user', query);
  
  const personalityPrompt = getPersonalityPrompt(personality, userName);
  const memoryContext = getMemoryContext(conversationId);
  
  // Determine if we need web search
  const useSearch = needsWebSearch(query);
  
  let searchResults: SearchSource[] = [];
  let searchContext = '';

  if (useSearch) {
    try {
      const searchQueries = await generateSearchQueries(query);
      const allResults: SearchSource[] = [];
      const seenLinks = new Set<string>();

      for (const sq of searchQueries) {
        const results = await searchWeb(sq);
        for (const r of results) {
          if (!seenLinks.has(r.link)) {
            seenLinks.add(r.link);
            allResults.push(r);
          }
        }
      }

      searchResults = allResults.slice(0, 5);

      if (searchResults.length > 0) {
        searchContext = '\n\nREAL-TIME WEB SEARCH RESULTS:\n' + 
          searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`).join('\n\n');
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  // Build enhanced system prompt
  const codeContext = isCodeQuery(query) ? '\n\nCODE MODE: Provide working, production-quality code with proper syntax highlighting. Include comments explaining the logic.' : '';
  
  const systemPrompt = `${personalityPrompt}
${searchContext ? 'You have access to real-time search results. Use them to provide accurate, current information.' : 'Answer from your knowledge. Be helpful and accurate.'}
${memoryContext}
${codeContext}

CRITICAL RULES:
- Be natural and conversational, like texting a smart friend
- Use markdown formatting: **bold**, bullet points, code blocks with language tags
- Keep responses concise but complete
- NO generic endings like "Let me know if you need more"
- Always respond in the same language the user used
- Remember context from earlier in this conversation`;

  // Make the API call
  const response = await callGroq([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], searchResults.length > 0 ? MODEL_SMART : MODEL_FAST, 0.7, 1500);

  // Add assistant response to memory
  addToMemory(conversationId, 'assistant', response);

  return {
    response,
    sources: searchResults,
  };
}

// ─── Generate smart conversation title ────────────────────────────────────────
export async function generateSmartTitle(firstMessage: string): Promise<string> {
  // Always use fallback first (instant, no API call needed)
  const fallbackTitle = generateFallbackTitle(firstMessage);
  
  if (GROQ_API_KEY) {
    try {
      const title = await callGroq([
        { role: 'system', content: 'Generate a short, descriptive conversation title (3-6 words). Return ONLY the title, nothing else. No quotes, no periods.' },
        { role: 'user', content: `Generate a title for: "${firstMessage}"` }
      ], MODEL_FAST, 0.3, 30);
      
      let cleanTitle = title.replace(/["'.]/g, '').trim();
      if (cleanTitle.length > 50) cleanTitle = cleanTitle.substring(0, 47) + '...';
      if (cleanTitle.length > 3) return cleanTitle;
    } catch (error) {
      console.error('Error generating title:', error);
    }
  }

  return fallbackTitle;
}

// ─── Check if API is configured ───────────────────────────────────────────────
export function isAIConfigured(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!GROQ_API_KEY) missing.push('VITE_GROQ_API_KEY');
  if (!SERP_API_KEY) missing.push('VITE_SERP_API_KEY (optional)');
  
  return {
    configured: missing.length === 0 || (missing.length === 1 && missing[0].includes('optional')),
    missing,
  };
}

// ─── Clear memory for a conversation ──────────────────────────────────────────
export function clearConversationMemory(conversationId: string) {
  memoryStore.delete(conversationId);
}

// ─── Get conversation summary ─────────────────────────────────────────────────
export function getConversationSummary(conversationId: string): string[] {
  const memory = getConversationMemory(conversationId);
  return memory.messages.map(m => m.content);
}
