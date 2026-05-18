import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'metallic' | 'tier-new' | 'tier-top-rated' | 'tier-top-rated-plus' | 'tier-expert';
    size?: 'sm' | 'md';
    className?: string;
    icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'secondary',
    size = 'md',
    className = '',
    icon
}) => {
    const variants = {
        primary: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
        secondary: 'bg-white/5 text-gray-400 border-white/10',
        success: 'bg-brand-success/10 text-brand-success border-brand-success/20',
        warning: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20',
        error: 'bg-brand-error/10 text-brand-error border-brand-error/20',
        ghost: 'bg-transparent text-gray-500 border-white/5',
        metallic: 'bg-black/40 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        'tier-new': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
        'tier-top-rated': 'bg-gradient-to-br from-blue-500/20 to-blue-700/20 text-blue-300 border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] backdrop-blur-sm',
        'tier-top-rated-plus': 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-amber-300 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-sm',
        'tier-expert': 'bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-700/20 text-fuchsia-300 border-fuchsia-400/30 shadow-[0_0_20px_rgba(217,70,239,0.2)] backdrop-blur-sm',
    };

    const sizes = {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2 py-0.5 text-[10px]'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-widest rounded-md border ${variants[variant]} ${sizes[size]} ${className}`}>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </span>
    );
};

export const getRoleCapsuleClasses = (role: string) => {
    if (!role) return '';
    const r = role.toLowerCase().trim();
    const baseCapsule = '!border-none !rounded-md !px-3 !py-1 !tracking-wider !text-[10px] whitespace-nowrap !min-w-max text-center';
    
    // Super Admin: Emerald/Green
    if (r === 'super admin' || r === 'superadmin') return `${baseCapsule} bg-emerald-500/20 text-emerald-500`;
    // Admin: Rose/Red
    if (r === 'admin') return `${baseCapsule} bg-rose-500/20 text-rose-500`;
    // Project Manager, Project Operations Manager, etc: Amber
    if (r.includes('manager')) return `${baseCapsule} bg-amber-600/20 text-amber-500`;
    // Agent / Sales: Blue
    if (r.includes('agent') || r.includes('sales')) return `${baseCapsule} bg-blue-500/20 text-blue-400`;
    // Freelancer, Designer, etc: Fuchsia
    if (r.includes('freelancer') || r.includes('designer')) return `${baseCapsule} bg-fuchsia-500/20 text-fuchsia-400`;
    // Fallback: Gray
    return `${baseCapsule} bg-gray-500/20 text-gray-400`;
};

export const getStatusCapsuleClasses = (status: string) => {
    if (!status) return '';
    const s = status.toLowerCase().trim();
    const baseCapsule = '!border-none !rounded-md !px-3 !py-1 !tracking-wider !text-[10px] whitespace-nowrap !min-w-max text-center font-black uppercase';
    
    // Approved, Success, Active
    if (s.includes('approved') || s.includes('success') || s.includes('active')) 
        return `${baseCapsule} bg-green-600/20 text-green-600`;
        
    // In Progress, Working, Open, Interested
    if (s.includes('progress') || s.includes('working') || s.includes('open') || s === 'pending' || s.includes('interested')) 
        return `${baseCapsule} bg-amber-600/20 text-amber-600`;
        
    // Done, Completed, Delivered, Converted, Upsell Won
    if (s.includes('done') || s.includes('complete') || s.includes('delivered') || s.includes('converted') || s.includes('won')) 
        return `${baseCapsule} bg-sky-500/20 text-sky-500`;
        
    // Revision
    if (s.includes('revision')) 
        return `${baseCapsule} bg-orange-600/20 text-orange-500`;
        
    // Final Files
    if (s.includes('final files')) 
        return `${baseCapsule} bg-indigo-600/20 text-indigo-500`;
        
    // Urgent, Error, Cancelled, Lost
    if (s.includes('urgent') || s.includes('error') || s.includes('cancelled') || s.includes('removed') || s.includes('lost')) 
        return `${baseCapsule} bg-red-600/20 text-red-600`;
        
    // QA Workflow
    if (s.includes('qa') || s.includes('sent for qa')) 
        return `${baseCapsule} bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]`;

    // Sent For Approval, Offer Sent, Upsell Sent
    if (s.includes('sent') || s.includes('approval')) 
        return `${baseCapsule} bg-emerald-500/20 text-emerald-600`;

    // New Leads
    if (s === 'new')
        return `${baseCapsule} bg-blue-500/20 text-blue-400`;
        
    return `${baseCapsule} bg-gray-500/20 text-gray-400`;
};

export const getStatusTextColor = (status: string) => {
    if (!status) return 'text-gray-400';
    const s = status.toLowerCase().trim();
    
    if (s.includes('approved') || s.includes('success') || s.includes('active')) return 'text-green-600';
    if (s.includes('progress') || s.includes('working') || s.includes('open') || s === 'pending' || s.includes('interested')) return 'text-amber-600';
    if (s.includes('done') || s.includes('complete') || s.includes('delivered') || s.includes('converted') || s.includes('won')) return 'text-sky-500';
    if (s.includes('revision')) return 'text-orange-500';
    if (s.includes('final files')) return 'text-indigo-500';
    if (s.includes('urgent') || s.includes('error') || s.includes('cancelled') || s.includes('removed') || s.includes('lost')) return 'text-red-600';
    if (s.includes('qa') || s.includes('sent for qa')) return 'text-amber-500';
    if (s.includes('sent') || s.includes('approval')) return 'text-emerald-600';
    if (s === 'new') return 'text-blue-400';
    
    return 'text-gray-400';
};

export const getAccountCapsuleClasses = () => {
    return '!border-none !rounded-md !px-3 !py-1 !tracking-wider !text-[10px] whitespace-nowrap !min-w-max text-center font-black uppercase bg-brand-primary/10 text-brand-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]';
};

export const RoleCapsule: React.FC<{ role: string, className?: string }> = ({ role, className = '' }) => {
    return (
        <span className={`inline-flex items-center justify-center font-black uppercase ${getRoleCapsuleClasses(role)} ${className}`}>
            {role || 'Unknown'}
        </span>
    );
};
