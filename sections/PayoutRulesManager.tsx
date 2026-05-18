
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, ElevatedMetallicCard } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { IconTrash, IconPlus, IconZap, IconAlertTriangle, IconLoader, IconDollar, IconPowerToggle } from '../components/Icons';
import { addToast } from '../components/Toast';

const PayoutRulesManager: React.FC = () => {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newRule, setNewRule] = useState({
        min_price: '',
        max_price: '',
        payout_amount: '',
        description: ''
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payout_rules')
                .select('*')
                .order('min_price', { ascending: true });

            if (error) throw error;
            setRules(data || []);
        } catch (error: any) {
            console.error('Error fetching rules:', error);
            addToast({ type: 'error', title: 'Fetch Failed', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async () => {
        if (!newRule.min_price || !newRule.max_price || !newRule.payout_amount) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Please fill in all price fields.' });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('payout_rules')
                .insert([{
                    min_price: parseFloat(newRule.min_price),
                    max_price: parseFloat(newRule.max_price),
                    payout_amount: parseFloat(newRule.payout_amount),
                    description: newRule.description,
                    is_active: true
                }]);

            if (error) throw error;
            
            addToast({ type: 'success', title: 'Rule Added', message: 'New payout tier has been created.' });
            setNewRule({ min_price: '', max_price: '', payout_amount: '', description: '' });
            fetchRules();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Save Failed', message: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (id: string) => {
        try {
            const { error } = await supabase
                .from('payout_rules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            addToast({ type: 'success', title: 'Rule Removed', message: 'The tier has been deleted.' });
            setRules(rules.filter(r => r.id !== id));
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        }
    };

    const handleToggleActive = async (rule: any) => {
        try {
            const { error } = await supabase
                .from('payout_rules')
                .update({ is_active: !rule.is_active })
                .eq('id', rule.id);

            if (error) throw error;
            setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !rule.is_active } : r));
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Configuration Overview */}
            <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-3xl p-9 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary shrink-0 shadow-lg">
                    <IconZap size={32} />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Global Tiered Payouts</h2>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed">
                        Define automated pricing tiers for freelancers. When a user's strategy is set to <span className="text-brand-primary font-bold">"Tiered (Auto)"</span>, 
                        the system will use these rules to determine the designer fee based on the project's base price.
                    </p>
                </div>
            </div>

            {/* 2. Add New Rule Form */}
            <ElevatedMetallicCard title="Define New Tier" headerClassName="px-8 py-4" bodyClassName="p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <Input 
                        label="Min Project Price ($)"
                        type="number"
                        placeholder="0.00"
                        value={newRule.min_price}
                        onChange={(e) => setNewRule({...newRule, min_price: e.target.value})}
                        variant="metallic"
                    />
                    <Input 
                        label="Max Project Price ($)"
                        type="number"
                        placeholder="999.00"
                        value={newRule.max_price}
                        onChange={(e) => setNewRule({...newRule, max_price: e.target.value})}
                        variant="metallic"
                    />
                    <Input 
                        label="Payout Amount ($)"
                        type="number"
                        placeholder="0.00"
                        value={newRule.payout_amount}
                        onChange={(e) => setNewRule({...newRule, payout_amount: e.target.value})}
                        variant="metallic"
                    />
                    <Button 
                        variant="metallic"
                        leftIcon={<IconPlus size={16} />}
                        onClick={handleAddRule}
                        isLoading={saving}
                        className="h-[52px] shadow-lg shadow-brand-primary/20"
                    >
                        Create Rule
                    </Button>
                </div>
                <div className="mt-4">
                    <Input 
                        label="Rule Description (Optional)"
                        placeholder="e.g. Standard $5 project tier"
                        value={newRule.description}
                        onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                        variant="metallic"
                    />
                </div>
            </ElevatedMetallicCard>

            {/* 3. Rules List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Active Payout Tiers</h3>
                    <span className="text-[10px] font-bold text-brand-primary/60 uppercase">{rules.length} Rules Defined</span>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4 bg-black/20 rounded-3xl border border-white/5">
                        <IconLoader className="w-8 h-8 text-brand-primary animate-spin" />
                        <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Fetching rules...</p>
                    </div>
                ) : rules.length === 0 ? (
                    <div className="p-20 text-center bg-black/20 rounded-3xl border border-white/5 space-y-4">
                        <IconAlertTriangle className="w-12 h-12 text-gray-600 mx-auto" />
                        <p className="text-sm text-gray-500 font-medium">No rules defined yet. System will fallback to $0 payout.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {rules.map((rule) => (
                            <div 
                                key={rule.id}
                                className={`group relative p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-6 ${rule.is_active ? 'bg-white/[0.03] border-white/10 hover:border-brand-primary/40' : 'bg-black/40 border-white/5 opacity-60 grayscale'}`}
                            >
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${rule.is_active ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 'bg-gray-500/10 border-gray-500/20 text-gray-500'}`}>
                                        <IconDollar size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {rule.description && (
                                            <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.15em] mb-2">{rule.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-xl font-black text-white leading-none">
                                                ${parseFloat(rule.payout_amount).toFixed(2)}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payout Amount</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500">For projects between</span>
                                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-black text-white">
                                                ${parseFloat(rule.min_price).toFixed(2)} - ${parseFloat(rule.max_price).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleToggleActive(rule)}
                                        className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 relative group/toggle ${rule.is_active 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:bg-emerald-500 hover:text-white' 
                                            : 'bg-white/[0.03] text-gray-600 border border-white/5 shadow-inner hover:bg-white/10 hover:text-white hover:border-white/20'}`}
                                        title={rule.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                                    >
                                        <IconPowerToggle size={22} strokeWidth={2.5} className="drop-shadow-sm" />
                                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${rule.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-700'}`} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteRule(rule.id)}
                                        className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all duration-300 shadow-lg shadow-black/20 hover:bg-rose-500 hover:text-white hover:border-rose-400 hover:shadow-rose-500/20 group/delete"
                                        title="Delete Rule"
                                    >
                                        <IconTrash size={20} className="group-hover/delete:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-start gap-4">
                <IconAlertTriangle className="text-yellow-500 shrink-0 w-5 h-5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Admin Note</p>
                    <p className="text-[11px] text-yellow-500/70 font-medium leading-relaxed">
                        Ensure tiers do not overlap to avoid unpredictable results. The system takes the most recently created applicable rule in case of conflicts.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PayoutRulesManager;
