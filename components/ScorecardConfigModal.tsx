import React, { useState, useEffect } from 'react';
import { Modal } from './Surfaces';
import Button from './Button';
import { Tabs } from './Navigation';
import { IconEdit, IconTrash, IconPlus, IconTarget, IconTrendingUp, IconSettings, IconList, IconAlertTriangle } from './Icons';
import { Input } from './Input';
import { Dropdown } from './Dropdown';
import { supabase } from '../lib/supabase';
import { addToast } from './Toast';
import { trackUserAction } from '../utils/scorecardTracking';

interface ScorecardConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: { id: string; name: string }[];
}

export const ScorecardConfigModal: React.FC<ScorecardConfigModalProps> = ({ isOpen, onClose, users }) => {
    const [configTab, setConfigTab] = useState<'categories' | 'rules' | 'targets'>('categories');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [categories, setCategories] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [targets, setTargets] = useState<any[]>([]);

    const [editingCategory, setEditingCategory] = useState<any | null>(null);
    const [editingRule, setEditingRule] = useState<any | null>(null);
    const [editingTarget, setEditingTarget] = useState<any | null>(null);

    const [itemToDelete, setItemToDelete] = useState<{ type: string, id: string, name?: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        } else {
            // Reset state when closing
            setEditingCategory(null);
            setEditingRule(null);
            setEditingTarget(null);
            setItemToDelete(null);
        }
    }, [isOpen]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [catRes, rulesRes, targetsRes] = await Promise.all([
                supabase.from('scorecard_categories').select('*').order('name'),
                supabase.from('scorecard_rules').select('*').order('action_type'),
                supabase.from('scorecard_targets').select('*').order('metric')
            ]);
            
            if (catRes.error) throw catRes.error;
            if (rulesRes.error) throw rulesRes.error;
            if (targetsRes.error) throw targetsRes.error;

            setCategories(catRes.data || []);
            setRules(rulesRes.data || []);
            setTargets(targetsRes.data || []);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Fetch Error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCategory = async () => {
        if (!editingCategory?.name) return;
        setIsSaving(true);
        try {
            if (editingCategory.id === 'new') {
                const { error } = await supabase.from('scorecard_categories').insert([{ name: editingCategory.name, is_active: editingCategory.is_active }]);
                if (error) throw error;
                addToast({ type: 'success', title: 'Saved', message: 'Category added successfully.' });
            } else {
                const { error } = await supabase.from('scorecard_categories').update({ name: editingCategory.name, is_active: editingCategory.is_active }).eq('id', editingCategory.id);
                if (error) throw error;
                addToast({ type: 'success', title: 'Updated', message: 'Category updated successfully.' });
            }
            setEditingCategory(null);
            fetchData();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRule = async () => {
        if (!editingRule?.action_type || !editingRule?.category_id || !editingRule?.weight) return;
        setIsSaving(true);
        try {
            if (editingRule.id === 'new') {
                const { error } = await supabase.from('scorecard_rules').insert([{ 
                    action_type: editingRule.action_type, 
                    category_id: editingRule.category_id, 
                    weight: editingRule.weight 
                }]);
                if (error) throw error;
                addToast({ type: 'success', title: 'Saved', message: 'Rule added successfully.' });
            } else {
                const { error } = await supabase.from('scorecard_rules').update({ 
                    action_type: editingRule.action_type, 
                    category_id: editingRule.category_id, 
                    weight: editingRule.weight 
                }).eq('id', editingRule.id);
                if (error) throw error;
                addToast({ type: 'success', title: 'Updated', message: 'Rule updated successfully.' });
            }
            setEditingRule(null);
            fetchData();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTarget = async () => {
        if (!editingTarget?.metric || !editingTarget?.target_value) return;
        setIsSaving(true);
        try {
            if (editingTarget.id === 'new') {
                const userIds = Array.isArray(editingTarget.user_id) ? editingTarget.user_id : [editingTarget.user_id || 'all'];
                
                if (userIds.includes('all') || userIds.length === 0) {
                    const payload = {
                        user_id: null,
                        metric: editingTarget.metric,
                        target_value: editingTarget.target_value,
                        timeframe: editingTarget.timeframe || 'daily'
                    };
                    const { error } = await supabase.from('scorecard_targets').insert([payload]);
                    if (error) throw error;
                } else {
                    const payloads = userIds.map((uid: string) => ({
                        user_id: uid,
                        metric: editingTarget.metric,
                        target_value: editingTarget.target_value,
                        timeframe: editingTarget.timeframe || 'daily'
                    }));
                    const { error } = await supabase.from('scorecard_targets').insert(payloads);
                    if (error) throw error;
                }
                addToast({ type: 'success', title: 'Saved', message: 'Target added successfully.' });
            } else {
                const payload = {
                    user_id: editingTarget.user_id === 'all' ? null : editingTarget.user_id,
                    metric: editingTarget.metric,
                    target_value: editingTarget.target_value,
                    timeframe: editingTarget.timeframe || 'daily'
                };
                const { error } = await supabase.from('scorecard_targets').update(payload).eq('id', editingTarget.id);
                if (error) throw error;
                addToast({ type: 'success', title: 'Updated', message: 'Target updated successfully.' });
            }
            setEditingTarget(null);
            fetchData();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        setIsSaving(true);
        try {
            const tableMap: any = {
                category: 'scorecard_categories',
                rule: 'scorecard_rules',
                target: 'scorecard_targets'
            };
            const { error } = await supabase.from(tableMap[itemToDelete.type]).delete().eq('id', itemToDelete.id);
            if (error) throw error;
            addToast({ type: 'success', title: 'Deleted', message: 'Item deleted successfully.' });
            setItemToDelete(null);
            fetchData();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    // User options for dropdown
    const userOptions = [
        { label: 'All Users', value: 'all' },
        ...users.map(u => ({ label: u.name, value: u.id }))
    ];

    const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));

    // Predefined action types (can be expanded)
    const actionTypeOptions = [
        { label: 'Comment', value: 'comment' },
        { label: 'Status Change', value: 'status_change' },
        { label: 'File Sent', value: 'file_sent' },
        { label: 'New Chat', value: 'new_chat' },
        { label: 'Existing Client Dealing', value: 'existing_client' },
    ];

    const renderCategories = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Manage Categories</h4>
                <Button variant="ghost" size="sm" leftIcon={<IconPlus size={14} />} onClick={() => setEditingCategory({ id: 'new', name: '', is_active: true })}>Add Category</Button>
            </div>
            
            {editingCategory && (
                <div className="p-4 rounded-lg bg-[#2A2A2A] border border-white/20 space-y-4">
                    <Input 
                        placeholder="Category Name" 
                        value={editingCategory.name} 
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})} 
                    />
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={editingCategory.is_active} onChange={(e) => setEditingCategory({...editingCategory, is_active: e.target.checked})} className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-primary focus:ring-brand-primary" />
                        <span className="text-sm text-gray-300">Active</span>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingCategory(null)}>Cancel</Button>
                        <Button variant="metallic" size="sm" onClick={handleSaveCategory} isLoading={isSaving}>Save</Button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {isLoading ? <div className="text-center py-4 text-gray-500">Loading...</div> : categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${cat.is_active ? 'bg-green-500' : 'bg-gray-600'}`} />
                            <span className="text-white font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingCategory(cat)}><IconEdit size={14} /></Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => setItemToDelete({type: 'category', id: cat.id, name: cat.name})}><IconTrash size={14} /></Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderRules = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Rule Definitions</h4>
                <Button variant="ghost" size="sm" leftIcon={<IconPlus size={14} />} onClick={() => setEditingRule({ id: 'new', action_type: '', category_id: '', weight: 1 })}>Add Rule</Button>
            </div>

            {editingRule && (
                <div className="p-4 rounded-lg bg-[#2A2A2A] border border-white/20 space-y-4">
                    <Dropdown
                        options={actionTypeOptions}
                        value={editingRule.action_type}
                        onChange={(val) => setEditingRule({...editingRule, action_type: val})}
                        placeholder="Select Action Type"
                    />
                    <Dropdown
                        options={categoryOptions}
                        value={editingRule.category_id}
                        onChange={(val) => setEditingRule({...editingRule, category_id: val})}
                        placeholder="Assign to Category"
                    />
                    <Input 
                        type="number"
                        placeholder="Weight / Score" 
                        value={editingRule.weight} 
                        onChange={(e) => setEditingRule({...editingRule, weight: Number(e.target.value)})} 
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingRule(null)}>Cancel</Button>
                        <Button variant="metallic" size="sm" onClick={handleSaveRule} isLoading={isSaving}>Save</Button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {isLoading ? <div className="text-center py-4 text-gray-500">Loading...</div> : rules.map((rule) => (
                    <div key={rule.id} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-white font-bold">{actionTypeOptions.find(o => o.value === rule.action_type)?.label || rule.action_type}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditingRule(rule)}><IconEdit size={14} /></Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => setItemToDelete({type: 'rule', id: rule.id, name: rule.action_type})}><IconTrash size={14} /></Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Category</p>
                                <p className="text-sm text-gray-300">{categories.find(c => c.id === rule.category_id)?.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Weight / Score</p>
                                <p className="text-sm text-brand-primary font-bold">+{rule.weight}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTargets = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">User Targets</h4>
                <Button variant="ghost" size="sm" leftIcon={<IconPlus size={14} />} onClick={() => setEditingTarget({ id: 'new', user_id: ['all'], metric: 'comment', target_value: 10, timeframe: 'daily' })}>Add Target</Button>
            </div>

            {editingTarget && (
                <div className="p-4 rounded-lg bg-[#2A2A2A] border border-white/20 space-y-4">
                    <Dropdown
                        options={userOptions}
                        value={editingTarget.user_id || (editingTarget.id === 'new' ? ['all'] : 'all')}
                        onChange={(val) => {
                            let nextVal = val;
                            if (editingTarget.id === 'new' && Array.isArray(val)) {
                                if (val.includes('all') && val.length > 1) {
                                    if (val[val.length - 1] === 'all') nextVal = ['all'];
                                    else nextVal = val.filter(v => v !== 'all');
                                }
                            }
                            setEditingTarget({...editingTarget, user_id: nextVal});
                        }}
                        placeholder="Select User"
                        showSearch
                        isMulti={editingTarget.id === 'new'}
                    />
                    <Dropdown
                        options={actionTypeOptions}
                        value={editingTarget.metric}
                        onChange={(val) => setEditingTarget({...editingTarget, metric: val as string})}
                        placeholder="Select Metric (Action Type)"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            type="number"
                            placeholder="Target Value" 
                            value={editingTarget.target_value} 
                            onChange={(e) => setEditingTarget({...editingTarget, target_value: Number(e.target.value)})} 
                        />
                        <Dropdown
                            options={[
                                { label: 'Daily', value: 'daily' },
                                { label: 'Weekly', value: 'weekly' },
                                { label: 'Monthly', value: 'monthly' }
                            ]}
                            value={editingTarget.timeframe || 'daily'}
                            onChange={(val) => setEditingTarget({...editingTarget, timeframe: val as string})}
                            placeholder="Timeframe"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingTarget(null)}>Cancel</Button>
                        <Button variant="metallic" size="sm" onClick={handleSaveTarget} isLoading={isSaving}>Save</Button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {isLoading ? <div className="text-center py-4 text-gray-500">Loading...</div> : targets.map((target) => (
                    <div key={target.id} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-white font-bold">{target.user_id ? users.find(u => u.id === target.user_id)?.name || 'Specific User' : 'All Users'}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditingTarget(target)}><IconEdit size={14} /></Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => setItemToDelete({type: 'target', id: target.id, name: target.metric})}><IconTrash size={14} /></Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Metric</p>
                                <p className="text-sm text-gray-300">{target.metric}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Target Value</p>
                                <p className="text-sm text-brand-primary font-bold">{target.target_value} / {target.timeframe === 'weekly' ? 'week' : target.timeframe === 'monthly' ? 'month' : 'day'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Scorecard Configuration"
                size="lg"
            >
                <div className="space-y-6">
                    <Tabs
                        tabs={[
                            { id: 'categories', label: 'Categories' },
                            { id: 'rules', label: 'Rules' },
                            { id: 'targets', label: 'Targets' }
                        ]}
                        activeTab={configTab}
                        onTabChange={(id) => setConfigTab(id as any)}
                    />

                    {configTab === 'categories' && renderCategories()}
                    {configTab === 'rules' && renderRules()}
                    {configTab === 'targets' && renderTargets()}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                title="Confirm Deletion"
                size="sm"
                isElevatedFooter={true}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="recessed" onClick={() => setItemToDelete(null)} disabled={isSaving}>Cancel</Button>
                        <Button variant="metallic-error" onClick={handleDeleteConfirm} isLoading={isSaving}>Delete Item</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-brand-error/[0.03] border border-brand-error/10 space-y-3">
                        <div className="flex items-center gap-2 text-brand-error">
                            <IconAlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Warning</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Are you sure you want to delete {itemToDelete?.name ? `"${itemToDelete.name}"` : 'this item'}?
                            <br />
                            This action is permanent and may affect tracking.
                        </p>
                    </div>
                </div>
            </Modal>
        </>
    );
};
