import React, { useState, useEffect } from 'react';
import {
    IconLayers,
    IconShieldNew,
    IconShieldTopRated,
    IconShieldTopRatedPlus,
    IconShieldExpert,
    IconUsers,
    IconBriefcase,
    IconSave,
    IconRotateCcw,
    IconSettings,
    IconAlertTriangle,
    IconCheckCircle,
    IconInfo,
    IconStar,
    IconActivity,
    IconDollar
} from '../components/Icons';
import { Tabs } from '../components/Navigation';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { ElevatedMetallicCard } from '../components/ElevatedMetallicCard';

interface AlgoConfig {
    id: string;
    metric_name: string;
    metric_value: number;
    description: string;
}

interface RankingData {
    freelancer_name: string;
    review_count: number;
    avg_rating: number;
    completed_projects: number;
    dispute_count: number;
    site_avg_rating: number;
    m_threshold: number;
    adjusted_score: number;
    badge_status: string;
    lifetime_earnings: number; // Added lifetime_earnings to RankingData
}

const AlgorithmStudio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'freelancer' | 'pm'>('overview');
    const [configs, setConfigs] = useState<AlgoConfig[]>([]);
    const [rankings, setRankings] = useState<RankingData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [tableError, setTableError] = useState<string | null>(null);

    useEffect(() => {
        fetchConfigs();
        fetchRankings();
    }, [activeTab]);

    const fetchConfigs = async () => {
        setLoading(true);
        setTableError(null);
        try {
            const { data, error } = await supabase
                .from('algorithm_config')
                .select('*')
                .order('metric_name');

            if (error) {
                if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message.toLowerCase().includes('not found')) {
                    setTableError('Table not found');
                } else {
                    throw error;
                }
            } else if (data) {
                setConfigs(data);
            }
        } catch (err: any) {
            console.error('Fetch failed:', err);
            addToast({ type: 'error', title: 'Fetch Failed', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const fetchRankings = async () => {
        try {
            const { data, error } = await supabase
                .from('freelancer_performance_ranking')
                .select('*')
                .order('adjusted_score', { ascending: false });

            if (!error && data) {
                setRankings(data);
            }
        } catch (err) {
            console.error('Rankings fetch failed:', err);
        }
    };

    const handleConfigChange = (id: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setConfigs(prev => prev.map(c => c.id === id ? { ...c, metric_value: numValue } : c));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates = configs.map(c => ({
                id: c.id,
                metric_name: c.metric_name,
                metric_value: c.metric_value,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('algorithm_config').upsert(updates);

            if (error) throw error;

            addToast({ type: 'success', title: 'Algorithm Updated', message: 'Ranking parameters saved successfully.' });
            fetchRankings();
        } catch (err: any) {
            console.error('Save failed:', err);
            addToast({ type: 'error', title: 'Save Failed', message: err.message || 'Could not update configuration.' });
        } finally {
            setIsSaving(false);
        }
    };

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Badge Ecosystem Section */}
            <div className="relative group p-10 rounded-2xl bg-[#1A1A1A] border border-white/10 overflow-hidden shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Prestige Tiers</h2>
                            <p className="text-xs text-gray-400 font-medium italic">High standards drive high quality.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { name: 'Rising Talent', icon: <IconShieldNew className="w-16 h-16" />, color: 'from-blue-500/20 to-indigo-500/20', desc: 'Starting tier for all accounts' },
                            { name: 'Top Rated', icon: <IconShieldTopRated className="w-16 h-16" />, color: 'from-amber-500/20 to-orange-500/20', desc: 'Sustained peak performance' },
                            { name: 'Top Rated Plus', icon: <IconShieldTopRatedPlus className="w-16 h-16" />, color: 'from-rose-500/20 to-purple-500/20', desc: 'Elite large project success' },
                            { name: 'Expert', icon: <IconShieldExpert className="w-16 h-16" />, color: 'from-emerald-500/20 to-teal-500/20', desc: 'Mastery in technical domains' },
                        ].map((badge, i) => (
                            <div key={i} className="relative py-10 px-6 rounded-2xl bg-black border border-white/5 overflow-hidden">
                                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                                    <div className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                                        {badge.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">{badge.name}</h3>
                                        <p className="text-[10px] text-gray-500 mt-2 font-medium leading-relaxed">{badge.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Current Rankings Table */}
            <ElevatedMetallicCard title="Current Freelancer Rankings">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Freelancer</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Reviews</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Avg Rating</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Lifetime Earnings</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Bayesian Score</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Badge</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rankings.map((r, i) => (
                                <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-white uppercase tracking-tight">{r.freelancer_name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-mono text-gray-400">{r.review_count}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-brand-primary">
                                            <IconStar size={12} />
                                            <span className="text-sm font-black">{r.avg_rating?.toFixed(1) || '0.0'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold font-mono">
                                            <span>${r.lifetime_earnings?.toLocaleString() || '0'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-primary"
                                                    style={{ width: `${(r.adjusted_score / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-black text-white">{r.adjusted_score?.toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider !border-none ${r.badge_status === 'Expert' ? 'bg-emerald-500/10 text-emerald-400' :
                                                r.badge_status === 'Top Rated Plus' ? 'bg-purple-500/10 text-purple-400' :
                                                    r.badge_status === 'Top Rated' ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {r.badge_status}
                                            </span>
                                            {r.badge_status === 'Expert' && <IconShieldExpert size={16} />}
                                            {r.badge_status === 'Top Rated Plus' && <IconShieldTopRatedPlus size={16} />}
                                            {r.badge_status === 'Top Rated' && <IconShieldTopRated size={16} />}
                                            {r.badge_status === 'Rising Talent' && <IconShieldNew size={16} />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ElevatedMetallicCard>
        </div>
    );

    const renderFreelancerAlgo = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {tableError ? (
                <ElevatedMetallicCard title="Setup Required">
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-brand-warning/10 flex items-center justify-center text-brand-warning">
                            <IconAlertTriangle size={32} />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">Database Setup Needed</h3>
                            <p className="text-sm text-gray-500 font-medium">
                                The ranking system requires the full multi-level `algorithm_config` table and `freelancer_performance_ranking` view.
                            </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-black border border-white/5 w-full text-left font-mono text-[10px] text-brand-primary overflow-x-auto max-h-60">
                            <pre className="whitespace-pre-wrap">{`-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS algorithm_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name text UNIQUE NOT NULL,
    metric_value numeric NOT NULL DEFAULT 0,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Seed Ranking Parameters (Full 4-Tier)
INSERT INTO algorithm_config (metric_name, metric_value, description) VALUES
('Confidence Threshold (m)', 5, 'Min reviews needed before a freelancer rating is fully trusted'),
('Rising Talent Score Min', 4.0, 'Min Bayesian score for Rising Talent'),
('Rising Talent Project Min', 2, 'Min projects for Rising Talent'),
('Rising Talent Earnings Min', 0, 'Min earnings for Rising Talent'),
('Top Rated Score Min', 4.7, 'Min Bayesian score for Top Rated'),
('Top Rated Project Min', 10, 'Min projects for Top Rated'),
('Top Rated Earnings Min', 500, 'Min earnings for Top Rated'),
('Top Rated Plus Score Min', 4.85, 'Min Bayesian score for Top Rated Plus'),
('Top Rated Plus Project Min', 30, 'Min projects for Top Rated Plus'),
('Top Rated Plus Earnings Min', 2500, 'Min earnings for Top Rated Plus'),
('Expert Score Min', 4.95, 'Min Bayesian score for Expert'),
('Expert Project Min', 50, 'Min projects for Expert'),
('Expert Earnings Min', 10000, 'Min earnings for Expert')
ON CONFLICT (metric_name) DO UPDATE SET metric_value = EXCLUDED.metric_value;

-- Advanced Ranking View
CREATE OR REPLACE VIEW freelancer_performance_ranking AS
WITH site_stats AS (
    SELECT AVG(rating) as site_avg_rating, 5 as m_threshold FROM project_reviews
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
    GROUP BY p.assignee
)
SELECT 
    fs.*,
    ((fs.review_count / (fs.review_count + 5)) * fs.avg_rating) + 
    ((5 / (fs.review_count + 5)) * 4.5) as adjusted_score,
    CASE 
        WHEN fs.review_count >= 50 AND fs.lifetime_earnings >= 10000 THEN 'Expert'
        WHEN fs.review_count >= 10 AND fs.lifetime_earnings >= 500 THEN 'Top Rated' 
        ELSE 'Rising Talent' 
    END as badge_status
FROM freelancer_stats fs;`}</pre>
                        </div>
                        <Button
                            variant="metallic"
                            onClick={fetchConfigs}
                            leftIcon={<IconRotateCcw size={14} />}
                        >
                            Refresh After Running SQL
                        </Button>
                    </div>
                </ElevatedMetallicCard>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <ElevatedMetallicCard
                            title="Prestige Tier Logic Tuning"
                            rightElement={
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchConfigs}
                                        leftIcon={<IconRotateCcw size={14} />}
                                    >
                                        Reset
                                    </Button>
                                    <Button
                                        variant="metallic"
                                        size="sm"
                                        onClick={handleSave}
                                        isLoading={isSaving}
                                        leftIcon={<IconSave size={14} />}
                                    >
                                        Save Algorithm
                                    </Button>
                                </div>
                            }
                        >
                            <div className="space-y-8">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => (
                                            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        {/* Group by category */}
                                        {[
                                            { title: 'Confidence Logic', items: configs.filter(c => c.metric_name.includes('Confidence')) },
                                            { title: 'Rising Talent Gate', items: configs.filter(c => c.metric_name.includes('Rising')) },
                                            { title: 'Top Rated Gate', items: configs.filter(c => c.metric_name.includes('Top Rated ') && !c.metric_name.includes('Plus')) },
                                            { title: 'Top Rated Plus Gate', items: configs.filter(c => c.metric_name.includes('Plus')) },
                                            { title: 'Expert Gate', items: configs.filter(c => c.metric_name.includes('Expert')) },
                                        ].filter(g => g.items.length > 0).map((group, idx) => (
                                            <div key={idx} className="space-y-4">
                                                <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.25em] pl-2">{group.title}</h4>
                                                <div className="space-y-3">
                                                    {group.items.map((config) => (
                                                        <div key={config.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-brand-primary/20 transition-all duration-300">
                                                            <div className="flex items-center justify-between gap-6">
                                                                <div className="space-y-0.5 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">
                                                                            {config.metric_name}
                                                                        </h3>
                                                                        {config.metric_name.includes('Earnings') && (
                                                                            <IconDollar size={10} className="text-emerald-500" />
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-500 font-medium opacity-70">
                                                                        {config.description}
                                                                    </p>
                                                                </div>
                                                                <div className="w-24">
                                                                    <Input
                                                                        type="number"
                                                                        step={config.metric_name.includes('Score') ? "0.01" : "1"}
                                                                        size="sm"
                                                                        variant="metallic"
                                                                        value={config.metric_value}
                                                                        onChange={(e) => handleConfigChange(config.id, e.target.value)}
                                                                        className="text-right font-bold text-white pr-4"
                                                                        leftIcon={config.metric_name.includes('Earnings') ? <span className="text-[10px] text-white/50">$</span> : undefined}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ElevatedMetallicCard>
                    </div>

                    {/* Info Panel */}
                    <div className="space-y-6">
                        <ElevatedMetallicCard title="Algorithm Guide">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <IconActivity size={14} className="text-brand-primary" />
                                        <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Bayesian Averaging</h4>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Prevents freelancers with only 1 review from dominating the top spots. The higher the Confidence Threshold (m), the more project reviews a freelancer needs to prove their rating.
                                    </p>
                                </div>
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <IconShieldTopRated size={14} className="text-amber-400" />
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Badge Logic</h4>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Badges are calculated based on the <b>Adjusted Bayesian Score</b> and total <b>Project Volume</b>. Any active dispute disqualifies a freelancer from Top Rated status.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                                    <IconInfo size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-blue-300 font-medium italic italic leading-normal">
                                        Note: Site-wide average rating is automatically factored in as the 'prior' for Bayesian calculations.
                                    </p>
                                </div>
                            </div>
                        </ElevatedMetallicCard>
                    </div>
                </div>
            )}
        </div>
    );

    const renderPMAlgo = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-500">
                <IconBriefcase size={32} />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-wider">PM-Specific Metrics Coming Soon</h3>
                <p className="text-sm text-gray-500 font-medium">Currently focused on Freelancer prestige and ranking logic.</p>
            </div>
        </div>
    );


    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">

            {/* Navigation Tabs */}
            <div className="flex justify-start">
                <Tabs
                    tabs={[
                        { id: 'overview', label: 'Overview', icon: <IconLayers size={14} /> },
                        { id: 'freelancer', label: 'Freelancer Algo', icon: <IconUsers size={14} /> },
                        { id: 'pm', label: 'Project Manager Algo', icon: <IconBriefcase size={14} /> },
                    ]}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as any)}
                />
            </div>

            {/* Active Section Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'freelancer' && renderFreelancerAlgo()}
                {activeTab === 'pm' && renderPMAlgo()}
            </div>
        </div>
    );
};

export default AlgorithmStudio;
