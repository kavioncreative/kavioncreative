import React, { useState, useEffect } from 'react';
import { Card, Modal } from '../components/Surfaces';
import { IconBell, IconPlus, IconCalendar, IconClock, IconUser, IconMessageSquare, IconRefreshCw, IconEdit, IconTrash } from '../components/Icons';
import Button from '../components/Button';
import { TimeSelect } from '../components/TimeSelect';
import { DatePicker } from '../components/DatePicker';
import { Input, TextArea } from '../components/Input';
import { Table } from '../components/Table';
import { KebabMenu } from '../components/KebabMenu';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';

interface Reminder {
    id: string;
    type: 'refresher' | 'task';
    recurrence_type: 'once' | 'daily';
    recurrence_data: {
        title?: string;
        date?: string | null;
    };
    time: string;
    project_managers: string[];
    message: string;
    created_at: string;
}

const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const Reminders: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        recurrenceType: 'once' as 'once' | 'daily',
        onceDate: new Date() as Date | null,
        time: '09:00',
    });

    const fetchReminders = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('reminders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setReminders(data);
            }
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReminders(true);
    }, []);

    const handleSetReminder = async () => {
        if (!formData.title || !formData.message) {
            addToast({ type: 'error', title: 'Error', message: 'Please fill in all required fields.' });
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User session not found.');

            const reminderData = {
                type: 'task',
                recurrence_type: formData.recurrenceType,
                recurrence_data: {
                    title: formData.title,
                    date: formData.recurrenceType === 'once' && formData.onceDate 
                        ? `${formData.onceDate.getFullYear()}-${String(formData.onceDate.getMonth() + 1).padStart(2, '0')}-${String(formData.onceDate.getDate()).padStart(2, '0')}`
                        : null,
                },
                time: formData.time,
                project_managers: [],
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
                    .insert([{ ...reminderData, user_id: user.id }]);
                error = insertError;
            }

            if (error) {
                addToast({ type: 'error', title: 'Error', message: error.message });
            } else {
                addToast({ type: 'success', title: 'Success', message: `Reminder ${editingId ? 'updated' : 'set'} successfully.` });
                setIsModalOpen(false);
                resetForm();
                fetchReminders();
            }
        } catch (err: any) {
            addToast({ type: 'error', title: 'Error', message: err.message || 'An error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
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
            title: reminder.recurrence_data.title || '',
            message: reminder.message || '',
            recurrenceType: reminder.recurrence_type === 'once' || reminder.recurrence_type === 'daily' 
                ? reminder.recurrence_type 
                : 'once',
            onceDate: reminder.recurrence_data.date ? parseLocalDate(reminder.recurrence_data.date) : new Date(),
            time: reminder.time || '09:00',
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            message: '',
            recurrenceType: 'once',
            onceDate: new Date(),
            time: '09:00',
        });
        setEditingId(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">My Reminders</h2>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
                        Manage your private task and follow-up reminders
                    </p>
                </div>
                <Button
                    variant="metallic"
                    size="md"
                    leftIcon={<IconPlus className="w-4 h-4" />}
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                >
                    Add Reminder
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Table
                    columns={[
                        {
                            header: 'Reminder',
                            key: 'title',
                            render: (r: Reminder) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                                        <IconBell className="w-5 h-5" />
                                    </div>
                                    <div className="font-bold text-white">{r.recurrence_data.title || 'Untitled Reminder'}</div>
                                </div>
                            )
                        },
                        {
                            header: 'Message',
                            key: 'message',
                            render: (r: Reminder) => (
                                <div className="max-w-[400px] truncate text-gray-400 italic">"{r.message}"</div>
                            )
                        },
                        {
                            header: 'Schedule',
                            key: 'time',
                            render: (r: Reminder) => {
                                const isOnce = r.recurrence_type === 'once';
                                const formattedTime = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(`2000-01-01T${r.time}`));
                                return (
                                    <div className="flex flex-col gap-0.5">
                                        <div className="text-sm font-bold text-white leading-tight">
                                            {formattedTime}
                                        </div>
                                        <div className="text-[10px] text-brand-primary font-black uppercase tracking-wider leading-tight">
                                            {isOnce && r.recurrence_data.date 
                                                ? `One-time on ${new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(r.recurrence_data.date))}` 
                                                : 'Daily'}
                                        </div>
                                    </div>
                                );
                            }
                        },
                        {
                            header: 'Created',
                            key: 'created_at',
                            render: (r: Reminder) => (
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-sm font-bold text-white leading-tight">
                                        {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(r.created_at))}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">
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
                    emptyMessage="No reminders found. Create one to stay on top of your schedule."
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                title={editingId ? 'Edit Reminder' : 'Set Reminder'}
                size="lg"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => {
                            setIsModalOpen(false);
                            resetForm();
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
                    <div className="space-y-4">
                        <Input
                            label="Title"
                            placeholder="Enter reminder title..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            variant="metallic"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <IconRefreshCw className="w-3.5 h-3.5" /> Recurrence Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'One-time', value: 'once' },
                                { label: 'Daily', value: 'daily' }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFormData({ ...formData, recurrenceType: opt.value as 'once' | 'daily' })}
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

                    <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.05] shadow-inner space-y-6 relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/20 to-transparent" />
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.01)_50%,transparent_100%)] opacity-30" />
                        </div>

                        <div className="relative z-10">
                            {formData.recurrenceType === 'once' ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <IconCalendar className="w-3.5 h-3.5" /> Select Date
                                            </label>
                                            <DatePicker
                                                variant="recessed"
                                                value={formData.onceDate}
                                                onChange={(date) => setFormData({ ...formData, onceDate: date })}
                                            />
                                        </div>
                                        <div className="w-full sm:w-48 space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <IconClock className="w-3.5 h-3.5" /> Select Time
                                            </label>
                                            <TimeSelect
                                                variant="metallic"
                                                value={formData.time}
                                                onChange={(time) => setFormData({ ...formData, time })}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-brand-primary font-bold">The reminder will trigger exactly once at the specified date and time.</p>
                                </div>
                            ) : (
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
                        </div>
                    </div>

                    <div className="space-y-2">
                        <TextArea
                            label="Reminder Message"
                            placeholder="Enter reminder message details..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            variant="metallic"
                            rows={3}
                            className="resize-none"
                            required
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Reminders;
