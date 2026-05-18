import React, { useState } from 'react';
import { IconCheckCircle, IconInfo, IconStar, IconBriefcase, IconDollar, IconShieldNew, IconShieldTopRated, IconShieldTopRatedPlus, IconShieldExpert } from '../components/Icons';

const tiers = [
    {
        id: 'new_talent',
        label: 'New Talent',
        sublabel: 'Starting point',
        icon: <IconInfo size={28} className="text-gray-400" />,
        shield: null,
        gradient: 'from-gray-700/40 to-gray-900/40',
        border: 'border-white/10',
        accentColor: 'text-gray-400',
        badgeClass: 'bg-white/5 text-gray-500 border-white/10',
        glow: '',
        description: 'Every freelancer starts here. This is your entry point into the CodesLogic platform. Your profile is visible to project managers and you can receive projects.',
        requirements: [
            { icon: <IconCheckCircle size={14} />, label: 'Active account', met: true },
            { icon: <IconCheckCircle size={14} />, label: 'Profile completed', met: true },
            { icon: <IconCheckCircle size={14} />, label: 'No minimum rating required', met: true },
        ],
        gates: [],
        tip: 'Complete your first project and get a review to start climbing the ladder!'
    },
    {
        id: 'rising_talent',
        label: 'Rising Talent',
        sublabel: 'Tier 1 — Starting prestige',
        icon: <IconShieldNew size={32} className="text-teal-400" />,
        shield: 'rising',
        gradient: 'from-teal-900/30 to-slate-900/40',
        border: 'border-teal-500/20',
        accentColor: 'text-teal-400',
        badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        glow: 'shadow-teal-500/10',
        description: 'You have proven yourself on the platform. Rising Talent means you are an active, reliable contributor with solid ratings and a clean track record.',
        requirements: [
            { icon: <IconStar size={14} />, label: 'Min Bayesian Score: 4.0 / 5.0' },
            { icon: <IconBriefcase size={14} />, label: 'Min Completed Projects: 2' },
            { icon: <IconDollar size={14} />, label: 'Min Lifetime Earnings: $0' },
            { icon: <IconCheckCircle size={14} />, label: 'Zero active disputes' },
        ],
        gates: ['Score', 'Projects'],
        tip: 'Focus on delivering quality work consistently. Every 5-star review strengthens your Bayesian score!'
    },
    {
        id: 'top_rated',
        label: 'Top Rated',
        sublabel: 'Tier 2 — Sustained excellence',
        icon: <IconShieldTopRated size={32} className="text-amber-400" />,
        shield: 'top_rated',
        gradient: 'from-amber-900/30 to-slate-900/40',
        border: 'border-amber-500/20',
        accentColor: 'text-amber-400',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        glow: 'shadow-amber-500/10',
        description: 'Top Rated is reserved for freelancers who have demonstrated consistent, high-quality output over a meaningful volume of projects. This badge signals trust and reliability.',
        requirements: [
            { icon: <IconStar size={14} />, label: 'Min Bayesian Score: 4.7 / 5.0' },
            { icon: <IconBriefcase size={14} />, label: 'Min Completed Projects: 10' },
            { icon: <IconDollar size={14} />, label: 'Min Lifetime Earnings: $500' },
            { icon: <IconCheckCircle size={14} />, label: 'Zero active disputes' },
        ],
        gates: ['Score', 'Projects', 'Earnings'],
        tip: 'With 10 projects and $500 in earnings, you have real skin in the game. Protect your score!'
    },
    {
        id: 'top_rated_plus',
        label: 'Top Rated Plus',
        sublabel: 'Tier 3 — Elite performance',
        icon: <IconShieldTopRatedPlus size={32} className="text-purple-400" />,
        shield: 'top_rated_plus',
        gradient: 'from-purple-900/30 to-slate-900/40',
        border: 'border-purple-500/20',
        accentColor: 'text-purple-400',
        badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        glow: 'shadow-purple-500/10',
        description: 'Top Rated Plus is for the elite — freelancers who have mastered their craft at scale. You are a core part of the CodesLogic talent ecosystem.',
        requirements: [
            { icon: <IconStar size={14} />, label: 'Min Bayesian Score: 4.85 / 5.0' },
            { icon: <IconBriefcase size={14} />, label: 'Min Completed Projects: 30' },
            { icon: <IconDollar size={14} />, label: 'Min Lifetime Earnings: $2,500' },
            { icon: <IconCheckCircle size={14} />, label: 'Zero active disputes' },
        ],
        gates: ['Score', 'Projects', 'Earnings'],
        tip: 'This tier recognizes sustained volume + quality. Disputes will immediately drop you back — protect your record!'
    },
    {
        id: 'expert',
        label: 'Expert',
        sublabel: 'Tier 4 — Masters in technical domains',
        icon: <IconShieldExpert size={32} className="text-yellow-400" />,
        shield: 'expert',
        gradient: 'from-yellow-900/30 to-amber-900/20',
        border: 'border-yellow-500/30',
        accentColor: 'text-yellow-400',
        badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        glow: 'shadow-yellow-500/15',
        description: 'Expert is the highest honor on CodesLogic. It is awarded algorithmically to freelancers who have proven an exceptional level of skill, volume, and reliability over a long period. This badge is extremely difficult to achieve and nearly impossible to fake.',
        requirements: [
            { icon: <IconStar size={14} />, label: 'Min Bayesian Score: 4.95 / 5.0' },
            { icon: <IconBriefcase size={14} />, label: 'Min Completed Projects: 50' },
            { icon: <IconDollar size={14} />, label: 'Min Lifetime Earnings: $10,000' },
            { icon: <IconCheckCircle size={14} />, label: 'Zero active disputes — ever' },
        ],
        gates: ['Score', 'Projects', 'Earnings'],
        tip: 'Expert is earned automatically when ALL gates are met. You cannot request or buy this badge.'
    },
];

