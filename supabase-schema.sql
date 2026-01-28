-- ============================================
-- SUPABASE DATABASE SCHEMA FOR HEALTH COACH
-- Run this in the Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. USERS PROFILE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users_profile (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  age INTEGER,
  sex TEXT,
  height_feet INTEGER,
  height_inches INTEGER,
  weight DECIMAL,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  goals JSONB,
  exercise_types JSONB,
  dietary_preferences TEXT,
  meal_cadence JSONB,
  onboarding_level INTEGER,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  full_profile JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users_profile
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users_profile
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  sub_type TEXT,
  category TEXT,
  description TEXT,
  raw_text TEXT,
  data JSONB,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_logged_at ON activities(logged_at);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. PLAYBOOK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS playbook (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  summary TEXT,
  focus_goals JSONB,
  key_principles JSONB,
  on_your_radar JSONB,
  pending_suggestions JSONB,
  generated_at TIMESTAMP WITH TIME ZONE,
  last_modified TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE playbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playbook" ON playbook
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbook" ON playbook
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbook" ON playbook
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 4. NUTRITION CALIBRATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nutrition_calibration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  meals JSONB,
  complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_user_id ON nutrition_calibration(user_id);

ALTER TABLE nutrition_calibration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition" ON nutrition_calibration
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition" ON nutrition_calibration
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition" ON nutrition_calibration
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 5. WEEKLY CHECK-INS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE,
  summary TEXT,
  focus_goal_review JSONB,
  quick_answers JSONB,
  suggestions JSONB,
  feedback_detail_level TEXT,
  feedback_text TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON weekly_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_week_start ON weekly_checkins(week_start);

ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON weekly_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins" ON weekly_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins" ON weekly_checkins
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 6. CHAT CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  category TEXT,
  messages JSONB,
  bookmarks JSONB,
  archived BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chat_conversations(updated_at);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats" ON chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON chat_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. ADVISOR LEARNED INSIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS advisor_learned (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  insight TEXT NOT NULL,
  category TEXT,
  confidence TEXT,
  source_chat_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  source_message_index INTEGER,
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_user_id ON advisor_learned(user_id);

ALTER TABLE advisor_learned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON advisor_learned
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights" ON advisor_learned
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights" ON advisor_learned
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights" ON advisor_learned
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 8. ADVISOR NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS advisor_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  section TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON advisor_notes(user_id);

ALTER TABLE advisor_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON advisor_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON advisor_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON advisor_notes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 9. GROCERY DATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grocery_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE grocery_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grocery data" ON grocery_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grocery data" ON grocery_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grocery data" ON grocery_data
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_profile_updated_at
    BEFORE UPDATE ON users_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbook_updated_at
    BEFORE UPDATE ON playbook
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grocery_data_updated_at
    BEFORE UPDATE ON grocery_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE!
-- ============================================
-- After running this script:
-- 1. Go to Authentication > Settings in Supabase dashboard
-- 2. Configure your email templates if desired
-- 3. Enable any additional auth providers (Google, etc.) if needed
-- 4. Update your .env file with Supabase credentials
