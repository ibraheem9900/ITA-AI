# ITA AI

ITA AI is a full-stack AI-powered assistant designed to answer questions with real-time web search, persistent conversation history, and personality-based responses. Users can ask general questions, technical questions, research tasks, and even conversational prompts, while the app returns helpful answers with source attribution and a modern chat-first interface.

## Overview

This application is built as a React + Vite frontend connected to Supabase for authentication and storage, with Supabase Edge Functions handling AI orchestration and web search. It provides a polished, ChatGPT-style experience with multiple assistant personalities, multilingual responsiveness, and secure user-specific data handling.

## Features

- AI-powered answers using Groq
- Real-time web search through SerpAPI
- multilingual query support
- conversation history persistence with Supabase
- different assistant personalities: general, tech, education, business, and emotional
- secure authentication with Supabase Auth
- responsive UI for desktop and mobile
- source links for search-backed answers
- modern dark UI with a polished chat experience

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Supabase Edge Functions (Deno)
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- AI provider: Groq
- Search provider: SerpAPI
- UI libraries: React Router, React Markdown, Lucide React

## Project Structure

```text
.
├── src/
│   ├── App.tsx                 App routing and auth gate
│   ├── main.tsx                React entry point
│   ├── index.css               Tailwind and global styling
│   ├── components/             UI components for auth, chat, sidebar, profile, and settings
│   ├── contexts/               Auth state and session management
│   ├── lib/
│   │   ├── clientAI.ts         Client-side AI orchestration and memory logic
│   │   ├── conversationalAI.ts
│   │   └── supabase.ts         Supabase client setup
│   └── types/                  Shared TypeScript model definitions
├── supabase/
│   ├── functions/
│   │   └── ai-search/          Edge function for AI + web search
│   └── migrations/             Database schema for chat, agents, settings, and tools
├── public/                     Static assets and app branding
├── .env.example                Environment variable template
├── QUICK_START.md              Fast setup + Groq configuration guide
├── SETUP_GUIDE.md              Detailed installation and deployment guide
├── package.json                Project scripts and dependencies
├── vite.config.ts              Vite configuration
├── tailwind.config.js          Tailwind configuration
├── tsconfig.json               TypeScript config
├── vercel.json                 Vercel deployment config
├── eslint.config.js            ESLint config
├── index.html                  App entry HTML
├── README.md                   Project overview and setup guide
└── .gitignore
```

## How It Works

1. The user enters a prompt in the chat interface.
2. The app checks whether the request is a conversational message or a search-driven question.
3. For search-driven questions, it generates one or more optimized search queries.
4. SerpAPI fetches live search results.
5. The results are deduplicated and passed to Groq for synthesis.
6. The assistant returns a direct answer with relevant sources and preserves context across the conversation.
7. Conversation data, user settings, and assistant metadata are stored in Supabase.

## Prerequisites

Before running the app, make sure you have:

- Node.js 18+ or newer
- npm
- a Supabase project
- a Groq API key
- a SerpAPI key (optional if you want knowledge-only responses)

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/ibraheem9900/ITA-AI.git
cd ITA-AI
npm install
cp .env.example .env.local
```

Then update `.env.local` with your keys:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_SERP_API_KEY=your_serp_api_key
```

## Running the App

Start the frontend locally:

```bash
npm run dev
```

The app will usually be available at:

```text
http://localhost:5173
```

## Supabase Setup

The project relies on Supabase for:

- authentication
- conversation storage
- user settings and preferences
- AI agents and tools metadata
- secure backend secrets via Edge Functions

Apply the included migrations before using the database-backed features:

```bash
npx supabase db push
```

For production or Edge Function usage, configure the following secrets in your Supabase project:

```text
GROQ_API_KEY
SERP_API_KEY
```

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
```

## Deployment

This project is designed to work well with Vercel for the frontend, while Supabase handles the backend edge function and database layer. Set the environment variables in your deployment platform as needed:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GROQ_API_KEY
VITE_SERP_API_KEY
```

## Security Notes

- Never commit `.env.local` or API keys to version control.
- Keep production keys in secure environment configuration or Supabase secrets.
- Supabase Row Level Security protects user data.
- Use appropriate environment-specific configuration between local development and production.

## Documentation

Additional project documentation is available in:

- `QUICK_START.md`
- `SETUP_GUIDE.md`

These files contain quick setup steps and deployment notes.

## License

This project does not currently declare a license in the repository metadata. If you plan to distribute or commercialize it, consider adding an appropriate open-source license.

## Contact

For questions or collaboration, contact the project maintainer through the repository or portfolio linked to the project owner.
