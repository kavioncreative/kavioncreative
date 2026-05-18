
-- ============================================
-- FULL MULTI-LEVEL RANKING SYSTEM WITH EARNINGS
-- ============================================

-- 1. Configuration Table (Ensure clean state)
CREATE TABLE IF NOT EXISTS algorithm_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name text UNIQUE NOT NULL,
    metric_value numeric NOT NULL DEFAULT 0,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Seed ALL Thresholds for ALL Levels (Including Earnings)
INSERT INTO algorithm_config (metric_name, metric_value, description) VALUES
('Confidence Threshold (m)', 5, 'Minimum reviews needed before a freelancer rating is fully trusted'),

-- Rising Talent (Tier 1)
('Rising Talent Score Min', 4.0, 'Minimum adjusted score for Rising Talent badge'),
('Rising Talent Project Min', 2, 'Minimum projects for Rising Talent badge'),
('Rising Talent Earnings Min', 0, 'Minimum lifetime earnings for Rising Talent badge'),

-- Top Rated (Tier 2)
('Top Rated Score Min', 4.7, 'Minimum adjusted score for Top Rated badge'),
('Top Rated Project Min', 10, 'Minimum projects for Top Rated badge'),
('Top Rated Earnings Min', 500, 'Minimum lifetime earnings for Top Rated badge'),

-- Top Rated Plus (Tier 3)
('Top Rated Plus Score Min', 4.85, 'Minimum adjusted score for Top Rated Plus badge'),
('Top Rated Plus Project Min', 30, 'Minimum projects for Top Rated Plus badge'),
('Top Rated Plus Earnings Min', 2500, 'Minimum lifetime earnings for Top Rated Plus badge'),

-- Expert (Tier 4)
('Expert Score Min', 4.95, 'Minimum adjusted score for Expert badge'),
('Expert Project Min', 50, 'Minimum projects for Expert badge'),
('Expert Earnings Min', 10000, 'Minimum lifetime earnings for Expert badge')
ON CONFLICT (metric_name) DO UPDATE SET metric_value = EXCLUDED.metric_value;

-- 3. Advanced Multi-Level Ranking View
CREATE OR REPLACE VIEW freelancer_performance_ranking AS
WITH site_stats AS (
    SELECT 
        AVG(rating) as site_avg_rating,
        COALESCE((SELECT metric_value FROM algorithm_config WHERE metric_name = 'Confidence Threshold (m)'), 5) as m_threshold
    FROM project_reviews
),
freelancer_stats AS (
    SELECT 
        p.assignee as freelancer_name,
        COUNT(pr.id) as review_count,
        AVG(pr.rating) as avg_rating,
        (SELECT COUNT(*) FROM projects p2 WHERE p2.assignee = p.assignee AND p2.status ILIKE '%Done%') as completed_projects,
        (SELECT COUNT(*) FROM projects p3 WHERE p3.assignee = p.assignee AND p3.has_dispute = true) as dispute_count,
        SUM(COALESCE(p.designer_fee, 0) + CASE WHEN p.tips_given THEN COALESCE(p.tip_amount, 0) ELSE 0 END) as lifetime_earnings
    FROM projects p
    LEFT JOIN project_reviews pr ON p.project_id = pr.project_id
    WHERE p.assignee IS NOT NULL
    GROUP BY p.assignee
),
bayesian_calc AS (
    SELECT 
        fs.*,
        ss.site_avg_rating,
        ss.m_threshold,
        -- Bayesian Formula
        ((fs.review_count / (fs.review_count + ss.m_threshold)) * fs.avg_rating) + 
        ((ss.m_threshold / (fs.review_count + ss.m_threshold)) * ss.site_avg_rating) as adjusted_score
    FROM freelancer_stats fs, site_stats ss
),
thresholds AS (
    SELECT
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Expert Score Min') as exp_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Expert Project Min') as exp_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Expert Earnings Min') as exp_e,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Plus Score Min') as trp_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Plus Project Min') as trp_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Plus Earnings Min') as trp_e,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Score Min') as tr_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Project Min') as tr_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Earnings Min') as tr_e,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Rising Talent Score Min') as rt_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Rising Talent Project Min') as rt_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Rising Talent Earnings Min') as rt_e
)
SELECT 
    bc.*,
    CASE 
        WHEN bc.dispute_count > 0 THEN 'New Talent'
        WHEN bc.adjusted_score >= t.exp_s AND bc.completed_projects >= t.exp_p AND bc.lifetime_earnings >= t.exp_e THEN 'Expert'
        WHEN bc.adjusted_score >= t.trp_s AND bc.completed_projects >= t.trp_p AND bc.lifetime_earnings >= t.trp_e THEN 'Top Rated Plus'
        WHEN bc.adjusted_score >= t.tr_s AND bc.completed_projects >= t.tr_p AND bc.lifetime_earnings >= t.tr_e THEN 'Top Rated'
        WHEN bc.adjusted_score >= t.rt_s AND bc.completed_projects >= t.rt_p AND bc.lifetime_earnings >= t.rt_e THEN 'Rising Talent'
        ELSE 'New Talent'
    END as badge_status
FROM bayesian_calc bc, thresholds t;
