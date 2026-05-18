-- Create scorecard_submissions table
CREATE TABLE IF NOT EXISTS scorecard_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    category_id uuid REFERENCES scorecard_categories(id) ON DELETE SET NULL,
    points numeric NOT NULL DEFAULT 0,
    reference_id text, -- string type to accommodate different kinds of IDs (uuid or short id)
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE scorecard_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for scorecard_submissions
-- Allow users to insert their own submissions, or system to insert
CREATE POLICY "Allow insert for authenticated users on scorecard_submissions"
ON scorecard_submissions FOR INSERT TO authenticated WITH CHECK (true);

-- Allow users to view all submissions (needed for leaderboard)
CREATE POLICY "Allow select for authenticated users on scorecard_submissions"
ON scorecard_submissions FOR SELECT TO authenticated USING (true);
