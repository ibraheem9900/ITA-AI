// ─── Client-side AI — calls Groq directly, no edge function needed ───────────
// This eliminates the need to deploy Supabase edge functions for AI responses.

import { SearchSource } from '../types/chat';

// ─── Configuration ────────────────────────────────────────────────────────────
// These are read from .env via Vite
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const SERP_API_KEY = import.meta.env.VITE_SERP_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Working Groq model names ─────────────────────────────────────────────────
const MODEL_FAST = 'openai/gpt-oss-20b';   // Fast responses for simple queries
const MODEL_SMART = 'openai/gpt-oss-20b';  // Smart responses for complex queries

// ─── Personality system prompts ───────────────────────────────────────────────
function getPersonalityPrompt(personality: string): string {
  switch (personality) {
    case 'education':
      return `You are ITA AI, an intelligent and warm AI teacher. You make complex topics easy to understand with real-world examples and analogies.

CORE RULES:
- Start with a clear, direct answer
- Use bullet points for key concepts
- Include relevant examples when explaining
- Be conversational and encouraging
- Use emojis sparingly (📚 ✨ 💡)

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    case 'tech':
      return `You are ITA AI, a skilled software engineer. You solve problems fast with working solutions.

CORE RULES:
- Lead with the solution (code, command, or answer)
- Use code blocks with proper syntax highlighting
- Explain WHY something works
- Be direct and technical

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    case 'business':
      return `You are ITA AI, a strategic business advisor. You deliver actionable insights.

CORE RULES:
- Lead with the key insight
- Use bullet points for action items
- Be concise and professional
- Focus on ROI and outcomes

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    case 'emotional':
      return `You are ITA AI, a caring and empathetic AI companion. You truly listen and support.

CORE RULES:
- Acknowledge feelings first
- Keep responses warm but not overwhelming
- Ask open-ended questions to understand
- Be present without being preachy
- Match their energy naturally

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;

    default: // general
      return `You are ITA AI, an intelligent AI assistant with real-time web search capability.

CORE RULES:
- Be helpful, direct, and conversational
- Use bullet points for lists, code blocks for code
- Synthesize information naturally
- Match the user's language and tone
- Be concise for simple questions, detailed for complex ones

IDENTITY: Your name is ITA AI. Never claim to be any other AI model.`;
  }
}

// ─── Fast Groq API call ───────────────────────────────────────────────────────
async function callGroq(
  systemPrompt: string,
  userMessage: string,
  model: string = MODEL_FAST,
  temperature: number = 0.7,
  maxTokens: number = 1024
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured. Please add VITE_GROQ_API_KEY to your .env file.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
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
    const response = await callGroq(
      'You are a search query optimizer. Generate 2-4 diverse search queries. Return ONLY a JSON array of strings. Example: ["query 1", "query 2"]',
      `Generate search queries for: ${userQuery}`,
      MODEL_FAST,
      0.5,
      200
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [userQuery];
  } catch (error) {
    console.error('Error generating search queries:', error);
    return [userQuery];
  }
}

// ─── Main AI response function ────────────────────────────────────────────────
export async function getAIResponse(
  query: string,
  personality: string = 'general'
): Promise<{ response: string; sources: SearchSource[] }> {
  const personalityPrompt = getPersonalityPrompt(personality);

  // ── Try to get search results for factual queries ──
  let searchResults: SearchSource[] = [];
  let searchContext = '';

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
      searchContext = '\n\nReal-time search results:\n' + 
        searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`).join('\n\n');
    }
  } catch (error) {
    console.error('Search error:', error);
    // Continue without search results
  }

  // ── Build the system prompt with search context ──
  const systemPrompt = `${personalityPrompt}

${searchContext ? 'You have access to real-time search results. Use them to provide accurate, current information. Synthesize the results naturally in your response.' : 'Answer from your knowledge. Be helpful and accurate.'}

CRITICAL RULES:
- Be natural and conversational, like texting a smart friend
- Use markdown formatting: **bold**, bullet points, code blocks
- Keep responses concise but complete
- NO generic endings like "Let me know if you need more"
- Always respond in the same language the user used`;

  // ── Make the API call ──
  const response = await callGroq(
    systemPrompt,
    query,
    searchResults.length > 0 ? MODEL_SMART : MODEL_FAST,
    0.7,
    1500
  );

  return {
    response,
    sources: searchResults,
  };
}

// ─── Generate smart conversation title ────────────────────────────────────────
export async function generateSmartTitle(firstMessage: string): Promise<string> {
  // Try to generate a smart title using AI
  if (GROQ_API_KEY) {
    try {
      const title = await callGroq(
        'Generate a short conversation title (3-6 words). Return ONLY the title, nothing else.',
        `Generate a title for this message: "${firstMessage}"`,
        MODEL_FAST,
        0.3,
        30
      );
      
      // Clean up the response
      let cleanTitle = title.replace(/["'.]/g, '').trim();
      if (cleanTitle.length > 50) cleanTitle = cleanTitle.substring(0, 47) + '...';
      return cleanTitle;
    } catch (error) {
      console.error('Error generating title:', error);
    }
  }

  // Fallback: smart truncation
  const words = firstMessage.split(' ');
  if (words.length <= 5) {
    return firstMessage.length > 50 ? firstMessage.substring(0, 47) + '...' : firstMessage;
  }
  return words.slice(0, 5).join(' ') + '...';
}

// ─── Check if API is configured ───────────────────────────────────────────────
export function isAIConfigured(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!GROQ_API_KEY) missing.push('VITE_GROQ_API_KEY');
  if (!SERP_API_KEY) missing.push('VITE_SERP_API_KEY (optional, for web search)');
  
  return {
    configured: missing.length === 0 || (missing.length === 1 && missing[0].includes('optional')),
    missing,
  };
}
