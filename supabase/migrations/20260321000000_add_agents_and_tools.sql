/*
  # Add AI Agents and Tools Tables

  1. New Tables
    - `ai_agents`
      - `id` (uuid, primary key)
      - `name` (text) - agent display name
      - `description` (text) - what the agent does
      - `icon` (text) - emoji or icon identifier
      - `color` (text) - accent color for the agent
      - `system_prompt` (text) - specialized system prompt
      - `status` (text) - 'active', 'inactive', 'coming_soon'
      - `created_at` (timestamptz)

    - `ai_tools`
      - `id` (uuid, primary key)
      - `name` (text) - tool display name
      - `description` (text) - what the tool does
      - `icon` (text) - emoji or icon identifier
      - `category` (text) - 'productivity', 'creative', 'analysis'
      - `is_enabled` (boolean) - whether tool is available
      - `created_at` (timestamptz)

    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, unique) - reference to auth.users
      - `selected_model` (text) - preferred AI model
      - `focus_mode` (boolean) - focus mode toggle state
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Seed Data
    - Default agents (Python Dev, UI UX Expert, Market Analyst, Data Scientist)
    - Default tools (Code Interpreter, Image Generation, Document Summary, Data Analysis)

  3. Security
    - Enable RLS on all tables
    - Agents and tools are readable by all authenticated users
    - User settings are private to each user
*/

-- AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '🤖',
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
  icon text DEFAULT '🛠️',
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

-- Seed default agents
INSERT INTO ai_agents (name, description, icon, color, system_prompt, status) VALUES
  ('Python Dev', 'Expert Python developer for coding tasks, debugging, and optimization', '🐍', '#3776ab', 'You are an expert Python developer. Help users write clean, efficient Python code with best practices.', 'active'),
  ('UI UX Expert', 'Specialist in user interface design and user experience', '🎨', '#ff6b6b', 'You are a UI/UX design expert. Help users create intuitive, beautiful, and accessible interfaces.', 'active'),
  ('Market Analyst', 'Business and market research specialist', '📊', '#4ecdc4', 'You are a market analyst. Help users understand market trends, competitive analysis, and business strategy.', 'active'),
  ('Data Scientist', 'Expert in data analysis, ML, and statistical modeling', '🔬', '#9b59b6', 'You are a data scientist. Help users with data analysis, machine learning, and statistical modeling.', 'active')
ON CONFLICT DO NOTHING;

-- Seed default tools
INSERT INTO ai_tools (name, description, icon, category, is_enabled) VALUES
  ('Code Interpreter', 'Write, run, and debug code in multiple languages', '💻', 'productivity', true),
  ('Image Generation', 'Create images from text descriptions', '🖼️', 'creative', true),
  ('Document Summary', 'Summarize long documents and articles', '📄', 'productivity', true),
  ('Data Analysis', 'Analyze datasets and create visualizations', '📈', 'analysis', true)
ON CONFLICT DO NOTHING;
