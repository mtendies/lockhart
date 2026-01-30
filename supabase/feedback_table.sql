-- Feedback Table for Lockhart
-- Run this in Supabase SQL Editor

-- Create the feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  page TEXT,
  category TEXT,
  feedback TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  app_version TEXT,
  device TEXT,
  status TEXT DEFAULT 'new',  -- new, reviewed, implemented, wont_fix
  admin_notes TEXT
);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT feedback (including anonymous users)
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- Policy: Only admin (Max) can SELECT all feedback
CREATE POLICY "Admin can view all feedback" ON feedback
  FOR SELECT USING (auth.email() = 'tenderomaxwell@gmail.com');

-- Policy: Only admin can UPDATE feedback (change status, add notes)
CREATE POLICY "Admin can update feedback" ON feedback
  FOR UPDATE USING (auth.email() = 'tenderomaxwell@gmail.com');

-- Policy: Only admin can DELETE feedback
CREATE POLICY "Admin can delete feedback" ON feedback
  FOR DELETE USING (auth.email() = 'tenderomaxwell@gmail.com');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);

-- Grant access to the anon and authenticated roles for INSERT
GRANT INSERT ON feedback TO anon;
GRANT INSERT ON feedback TO authenticated;

-- Grant full access to authenticated users (RLS will restrict based on email)
GRANT SELECT, UPDATE, DELETE ON feedback TO authenticated;
