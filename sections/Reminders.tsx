
import React, { useState, useEffect } from 'react';
import { Card, Modal } from '../components/Surfaces';
import { IconBell, IconPlus, IconCalendar, IconClock, IconUser, IconMessageSquare, IconRefreshCw, IconEdit, IconTrash, IconMoreVertical } from '../components/Icons';
import Button from '../components/Button';
import { Tabs } from '../components/Navigation';
import { TimeSelect } from '../components/TimeSelect';
import { Dropdown } from '../components/Dropdown';
import { Input, TextArea } from '../components/Input';
import { Table } from '../components/Table';
import { KebabMenu } from '../components/KebabMenu';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';

interface Reminder {
    id: string;
    type: 'refresher' | 'task';
    recurrence_type: RecurrenceType;
    recurrence_data: any;
    time: string;
    project_managers: string[];
    message: string;
    created_at: string;
}

type RecurrenceType = 'seconds' | 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly';

const Reminders: React.FC = () => {
    const [activeTab, setActiveTab] = useState('refresher');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [projectManagers, setProjectManagers] = useState<{ label: string; value: string }[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        recurrenceType: 'daily' as RecurrenceType,
        seconds: 30,
        minutes: 15,
        minuteOfHour: 0,
        daysOfWeek: [] as string[],
        dayOfMonth: 1,
        time: '09:00',
        projectManagers: [] as string[],
        message: '',
    });

    const fetchReminders = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('type', activeTab)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setReminders(data);
        }
        if (isInitial) setIsLoading(false);
    };


    useEffect(() => {
        const fetchProjectManagers = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name')
                .ilike('role', 'Project Manager')
                .order('name');

            if (!error && data) {
                setProjectManagers(data.map(p => ({ label: p.name, value: p.id })));
            }
        };
        fetchProjectManagers();
        fetchReminders(true);
    }, [activeTab]);


    const tabs = [
        { id: 'refresher', label: 'Refresher' },
        { id: 'task', label: 'Task' }
    ];

    const recurrenceOptions = [
        { label: 'Every X Seconds', value: 'seconds' },
        { label: 'Every X Minutes', value: 'minutes' },
        { label: 'Hourly', value: 'hourly' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
    ];

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const handleSetReminder = async () => {
        if (formData.projectManagers.length === 0 || !formData.message) {
            addToast({ type: 'error', title: 'Error', message: 'Please fill in all required fields.' });
            return;
        }

        setIsSubmitting(true);

        const reminderData = {
            type: activeTab,
            recurrence_type: formData.recurrenceType,
            recurrence_data: {
                seconds: formData.seconds,
                minutes: formData.minutes,
                minuteOfHour: formData.minuteOfHour,
                daysOfWeek: formData.daysOfWeek,
                dayOfMonth: formData.dayOfMonth,
            },
            time: formData.time,
            project_managers: formData.projectManagers,
            message: formData.message,
        };

        let error;
        if (editingId) {
            const { error: updateError } = await supabase
                .from('reminders')
                .update(reminderData)
                .eq('id', editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('reminders')
                .insert([{ ...reminderData, user_id: (await supabase.auth.getUser()).data.user?.id }]);
            error = insertError;
        }

        if (error) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } else {
            addToast({ type: 'success', title: 'Success', message: `Reminder ${editingId ? 'updated' : 'set'} successfully.` });
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                recurrenceType: 'daily',
                seconds: 30,
                minutes: 15,
                minuteOfHour: 0,
                daysOfWeek: [],
                dayOfMonth: 1,
                time: '09:00',
                projectManagers: [],
                message: ''
            });
            fetchReminders();
        }
        setIsSubmitting(true);
        // We set to false after a tiny delay to ensure smooth transition
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const handleDeleteReminder = async (id: string) => {
        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('id', id);

        if (error) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } else {
            addToast({ type: 'success', title: 'Success', message: 'Reminder deleted successfully.' });
            fetchReminders();
        }
    };

    const handleEditReminder = (reminder: Reminder) => {
        setEditingId(reminder.id);
        setFormData({
            recurrenceType: reminder.recurrence_type,
            seconds: reminder.recurrence_data.seconds || 30,
            minutes: reminder.recurrence_data.minutes || 15,
            ...reminder.recurrence_data, // Spread other fields
            time: reminder.time,
            projectManagers: reminder.project_managers,
            message: reminder.message,
        });
        setIsModalOpen(true);
    };

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter(d => d !== day)
                : [...prev.daysOfWeek, day]
        }));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
                <Button
                    variant="metallic"
                    size="md"
                    leftIcon={<IconPlus className="w-4 h-4" />}
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            recurrenceType: 'daily',
                            seconds: 30,
                            minutes: 15,
                            minuteOfHour: 0,
                            daysOfWeek: [],
                            dayOfMonth: 1,
                            time: '09:00',
                            projectManagers: [],
                            message: ''
                        });

                        setIsModalOpen(true);
                    }}
                >
                    {activeTab === 'refresher' ? 'Set Refresh Reminder' : 'Set Task Reminder'}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Table
                    columns={[
                        {
                            header: 'Recurrence',
                            key: 'recurrence_type',
                            render: (r: Reminder) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                                        {r.recurrence_type === 'minutes' ? <IconRefreshCw className="w-5 h-5" /> : r.recurrence_type === 'hourly' ? <IconClock className="w-5 h-5" /> : <IconCalendar className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white capitalize">{r.recurrence_type.replace('_', ' ')}</div>
                                        <div className="text-[10px] text-brand-primary font-black uppercase tracking-wider">
                                            {r.recurrence_type === 'seconds' && `Every ${r.recurrence_data.seconds} secs`}
                                            {r.recurrence_type === 'minutes' && `Every ${r.recurrence_data.minutes} mins`}
                                            {r.recurrence_type === 'hourly' && `At :${r.recurrence_data.minuteOfHour.toString().padStart(2, '0')}`}
                                            {r.recurrence_type === 'daily' && `Daily at ${new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(`2000-01-01T${r.time}`))}`}
                                            {r.recurrence_type === 'weekly' && `${r.recurrence_data.daysOfWeek.join(', ')} at ${new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(`2000-01-01T${r.time}`))}`}
                                            {r.recurrence_type === 'monthly' && `Day ${r.recurrence_data.dayOfMonth} at ${new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(`2000-01-01T${r.time}`))}`}
                                        </div>
                                    </div>
                                </div>
                            )
                        },
                        {
                            header: 'Project Managers',
                            key: 'project_managers',
                            render: (r: Reminder) => (
                                <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                    {r.project_managers.map(id => {
                                        const manager = projectManagers.find(m => m.value === id);
                                        return (
                                            <span key={id} className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-gray-400">
                                                {manager ? manager.label : 'Unknown'}
                                            </span>
                                        );
                                    })}
                                </div>
                            )
                        },
                        {
                            header: 'Message',
                            key: 'message',
                            render: (r: Reminder) => (
                                <div className="max-w-[300px] truncate text-gray-400 italic">"{r.message}"</div>
                            )
                        },
                        {
                            header: 'Created',
                            key: 'created_at',
                            render: (r: Reminder) => (
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-sm font-bold text-white leading-tight">
                                        {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(r.created_at))}
                                    </div>
                                    <div className="text-[11px] font-bold text-brand-primary uppercase tracking-wider leading-tight">
                                        {new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(r.created_at))}
                                    </div>
                                </div>
                            )
                        },
                        {
                            header: '',
                            key: 'actions',
                            className: 'text-right w-[80px]',
                            render: (r: Reminder) => (
                                <KebabMenu
                                    options={[
                                        {
                                            label: 'Edit',
                                            icon: <IconEdit className="w-4 h-4" />,
                                            onClick: () => handleEditReminder(r)
                                        },
                                        {
                                            label: 'Delete',
                                            variant: 'danger',
                                            icon: <IconTrash className="w-4 h-4" />,
                                            onClick: () => handleDeleteReminder(r.id)
                                        }
                                    ]}
                                />
                            )
                        }
                    ]}
                    data={reminders}
                    isLoading={isLoading}
                    isMetallicHeader
                    emptyMessage={`No ${activeTab === 'refresher' ? 'Refreshers' : 'Tasks'} Found. Create your first one to stay on top of work.`}
                />

            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? `Edit ${activeTab === 'refresher' ? "Refresh" : "Task"} Reminder` : `Set ${activeTab === 'refresher' ? "Refresh" : "Task"} Reminder`}
                size="lg"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => {
                            setIsModalOpen(false);
                            setEditingId(null);
                        }}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={handleSetReminder}
                            isLoading={isSubmitting}
                            className="px-8 shadow-lg shadow-brand-primary/20"
                        >
                            {editingId ? 'Update Reminder' : 'Set Reminder'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-8">
                    {/* Recurrence Selection */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <IconRefreshCw className="w-3.5 h-3.5" /> Recurrence Type
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {recurrenceOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFormData({ ...formData, recurrenceType: opt.value as RecurrenceType })}
                                    className={`relative p-3 rounded-xl border text-xs font-bold overflow-hidden ${formData.recurrenceType === opt.value
                                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_16px_-4px_rgba(255,77,45,0.4)]'
                                        : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                                        }`}
                                >
                                    <span className="relative z-10">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Recurrence Settings */}
                    <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.05] shadow-inner space-y-6 relative overflow-hidden">
                        {/* Metallic Depth Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/20 to-transparent" />
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.01)_50%,transparent_100%)] opacity-30" />
                        </div>

                        <div className="relative z-10">
                            {formData.recurrenceType === 'seconds' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-medium text-gray-300">Run every</div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                variant="metallic"
                                                value={formData.seconds}
                                                onChange={(e) => setFormData({ ...formData, seconds: parseInt(e.target.value) || 1 })}
                                                min={1}
                                                max={59}
                                                className="text-center"
                                            />
                                        </div>
                                        <div className="text-sm font-medium text-gray-300">seconds</div>
                                    </div>
                                    <p className="text-[10px] text-brand-primary font-bold">Example: The reminder will trigger every {formData.seconds} seconds.</p>
                                </div>
                            )}

                            {formData.recurrenceType === 'minutes' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-medium text-gray-300">Run every</div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                variant="metallic"
                                                value={formData.minutes}
                                                onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 1 })}
                                                min={1}
                                                max={59}
                                                className="text-center"
                                            />
                                        </div>
                                        <div className="text-sm font-medium text-gray-300">minutes</div>
                                    </div>
                                    <p className="text-[10px] text-brand-primary font-bold">Example: The reminder will trigger every {formData.minutes} minutes.</p>
                                </div>
                            )}

                            {formData.recurrenceType === 'hourly' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-medium text-gray-300">Run at</div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                variant="metallic"
                                                value={formData.minuteOfHour}
                                                onChange={(e) => setFormData({ ...formData, minuteOfHour: parseInt(e.target.value) || 0 })}
                                                min={0}
                                                max={59}
                                                className="text-center"
                                            />
                                        </div>
                                        <div className="text-sm font-medium text-gray-300">minutes past the hour</div>
                                    </div>
                                    <p className="text-[10px] text-brand-primary font-bold">Example: Run at XX:{formData.minuteOfHour.toString().padStart(2, '0')} every hour.</p>
                                </div>
                            )}

                            {formData.recurrenceType === 'daily' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-medium text-gray-300">Run daily at</div>
                                        <div className="w-48">
                                            <TimeSelect
                                                variant="metallic"
                                                value={formData.time}
                                                onChange={(time) => setFormData({ ...formData, time })}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-brand-primary font-bold">The reminder will trigger every day at your chosen time.</p>
                                </div>
                            )}

                            {formData.recurrenceType === 'weekly' && (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select Days</div>
                                        <div className="flex flex-wrap gap-2">
                                            {daysOfWeek.map((day) => (
                                                <button
                                                    key={day}
                                                    onClick={() => toggleDay(day)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 ${formData.daysOfWeek.includes(day)
                                                        ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105'
                                                        : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 py-4 border-t border-white/[0.05]">
                                        <div className="text-sm font-medium text-gray-300">At time</div>
                                        <div className="w-48">
                                            <TimeSelect
                                                variant="metallic"
                                                value={formData.time}
                                                onChange={(time) => setFormData({ ...formData, time })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formData.recurrenceType === 'monthly' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-medium text-gray-300">Run on day</div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                variant="metallic"
                                                value={formData.dayOfMonth}
                                                onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                                                min={1}
                                                max={31}
                                                className="text-center"
                                            />
                                        </div>
                                        <div className="text-sm font-medium text-gray-300">of every month</div>
                                    </div>
                                    <div className="flex items-center gap-4 py-4 border-t border-white/[0.05]">
                                        <div className="text-sm font-medium text-gray-300">At time</div>
                                        <div className="w-48">
                                            <TimeSelect
                                                variant="metallic"
                                                value={formData.time}
                                                onChange={(time) => setFormData({ ...formData, time })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/[0.05]">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <IconUser className="w-3.5 h-3.5" /> Project Managers
                            </label>
                            <Dropdown
                                isMulti
                                showSearch
                                options={projectManagers}
                                value={formData.projectManagers}
                                onChange={(val) => setFormData({ ...formData, projectManagers: val as string[] })}
                                placeholder="Select Project Managers"
                                selectionLabel="managers selected"
                                variant="metallic"
                                size="md"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <IconMessageSquare className="w-3.5 h-3.5" /> Reminder Message
                            </label>
                            <TextArea
                                placeholder="Enter reminder details..."
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                variant="metallic"
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div >
    );
};

export default Reminders;