const BayesianExplainer: React.FC = () => (
    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <IconInfo size={20} />
            </div>
            <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">How is my Score calculated?</h3>
                <p className="text-[11px] text-gray-500">Bayesian confidence-weighted rating</p>
            </div>
        </div>
        <div className="space-y-3 text-[12px] text-gray-400 leading-relaxed">
            <p>
                Your <span className="text-white font-bold">Bayesian Score</span> is not just your average rating — it factors in <span className="text-brand-primary font-bold">how many reviews you have</span>.
            </p>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 font-mono text-[11px] text-brand-primary">
                Score = (Reviews / (Reviews + M)) × Avg Rating<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (M / (Reviews + M)) × Platform Average
            </div>
            <p>
                <span className="text-white font-bold">M</span> is the confidence threshold (default: 5 reviews). With fewer than M reviews, your score is pulled closer to the platform average to prevent gaming the system.
            </p>
            <p className="text-gray-500">
                Example: A freelancer with <span className="text-amber-400 font-bold">2 reviews</span> averaging <span className="text-amber-400 font-bold">5.0 stars</span> would have a Bayesian Score closer to the platform average, <em>not</em> 5.0 — because the sample is too small to trust fully.
            </p>
        </div>
    </div>
);

const TierCard: React.FC<{ tier: typeof tiers[0]; isActive: boolean; onClick: () => void }> = ({ tier, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${isActive
            ? `bg-gradient-to-br ${tier.gradient} ${tier.border} shadow-xl ${tier.glow}`
            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
            }`}
    >
        <div className="flex items-center gap-3">
            <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {tier.icon}
            </div>
            <div>
                <div className={`text-sm font-black uppercase tracking-wider ${isActive ? tier.accentColor : 'text-gray-300'}`}>
                    {tier.label}
                </div>
                <div className="text-[10px] text-gray-500 font-medium">{tier.sublabel}</div>
            </div>
        </div>
    </button>
);

const FreelancerLevelsGuide: React.FC = () => {
    const [activeTier, setActiveTier] = useState('rising_talent');
    const selected = tiers.find(t => t.id === activeTier) || tiers[1];

    const largeIconMap: Record<string, React.ReactNode> = {
        new_talent: <IconInfo size={44} className="text-gray-400" />,
        rising_talent: <IconShieldNew size={44} className="text-teal-400" />,
        top_rated: <IconShieldTopRated size={44} className="text-amber-400" />,
        top_rated_plus: <IconShieldTopRatedPlus size={44} className="text-purple-400" />,
        expert: <IconShieldExpert size={44} className="text-yellow-400" />,
    };

    const smallIconMap: Record<string, React.ReactNode> = {
        rising_talent: <IconShieldNew size={16} className="text-teal-400" />,
        top_rated: <IconShieldTopRated size={16} className="text-amber-400" />,
        top_rated_plus: <IconShieldTopRatedPlus size={16} className="text-purple-400" />,
        expert: <IconShieldExpert size={16} className="text-yellow-400" />,
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <IconShieldExpert size={24} className="text-yellow-400" />
                    <h1 className="text-2xl font-black text-white tracking-tight">Freelancer Level Guide</h1>
                </div>
                <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
                    Understand what it takes to climb the prestige ladder at CodesLogic. All badges are awarded <span className="text-white font-semibold">automatically by the system</span> — you cannot request or purchase them.
                </p>
                <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-brand-primary/5 border border-brand-primary/10 rounded-xl w-fit">
                    <IconInfo size={12} className="text-brand-primary" />
                    <span className="text-[11px] text-brand-primary font-bold">Read-only — Parameters are set by platform administrators</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tier Navigation */}
                <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] px-2 mb-3">Select a Level</h3>
                    {tiers.map(tier => (
                        <TierCard
                            key={tier.id}
                            tier={tier}
                            isActive={activeTier === tier.id}
                            onClick={() => setActiveTier(tier.id)}
                        />
                    ))}
                </div>

                {/* Tier Detail Panel */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Main Card */}
                    <div className={`p-8 rounded-3xl border bg-gradient-to-br ${selected.gradient} ${selected.border} shadow-2xl relative overflow-hidden transition-all duration-500`}>
                        {/* Ambient Glow */}
                        <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br ${selected.gradient} opacity-30 blur-3xl pointer-events-none`} />

                        <div className="relative z-10 space-y-6">
                            {/* Tier Header */}
                            <div className="flex items-start gap-5">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border ${selected.border} bg-black/30 shadow-2xl`}>
                                    {largeIconMap[selected.id]}
                                </div>
                                <div className="flex-1">
                                    <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${selected.accentColor} mb-1`}>
                                        {selected.sublabel}
                                    </div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">{selected.label}</h2>
                                    <div className={`mt-2 inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selected.badgeClass}`}>
                                        Prestige Badge
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-6">
                                {selected.description}
                            </p>

                            {/* Requirements */}
                            <div className="space-y-3">
                                <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${selected.accentColor}`}>Requirements</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selected.requirements.map((req, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-3 p-3 rounded-2xl bg-black/40 border ${selected.border}`}
                                        >
                                            <span className={selected.accentColor}>{req.icon}</span>
                                            <span className="text-sm text-white font-semibold">{req.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pro Tip */}
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-black/30 border border-white/5">
                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${selected.badgeClass} border`}>
                                    <IconInfo size={12} />
                                </div>
                                <div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${selected.accentColor} mb-0.5`}>Pro Tip</div>
                                    <p className="text-xs text-gray-400 leading-relaxed">{selected.tip}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dispute Warning */}
                    {selected.id !== 'new_talent' && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-950/20 border border-red-500/20">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500/10 text-red-400">
                                <IconInfo size={14} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-0.5">Important — Disputes</div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Any <span className="text-red-400 font-bold">active dispute</span> will immediately revoke your prestige badge and move you back to <span className="text-white font-bold">New Talent</span> status, regardless of your score or earnings. Disputes are taken very seriously on this platform.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Scoring Explainer */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] px-2">Understanding Your Score</h3>
                <BayesianExplainer />
            </div>

            {/* All Tiers Comparison Table */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] px-2">Full Requirements Overview</h3>
                <div className="rounded-3xl border border-white/5 overflow-hidden bg-black/20">
                    <div className="grid grid-cols-5 bg-white/[0.03] border-b border-white/5">
                        <div className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Level</div>
                        <div className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Min Score</div>
                        <div className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Min Projects</div>
                        <div className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Min Earnings</div>
                        <div className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Disputes</div>
                    </div>
                    {tiers.slice(1).map((tier, i) => (
                        <div
                            key={tier.id}
                            className={`grid grid-cols-5 border-b border-white/5 last:border-0 transition-colors duration-200 cursor-pointer ${activeTier === tier.id ? `bg-gradient-to-r ${tier.gradient}` : 'hover:bg-white/[0.02]'}`}
                            onClick={() => setActiveTier(tier.id)}
                        >
                            <div className="px-5 py-4 flex items-center gap-3">
                                {smallIconMap[tier.id]}
                                <span className={`text-sm font-black ${tier.accentColor}`}>{tier.label}</span>
                            </div>
                            <div className="px-5 py-4 text-center">
                                <span className="text-sm font-bold text-white">{['4.0', '4.7', '4.85', '4.95'][i]}</span>
                                <span className="text-xs text-gray-600"> / 5</span>
                            </div>
                            <div className="px-5 py-4 text-center">
                                <span className="text-sm font-bold text-white">{[2, 10, 30, 50][i]}</span>
                            </div>
                            <div className="px-5 py-4 text-center">
                                <span className={`text-sm font-bold ${tier.accentColor}`}>{['$0', '$500', '$2,500', '$10,000'][i]}</span>
                            </div>
                            <div className="px-5 py-4 text-center">
                                <span className="text-xs font-black text-red-400 uppercase tracking-widest">Zero</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 pb-2">
                <p className="text-[11px] text-gray-600">
                    Level requirements are set by CodesLogic administrators and may change over time. Badges are awarded and revoked automatically by the system.
                </p>
            </div>
        </div>
    );
};

export default FreelancerLevelsGuide;
