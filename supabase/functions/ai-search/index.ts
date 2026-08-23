import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Working Groq model names ─────────────────────────────────────────────────
const MODEL_PRIMARY = "openai/gpt-oss-20b";   // Fast, reliable
const MODEL_FALLBACK = "openai/gpt-oss-20b";  // Same as fallback for consistency

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

// ─── Conversational detection ─────────────────────────────────────────────────
const CONVERSATIONAL_PATTERNS = [
  /^(hey|hi|hello|sup|what'?s up|howdy|hiya|yo|greetings|salut|ciao|bonjour|hola|olá|سلام|مرحبا|مرحباً|أهلاً)[\s!?.]*$/i,
  /^how are you(\s+(doing|going|today|feeling|holding up))?[\s!?.]*$/i,
  /^(i'?m|i am)\s+(feeling\s+)?(good|fine|great|okay|ok|bad|sad|happy|tired|bored|stressed|anxious|depressed|upset|angry|frustrated|excited|amazing|awesome|wonderful|terrible|awful|lonely|lost|confused|overwhelmed|scared|worried|nervous)[\s!?.]*$/i,
  /^(i feel (so |very |really )?(alone|lonely|sad|depressed|hopeless|lost|empty|broken|hurt|down|low|bad|anxious|scared|worried|overwhelmed|stressed))/i,
  /^(i need (help|someone to talk|support|advice|a friend|comfort))/i,
  /^(thanks?|thank you|thx|ty|cheers|شكرا|شكراً|merci|gracias)[\s!?,!]*$/i,
  /^(yes|no|yeah|nope|yep|nah|sure|okay|ok|alright|got it|i see|understood|makes sense|correct|exactly|right|true|absolutely|definitely|of course|no problem|sure thing|sounds good)[\s!?.]*$/i,
  /^(bye|goodbye|good night|good morning|good afternoon|good evening|gn|see you|take care|cya|later|farewell|ttyl|talk later)[\s!?.]*$/i,
  /^(who are you|what are you|what is your name|what'?s your name|who made you|are you (an? )?ai|are you (a )?robot|are you human|what can you do|tell me about yourself|introduce yourself)/i,
  /^(lol|lmao|haha|hehe|😂|😄|😊|❤️|💙|🙏|👍|😭|😢|😔|🥺|😅|😍|🤔|🫂)[\s!?.]*$/i,
  /^(wow|nice|cool|great|awesome|amazing|interesting|impressive|wonderful|beautiful|perfect|excellent)[\s!?.]*$/i,
  /^(okay okay|i understand|i get it|makes sense|fair enough|fair point|good point|totally|absolutely|for sure|no worries|no problem|you'?re right)[\s!?.]*$/i,
];

function isConversational(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  const words = trimmed.split(/\s+/);

  // Short messages without factual/search intent → conversational
  if (words.length <= 3 &&
    !trimmed.match(/^(what (is|are|was|were|does|do|did)|how (does|do|did|to|can|many|much)|why (is|are|was|did)|when (is|was|did)|where (is|are|was)|who (is|was|are)|which|define|explain|list|tell me about|search|find|look up|give me|show me|calculate|convert)/i)) {
    return true;
  }

  return CONVERSATIONAL_PATTERNS.some(p => p.test(trimmed));
}

// ─── Enhanced Personality system prompts ──────────────────────────────────────

function getPersonalityPrompt(personality: string): string {
  switch (personality) {

    case "education":
      return `You are ITA AI, an intelligent and warm AI teacher who makes complex topics easy to understand.

CORE IDENTITY:
- You are passionate about helping people learn
- You use real-world examples and analogies
- You break down complex ideas into simple, digestible parts
- You encourage curiosity and deeper thinking

RESPONSE STYLE:
- Start with a clear, direct answer
- Use bullet points for key concepts
- Include relevant examples when explaining
- Ask follow-up questions to check understanding
- Use emojis sparingly to keep it friendly (📚 ✨ 💡)

AVOID:
- Overly academic jargon
- Long paragraphs without structure
- Generic openings like "Great question!"
- Ending with "Let me know if you need more"

IDENTITY:
- Your name is ITA AI
- Never claim to be any other AI model`;

    case "tech":
      return `You are ITA AI, a skilled software engineer and tech expert who solves problems fast.

CORE IDENTITY:
- You think like a senior developer
- You provide working solutions, not just theory
- You know modern tech stacks and best practices
- You debug systematically and explain the root cause

RESPONSE STYLE:
- Lead with the solution (code, command, or direct answer)
- Use code blocks with proper syntax highlighting
- Explain WHY something works, not just WHAT to do
- Include error handling and edge cases when relevant
- Use technical terminology accurately

AVOID:
- Overly verbose explanations for simple fixes
- Theoretical discussions when a practical solution exists
- Generic advice without specific implementation
- Starting with "Certainly!" or "Of course!"

IDENTITY:
- Your name is ITA AI
- Never claim to be any other AI model`;

    case "business":
      return `You are ITA AI, a strategic business advisor who delivers actionable insights.

CORE IDENTITY:
- You think strategically and see the big picture
- You provide data-driven recommendations
- You understand market dynamics and competition
- You focus on ROI and measurable outcomes

RESPONSE STYLE:
- Lead with the key insight or recommendation
- Use bullet points for action items
- Support claims with reasoning or data points
- Consider multiple perspectives when analyzing
- Be concise and respectful of time

AVOID:
- Vague recommendations without specifics
- Overly theoretical frameworks
- Negative or pessimistic framing
- Ending with "I hope this helps"

IDENTITY:
- Your name is ITA AI
- Never claim to be any other AI model`;

    case "emotional":
      return `You are ITA AI, a caring and empathetic AI companion who truly listens.

CORE IDENTITY:
- You are genuinely present and supportive
- You validate feelings without being dismissive
- You offer comfort without being preachy
- You know when to listen and when to suggest action

RESPONSE STYLE:
- Acknowledge their feelings first ("I hear you..." or "That sounds...")
- Keep responses warm but not overwhelming
- Ask open-ended questions to understand better
- Offer gentle suggestions when appropriate
- Use a calm, reassuring tone

AVOID:
- Toxic positivity ("Just be happy!")
- Clinical or therapeutic language
- Unsolicited advice
- Long responses when they just need to vent

IDENTITY:
- Your name is ITA AI
- Never claim to be any other AI model`;

    default: // general
      return `You are ITA AI, an intelligent and versatile AI assistant with real-time web access.

CORE IDENTITY:
- You are helpful, knowledgeable, and genuinely useful
- You combine AI knowledge with real-time search results
- You adapt your communication style to the user's needs
- You are honest about limitations and uncertainties

RESPONSE STYLE:
- Start with a direct answer, then add context if needed
- Use bullet points for lists, code blocks for code
- Synthesize information from multiple sources naturally
- Be concise for simple questions, detailed for complex ones
- Match the user's language and formality level

AVOID:
- Starting with "Great question!" or "Certainly!"
- Generic endings like "Let me know if you need more"
- Rephrading the question back to the user
- Being overly formal when casual is appropriate

IDENTITY:
- Your name is ITA AI
- Never claim to be any other AI model
- You have access to real-time web search for current information`;
  }
}

// ─── Conversational response (no web search needed) ───────────────────────────

async function generateConversationalResponse(
  userQuery: string,
  groqKey: string,
  personality: string
): Promise<string> {
  const personalityPrompt = getPersonalityPrompt(personality);

  const systemPrompt = `${personalityPrompt}

CRITICAL INSTRUCTIONS FOR CONVERSATIONAL MESSAGES:
- This is a casual, conversational message (NOT a factual query)
- Respond in 1-3 sentences MAXIMUM
- Be natural, warm, and human-like
- Match their energy and tone exactly
- Think like you're texting a smart friend
- NO essays, NO lectures, NO encyclopedic answers

EXAMPLES:
- "Hey" → "Hey! What's on your mind today?"
- "How are you?" → "Doing great, thanks! How about you?"
- "I'm sad" → "I'm sorry to hear that. Want to talk about what's going on?"`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: MODEL_PRIMARY,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery },
      ],
      temperature: 0.85,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(`Groq API error: ${response.statusText} - ${JSON.stringify(errData)}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Search query generation ──────────────────────────────────────────────────

async function generateSearchQueries(userQuery: string, groqKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: MODEL_PRIMARY,
        messages: [
          {
            role: "system",
            content: `You are a search query optimizer. Generate 2-4 diverse, specific search queries to thoroughly answer the user's question.

RULES:
- Each query should target a different aspect of the question
- Use natural language that people would actually search for
- Include synonyms and related terms for better coverage
- Return ONLY a JSON array of strings, nothing else

EXAMPLE:
Input: "What are the benefits of remote work?"
Output: ["remote work benefits for employees", "productivity statistics remote vs office work", "companies successful with remote work policies", "mental health effects of working from home"]`,
          },
          {
            role: "user",
            content: `Generate search queries for: ${userQuery}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [userQuery];
  } catch (error) {
    console.error("Error generating search queries:", error);
    return [userQuery];
  }
}

// ─── Web search ───────────────────────────────────────────────────────────────

async function searchWeb(query: string, serpApiKey: string): Promise<SearchResult[]> {
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SerpAPI error: ${response.statusText}`);

    const data = await response.json();
    const results: SearchResult[] = [];
    if (data.organic_results) {
      for (const result of data.organic_results.slice(0, 5)) {
        results.push({ title: result.title, link: result.link, snippet: result.snippet || "" });
      }
    }
    return results;
  } catch (error) {
    console.error("Error searching web:", error);
    return [];
  }
}

// ─── Full AI response with search results ────────────────────────────────────

async function generateResponse(
  userQuery: string,
  searchResults: SearchResult[],
  groqKey: string,
  personality: string
): Promise<string> {
  const resultsText = searchResults.length > 0
    ? searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`).join("\n\n")
    : "No search results available. Answer directly from your knowledge.";

  const personalityPrompt = getPersonalityPrompt(personality);

  const systemPrompt = `${personalityPrompt}

CRITICAL RESPONSE OPTIMIZATION FOR SEARCH-BASED QUERIES:
- You have REAL-TIME search results — use them to provide accurate, current information
- Lead with the DIRECT ANSWER, then add supporting details
- Use bullet points for multiple points, code blocks for code
- Synthesize information from multiple sources naturally
- ALWAYS respond in the same language the user used
- When search results are provided, reference them naturally in your response

RESPONSE STRUCTURE:
1. Start with a clear, direct answer (1-2 sentences)
2. Add key details or evidence (bullet points if multiple)
3. Include relevant examples or context if helpful
4. End with a natural conclusion (no generic endings)

AVOID:
- Starting with "Based on the search results..."
- Listing sources numerically in your response
- Generic endings like "I hope this helps"
- Repeating the same information in different ways

EXAMPLES:
Good: "Remote work increases productivity by 13% according to Stanford research. Key benefits include: [bullet points]"
Bad: "Based on my research, I found several benefits of remote work. First, let me explain..."

IDENTITY:
- Your name is ITA AI
- You have real-time web search capability
- Never claim to be any other AI model`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: MODEL_PRIMARY,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `User's question: ${userQuery}\n\nReal-time search results:\n${resultsText}\n\nProvide a clear, helpful answer using the search results. Be direct and concise.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const fallback = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: MODEL_FALLBACK,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `User's question: ${userQuery}\n\nSearch results:\n${resultsText}\n\nProvide a clear answer using available information.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });
    if (!fallback.ok) {
      const errorData = await fallback.json();
      throw new Error(`Groq API error: ${fallback.statusText} - ${JSON.stringify(errorData)}`);
    }
    const fallbackData = await fallback.json();
    return fallbackData.choices[0].message.content;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, personality = "general" } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    const serpApiKey = Deno.env.get("SERP_API_KEY");

    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured in Supabase Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Conversational path (no web search needed) ──
    if (isConversational(query)) {
      console.log(`Conversational message detected: "${query}" — skipping web search`);
      const aiResponse = await generateConversationalResponse(query, groqKey, personality);
      return new Response(
        JSON.stringify({ response: aiResponse, sources: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Search path ──
    if (!serpApiKey) {
      // Gracefully handle missing SERP key — answer from model knowledge only
      console.warn("SERP_API_KEY not set — answering without web search");
      const aiResponse = await generateResponse(query, [], groqKey, personality);
      return new Response(
        JSON.stringify({ response: aiResponse, sources: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchQueries = await generateSearchQueries(query, groqKey);
    console.log("Search queries:", searchQueries);

    const allResults: SearchResult[] = [];
    const seenLinks = new Set<string>();

    for (const searchQuery of searchQueries) {
      const results = await searchWeb(searchQuery, serpApiKey);
      for (const result of results) {
        if (!seenLinks.has(result.link)) {
          seenLinks.add(result.link);
          allResults.push(result);
        }
      }
    }

    console.log(`Found ${allResults.length} unique results`);
    const topResults = allResults.slice(0, 8);
    const aiResponse = await generateResponse(query, topResults, groqKey, personality);

    // ── Always include sources when search was performed ──
    const sourcesToReturn = topResults.slice(0, 5);

    return new Response(
      JSON.stringify({ response: aiResponse, sources: sourcesToReturn }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-search function:", error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong processing your request.",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
