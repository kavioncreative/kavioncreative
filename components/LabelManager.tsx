import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Button from './Button';
import { Input } from './Input';
import { Dropdown } from './Dropdown';
import { Checkbox } from './Selection';
import { IconSearch, IconTag, IconPlus, IconX, IconCheck, IconCheckCircle, IconEdit, IconTrash, IconUsers, IconUser, IconGlobe, IconChevronDown } from './Icons';
import { addToast } from './Toast';
import { useUser } from '../contexts/UserContext';

interface Label {
    id: string;
    name: string;
    color: string;
    category: 'applicant' | 'project';
    visibility_type: 'all' | 'roles' | 'users' | 'private';
    visible_to_roles: string[];
    visible_to_users: string[];
    created_by: string;
}

interface Profile {
    id: string;
    name: string;
    role: string;
}

interface LabelManagerProps {
    type: 'applicant' | 'project';
    targetId?: string; // e.g. projectId or applicantId
    onLabelsChange?: () => void;
}

export const LabelManager: React.FC<LabelManagerProps> = ({ type, targetId, onLabelsChange }) => {
    const { profile: currentUser } = useUser();
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelColor, setNewLabelColor] = useState('#FF4D2D');
    const [visibilityType, setVisibilityType] = useState<'all' | 'roles' | 'users' | 'private'>('all');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [creators, setCreators] = useState<Record<string, Profile>>({});
    
    // Assignment Logic
    const [assignedLabelIds, setAssignedLabelIds] = useState<Set<string>>(new Set());
    const [isAssigning, setIsAssigning] = useState(false);
    
    const [justCreated, setJustCreated] = useState(false);
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);
    const [isManageMode, setIsManageMode] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLDivElement>(null);

    // Outside click for picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node) && 
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const roles = [
        { label: 'Admin', value: 'Admin' },
        { label: 'Team Designer', value: 'Team Designer' },
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Team Lead', value: 'Team Lead' },
        { label: 'Freelancer', value: 'Freelancer' },
        { label: 'Presentation Designer', value: 'Presentation Designer' },
        { label: 'Finance Manager', value: 'Finance Manager' },
        { label: 'ORM Manager', value: 'ORM Manager' },
        { label: 'Project Operations Manager', value: 'Project Operations Manager' },
        { label: 'Super Admin', value: 'Super Admin' },
    ];

    const fetchAssignments = async () => {
        if (!targetId) return;
        try {
            const table = type === 'project' ? 'project_label_assignments' : 'applicant_label_assignments';
            const column = type === 'project' ? 'project_id' : 'applicant_id';
            
            const { data, error } = await supabase
                .from(table)
                .select('label_id')
                .eq(column, targetId);
            
            if (error) throw error;
            setAssignedLabelIds(new Set((data || []).map(a => a.label_id)));
        } catch (error: any) {
            console.error('Assignments error:', error);
        }
    };

    const handleToggleAssignment = async (labelId: string) => {
        if (!targetId || isAssigning) return;
        setIsAssigning(true);
        try {
            const table = type === 'project' ? 'project_label_assignments' : 'applicant_label_assignments';
            const column = type === 'project' ? 'project_id' : 'applicant_id';
            const isAssigned = assignedLabelIds.has(labelId);

            if (isAssigned) {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq(column, targetId)
                    .eq('label_id', labelId);
                if (error) throw error;
                
                const next = new Set(assignedLabelIds);
                next.delete(labelId);
                setAssignedLabelIds(next);
            } else {
                const { error } = await supabase
                    .from(table)
                    .insert([{ [column]: targetId, label_id: labelId }]);
                if (error) throw error;
                
                const next = new Set(assignedLabelIds);
                next.add(labelId);
                setAssignedLabelIds(next);
            }
            onLabelsChange?.();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Tagging Failed', message: error.message });
        } finally {
            setIsAssigning(false);
        }
    };

    const fetchLabels = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('labels')
                .select('*')
                .eq('category', type)
                .order('name');
            if (error) throw error;
            setAllLabels(data || []);
        } catch (error: any) {
            console.error('Labels error:', error);
            addToast({ type: 'error', title: 'Fetch Failed', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, role')
                .order('name');
            if (error) throw error;
            setAllProfiles(data || []);
            
            const profileMap = (data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
            setCreators(profileMap);
        } catch (error: any) {
            console.error('Profiles error:', error);
        }
    };

    const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super admin';

    const handleCreateOrUpdateLabel = async () => {
        if (!newLabelName.trim()) return;
        setIsProcessing(true);
        try {
            const labelData = {
                name: newLabelName.trim(),
                color: newLabelColor,
                category: type,
                visibility_type: visibilityType,
                visible_to_roles: visibilityType === 'roles' ? selectedRoles : [],
                visible_to_users: visibilityType === 'users' ? selectedUsers : [],
                created_by: currentUser?.id
            };

            if (editingLabel) {
                const { error } = await supabase
                    .from('labels')
                    .update(labelData)
                    .eq('id', editingLabel.id);

                if (error) throw error;

                setAllLabels(allLabels.map(l => l.id === editingLabel.id ? { ...l, ...labelData } : l));
                resetForm();
                addToast({ type: 'success', title: 'Label Updated', message: 'Changes saved.' });
            } else {
                const { data, error } = await supabase
                    .from('labels')
                    .insert([labelData])
                    .select()
                    .single();

                if (error) throw error;

                setAllLabels([...allLabels, data]);
                resetForm();
                setJustCreated(true);
                setTimeout(() => setJustCreated(false), 2000);
                addToast({ type: 'success', title: 'Label Created', message: 'Ready to use.' });
            }
            onLabelsChange?.();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Action Failed', message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const resetForm = () => {
        setNewLabelName('');
        setEditingLabel(null);
        setVisibilityType('all');
        setSelectedRoles([]);
        setSelectedUsers([]);
    }

    const handleDeleteLabel = async (labelId: string) => {
        if (!window.confirm('Delete this label? It will be removed from all associated items.')) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('labels')
                .delete()
                .eq('id', labelId);

            if (error) throw error;

            setAllLabels(allLabels.filter(l => l.id !== labelId));
            addToast({ type: 'success', title: 'Label Deleted', message: 'Label removed successfully.' });
            onLabelsChange?.();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        fetchLabels();
        fetchProfiles();
        if (targetId) fetchAssignments();
    }, [type, targetId]);

    return (
        <div className="space-y-6">
            <div id="label-creation-form" className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Label Name</p>
                            <Input
                                placeholder="e.g. High Priority..."
                                value={newLabelName}
                                onChange={(e) => setNewLabelName(e.target.value)}
                                className="w-full"
                                variant="recessed"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Color Picker</p>
                            <div ref={triggerRef} className="flex items-center gap-3 bg-black/40 border border-white/5 p-2.5 rounded-xl transition-all relative group shadow-inner">
                                <div 
                                    onClick={() => setShowPicker(!showPicker)}
                                    className="w-4 h-4 rounded-md shrink-0 border border-white/10 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-110 transition-transform" 
                                    style={{ backgroundColor: newLabelColor }} 
                                />
                                <input
                                    type="text"
                                    value={newLabelColor.toUpperCase()}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        if (val === '' || val.startsWith('#')) {
                                            setNewLabelColor(val);
                                        } else if (/^[0-9A-F]{0,6}$/.test(val)) {
                                            setNewLabelColor('#' + val);
                                        }
                                    }}
                                    className="w-full bg-transparent border-none outline-none text-[10px] font-mono font-black text-white/50 focus:text-white tracking-widest p-0 focus:ring-0 transition-colors"
                                    placeholder="#000000"
                                    maxLength={7}
                                />
                                <IconChevronDown 
                                    size={12} 
                                    className={`text-gray-500 hover:text-white cursor-pointer transition-all ${showPicker ? 'rotate-180 text-brand-primary' : ''}`}
                                    onClick={() => setShowPicker(!showPicker)}
                                />

                                {showPicker && (
                                    <div 
                                        ref={pickerRef}
                                        className="absolute top-full mt-2 left-0 z-50 p-5 rounded-2xl bg-[#0F0F0F] border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 w-full space-y-4"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                <span>Custom Picker</span>
                                                <span className="font-mono text-brand-primary">{newLabelColor}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-6 gap-2">
                                                {['#FF4D2D', '#FF7E00', '#FFBD00', '#D4E157', '#66BB6A', '#26A69A', 
                                                  '#29B6F6', '#42A5F5', '#5C6BC0', '#7E57C2', '#AB47BC', '#EC4899',
                                                  '#FB8C00', '#FDD835', '#A0E418', '#4CAF50', '#009688', '#00BCD4',
                                                  '#03A9F4', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0', '#E91E63'
                                                ].map(c => (
                                                    <button 
                                                        key={c}
                                                        onClick={() => { setNewLabelColor(c); setShowPicker(false); }}
                                                        className={`w-6 h-6 rounded-md border border-white/5 transition-all hover:scale-110 active:scale-95 ${newLabelColor === c ? 'ring-2 ring-brand-primary border-white/20' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>

                                            <div className="pt-2 border-t border-white/5">
                                                <Input 
                                                    variant="recessed"
                                                    size="sm"
                                                    value={newLabelColor}
                                                    onChange={(e) => setNewLabelColor(e.target.value.toUpperCase())}
                                                    className="text-center font-mono"
                                                    placeholder="#HEXCODE"
                                                />
                                            </div>

                                            <Button 
                                                variant="recessed" 
                                                size="sm" 
                                                className="w-full text-xs mt-2"
                                                onClick={() => setShowPicker(false)}
                                            >
                                                Apply Color
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Visibility Rules</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'all', label: 'Everyone', icon: <IconGlobe size={14} />, description: 'Except Team Designers' },
                                    { id: 'roles', label: 'By Role', icon: <IconUsers size={14} />, adminOnly: true },
                                    { id: 'users', label: 'Specific', icon: <IconUser size={14} /> },
                                    { id: 'private', label: 'Private', icon: <IconX size={14} className="rotate-45" /> }
                                ].filter(opt => !opt.adminOnly || isSuperAdmin).map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setVisibilityType(opt.id as any)}
                                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all ${visibilityType === opt.id 
                                            ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' 
                                            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
                                        title={opt.description}
                                    >
                                        {opt.icon}
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] font-black uppercase tracking-wider">{opt.label}</span>
                                            {'description' in opt && <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest">{opt.description}</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {visibilityType === 'roles' && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <Dropdown
                                    isMulti
                                    options={roles}
                                    value={selectedRoles}
                                    onChange={(val) => setSelectedRoles(val as string[])}
                                    placeholder="Select roles..."
                                    variant="recessed"
                                    size="sm"
                                />
                            </div>
                        )}

                        {visibilityType === 'users' && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <Dropdown
                                    isMulti
                                    options={allProfiles.map(p => ({ label: p.name, value: p.id, description: p.role }))}
                                    value={selectedUsers}
                                    onChange={(val) => setSelectedUsers(val as string[])}
                                    placeholder="Select users..."
                                    variant="recessed"
                                    size="sm"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant={justCreated ? "recessed" : "metallic"}
                        onClick={handleCreateOrUpdateLabel}
                        disabled={!newLabelName.trim() || isProcessing}
                        className={`flex-1 h-12 font-black uppercase tracking-widest text-xs transition-all duration-500 ${justCreated ? 'border-green-500/30 text-green-400 bg-green-500/5' : ''}`}
                        leftIcon={justCreated ? <IconCheckCircle size={16} /> : (editingLabel ? <IconEdit size={16} /> : <IconPlus size={16} />)}
                    >
                        {editingLabel ? 'Update Label' : (justCreated ? 'Label Created!' : (isProcessing ? 'Saving...' : 'Create New Label'))}
                    </Button>
                    {editingLabel && (
                        <Button
                            variant="recessed"
                            onClick={resetForm}
                            className="px-6 h-12"
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </div>

            <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <IconTag size={16} className="text-brand-primary" />
                        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                            Existing {type === 'applicant' ? 'Applicant' : 'Project'} Labels
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsManageMode(!isManageMode)}
                        className={`text-[10px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-lg border ${isManageMode 
                            ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' 
                            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}
                    >
                        {isManageMode ? 'Done Managing' : 'Manage List'}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {isLoading ? (
                        <div className="flex items-center gap-2 px-1">
                            <div className="w-3 h-3 border-2 border-white/10 border-t-brand-primary rounded-full animate-spin" />
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Loading labels...</p>
                        </div>
                    ) : allLabels.length > 0 ? (
                        allLabels.map(label => {
                            const isAssigned = assignedLabelIds.has(label.id);
                            return (
                                <div
                                    key={label.id}
                                    onClick={() => targetId && handleToggleAssignment(label.id)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-3 shadow-sm cursor-pointer relative group ${isAssigned 
                                        ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary' 
                                        : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/10'}`}
                                >
                                    {isAssigned && (
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-primary animate-in slide-in-from-left duration-300" />
                                    )}
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                                    {label.name}
                                    {isAssigned ? (
                                        <IconCheck size={12} className="text-brand-primary animate-in zoom-in duration-200" />
                                    ) : (
                                        <>
                                            {label.visibility_type !== 'all' && (
                                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                                            )}
                                            {label.visibility_type === 'roles' && <IconUsers size={10} className="text-gray-500" />}
                                            {label.visibility_type === 'users' && <IconUser size={10} className="text-gray-500" />}
                                        </>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-[10px] text-gray-600 italic px-1 font-bold">No {type} labels created yet.</p>
                    )}
                </div>

                {isManageMode && allLabels.length > 0 && (
                    <div className="mt-4 pt-6 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {allLabels.map(label => {
                                const creator = creators[label.created_by];
                                const isFromSuperAdmin = creator?.role?.toLowerCase() === 'super admin';
                                const canManage = !isFromSuperAdmin || isSuperAdmin;
                                
                                return (
                                    <div key={label.id} className="relative overflow-hidden flex items-center gap-4 p-3.5 px-5 rounded-2xl bg-black/40 border border-white/[0.05] group/manage hover:border-white/20 transition-all shadow-inner">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ backgroundColor: label.color }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[11px] font-black text-white uppercase tracking-wider truncate">{label.name}</p>
                                                {isFromSuperAdmin && (
                                                    <span className="text-[7px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Global</span>
                                                )}
                                            </div>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                                {label.visibility_type === 'all' ? 'Visible to Everyone' : 
                                                 label.visibility_type === 'roles' ? `${label.visible_to_roles?.length || 0} Roles` : 
                                                 label.visibility_type === 'private' ? 'Private (Only You)' :
                                                 `${label.visible_to_users?.length || 0} Users`}
                                            </p>
                                        </div>
                                        {canManage && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover/manage:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingLabel(label);
                                                        setNewLabelName(label.name);
                                                        setNewLabelColor(label.color);
                                                        setVisibilityType(label.visibility_type);
                                                        setSelectedRoles(label.visible_to_roles || []);
                                                        setSelectedUsers(label.visible_to_users || []);
                                                        document.getElementById('label-creation-form')?.scrollIntoView({ behavior: 'smooth' });
                                                    }}
                                                    className="p-2 hover:bg-blue-400/10 hover:text-blue-400 rounded-xl transition-all"
                                                    title="Edit"
                                                >
                                                    <IconEdit size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteLabel(label.id);
                                                    }}
                                                    className="p-2 hover:bg-red-400/10 hover:text-red-400 rounded-xl transition-all"
                                                    title="Delete"
                                                >
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
