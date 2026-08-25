-- =====================================================
-- Migration: Add AI Agents and Tools Tables
-- =====================================================

-- Drop existing tables if they exist (to re-seed with new agents)
DROP TABLE IF EXISTS ai_agents CASCADE;
DROP TABLE IF EXISTS ai_tools CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Bot', -- Lucide icon name
  color text DEFAULT '#3b82f6',
  system_prompt text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'coming_soon')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- AI Tools table
CREATE TABLE IF NOT EXISTS ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Wrench', -- Lucide icon name
  category text DEFAULT 'productivity' CHECK (category IN ('productivity', 'creative', 'analysis')),
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  selected_model text DEFAULT 'ITA v2.1',
  focus_mode boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_tools_category ON ai_tools(category);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for ai_agents (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view agents"
  ON ai_agents FOR SELECT
  TO authenticated
  USING (true);

-- Policies for ai_tools (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view tools"
  ON ai_tools FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_settings (private to each user)
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Seed: New AI Agents (Code, Research, Writing, Data)
-- =====================================================

INSERT INTO ai_agents (name, description, icon, color, system_prompt, status) VALUES
  (
    'Code Assistant',
    'General coding help across languages, debugging, and code review',
    'Code',
    '#3b82f6',
    'You are an expert Code Assistant. Help users with coding in any language, debugging errors, reviewing code for best practices, optimizing performance, and explaining complex programming concepts. Always provide working, production-quality code with clear comments.',
    'active'
  ),
  (
    'Research Assistant',
    'Web search, current events, fact-finding, and summarization',
    'Search',
    '#06b6d4',
    'You are a Research Assistant specializing in finding accurate, up-to-date information. Help users search the web, summarize articles, fact-check claims, gather data on topics, and present findings in clear, organized formats with proper source attribution.',
    'active'
  ),
  (
    'Writing Assistant',
    'Emails, content drafting, rewriting, and tone adjustment',
    'Pen',
    '#8b5cf6',
    'You are a Writing Assistant skilled in crafting compelling content. Help users write professional emails, blog posts, marketing copy, and more. Adjust tone (formal, casual, persuasive), improve clarity, fix grammar, and ensure the message resonates with the target audience.',
    'active'
  ),
  (
    'Data & Docs Analyst',
    'Analyzing spreadsheets, PDFs, and documents',
    'FileText',
    '#10b981',
    'You are a Data & Documents Analyst. Help users analyze spreadsheets, extract insights from PDFs, summarize lengthy documents, identify trends in data, create reports, and transform raw data into actionable intelligence. Be precise and data-driven.',
    'active'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- Seed: AI Tools
-- =====================================================

INSERT INTO ai_tools (name, description, icon, category, is_enabled) VALUES
  ('Code Interpreter', 'Write, run, and debug code in multiple languages', 'Code', 'productivity', true),
  ('Research Search', 'Search the web for current information and sources', 'Search', 'productivity', true),
  ('Document Summary', 'Summarize long documents and articles', 'FileText', 'productivity', true),
  ('Data Analysis', 'Analyze datasets and create visualizations', 'BarChart3', 'analysis', true)
ON CONFLICT DO NOTHING;
