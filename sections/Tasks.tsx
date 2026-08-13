
import React, { useState, useEffect } from 'react';
import { Card, Modal } from '../components/Surfaces';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { IconPlus, IconClock, IconCheckCircle, IconChevronRight, IconLayout, IconX, IconCalendar, IconUser, IconMoreVertical, IconEye, IconEdit, IconTrash, IconFilter } from '../components/Icons';
import { Pagination } from '../components/Navigation';
import { Input, TextArea } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { KebabMenu } from '../components/KebabMenu';
import { DatePicker, formatDate as systemFormatDate } from '../components/DatePicker';
import { TimeSelect } from '../components/TimeSelect';
import { supabase } from '../lib/supabase';
import { formatDeadlineDate, formatTime, getTimeLeft, formatDisplayName } from '../utils/formatter';
import { Countdown } from '../components/Countdown';
import { useUser } from '../contexts/UserContext';
import { addToast } from '../components/Toast';
import { getInitialTab, updateRoute } from '../utils/routing';
import { getStatusCapsuleClasses, getRoleCapsuleClasses } from '../components/Badge';

interface Task {
    id: string;
    task: string;
    description: string;
    status: 'In Progress' | 'Completed';
    deadline_date: string;
    deadline_time: string;
    assignee_id: string;
    created_by: string;
    assignee_profile: { name: string } | null;
    creator_profile: { name: string } | null;
}

interface User {
    id: string;
    name: string;
    role?: string;
}



const Tasks: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState<'all' | 'progress' | 'completed'>(getInitialTab('Tasks', 'all') as any);
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
    const [deadlineTime, setDeadlineTime] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const itemsPerPage = 10;
    const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'yesterday' | 'tomorrow' | 'overdue' | 'assigned_me' | 'created_me'>('all');
    const [stats, setStats] = useState({ all: 0, progress: 0, completed: 0 });
    const { profile, effectiveRole } = useUser();
    const isSuperAdmin = effectiveRole === 'Super Admin';
    const isAdminUser = effectiveRole === 'Admin';
    const isPM = effectiveRole === 'Project Manager';
    const canManageAll = isSuperAdmin || isAdminUser;
    const canCreate = canManageAll || isPM;

    // Update timer every minute for live status updates
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        updateRoute('Tasks', activeFilter);
    }, [activeFilter]);

    const fetchTasks = async (isInitial = false) => {
        if (!profile?.id) return;
        if (isInitial) setLoading(true);

        let query = supabase
            .from('tasks')
            .select(`
                *,
                assignee_profile:profiles!assignee_id(name),
                creator_profile:profiles!created_by(name)
            `, { count: 'exact' });

        if (!isSuperAdmin && !isAdminUser) {
            query = query.or(`created_by.eq.${profile.id},assignee_id.eq.${profile.id}`);
        }

        // Search Filter
        if (searchQuery) {
            query = query.or(`task.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        // Date Filter
        if (filterDate) {
            query = query.eq('deadline_date', filterDate.toISOString().split('T')[0]);
        }

        // Assignee Filter
        if (filterAssignee !== 'all') {
            query = query.eq('assignee_id', filterAssignee);
        }

        // Status Filter
        if (activeFilter === 'progress') {
            query = query.eq('status', 'In Progress');
        } else if (activeFilter === 'completed') {
            query = query.eq('status', 'Completed');
        }

        // Quick Filters
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
        const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

        if (quickFilter === 'today') {
            query = query.eq('deadline_date', today);
        } else if (quickFilter === 'yesterday') {
            query = query.eq('deadline_date', yesterday);
        } else if (quickFilter === 'tomorrow') {
            query = query.eq('deadline_date', tomorrow);
        } else if (quickFilter === 'overdue') {
            query = query.lt('deadline_date', today).eq('status', 'In Progress');
        } else if (quickFilter === 'assigned_me') {
            query = query.eq('assignee_id', profile.id);
        } else if (quickFilter === 'created_me') {
            query = query.eq('created_by', profile.id);
        }

        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching tasks:', error);
            addToast({ title: 'Error', message: 'Failed to fetch tasks', type: 'error' });
        } else if (data) {
            setTasks(data);
            setTotalTasks(count || 0);

            if (selectedTask) {
                const updated = data.find(t => t.id === selectedTask.id);
                if (updated) setSelectedTask(updated);
            }
        }
        
        // Also fetch global stats for cards
        fetchStats();

        if (isInitial) setLoading(false);
    };

    const fetchStats = async () => {
        if (!profile?.id) return;

        const getBaseQuery = () => {
            let q = supabase.from('tasks').select('*', { count: 'exact', head: true });
            if (!isSuperAdmin && !isAdminUser) {
                q = q.or(`created_by.eq.${profile.id},assignee_id.eq.${profile.id}`);
            }

            // Apply same Quick Filters to stats for consistency
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
            const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

            if (quickFilter === 'today') q = q.eq('deadline_date', today);
            else if (quickFilter === 'yesterday') q = q.eq('deadline_date', yesterday);
            else if (quickFilter === 'tomorrow') q = q.eq('deadline_date', tomorrow);
            else if (quickFilter === 'overdue') q = q.lt('deadline_date', today).eq('status', 'In Progress');
            else if (quickFilter === 'assigned_me') q = q.eq('assignee_id', profile.id);
            else if (quickFilter === 'created_me') q = q.eq('created_by', profile.id);

            return q;
        };

        const [allRes, progressRes, completedRes] = await Promise.all([
            getBaseQuery(),
            getBaseQuery().eq('status', 'In Progress'),
            getBaseQuery().eq('status', 'Completed')
        ]);

        setStats({
            all: allRes.count || 0,
            progress: progressRes.count || 0,
            completed: completedRes.count || 0
        });
    };

    // Real-time Subscription
    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel('tasks-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks'
                },
                () => {
                    fetchTasks();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, currentPage, searchQuery, filterDate, filterAssignee, activeFilter, quickFilter]);


    useEffect(() => {
        fetchTasks(true);
    }, [profile?.id, currentPage, searchQuery, filterDate, filterAssignee, activeFilter, quickFilter]);

    // Fetch Users
    useEffect(() => {
        const fetchUsers = async () => {
            if (!effectiveRole) return;

            let query = supabase
                .from('profiles')
                .select('id, name, role')
                .eq('status', 'Active')
                .order('name');

            // If current user is Super Admin or Admin, show specific roles in assignee list
            if (effectiveRole === 'Super Admin' || effectiveRole === 'Admin') {
                query = query.in('role', ['Super Admin', 'Admin', 'Project Manager']);
            } 
            // If current user is Project Manager, allow assigning to Project Managers and Super Admins
            else if (effectiveRole === 'Project Manager') {
                query = query.in('role', ['Project Manager', 'Super Admin']);
            }
            // Fallback: If not an admin/manager, they shouldn't see anyone or only themselves?
            // Restricting to empty if not allowed role for safety
            else {
                setUsers([]);
                return;
            }

            const { data, error } = await query;

            if (!error && data) {
                const formattedUsers = data.map(u => ({
                    ...u,
                    name: formatDisplayName(u.name)
                }));
                setUsers(formattedUsers);
            }
        };

        fetchUsers();
    }, [effectiveRole]);

    const inProgressCount = stats.progress;
    const completedCount = stats.completed;
    const allTasksCount = stats.all;

    const handleCreateTask = async () => {
        if (!taskTitle || !taskDescription || !selectedAssignee || !deadlineDate || !deadlineTime) {
            addToast({ title: 'Validation Error', message: 'Please fill in all fields', type: 'error' });
            return;
        }

        if (!profile) {
            addToast({ title: 'Error', message: 'You must be logged in to perform this action', type: 'error' });
            return;
        }

        setLoading(true);

        if (modalMode === 'edit' && selectedTask) {
            const { error } = await supabase.from('tasks').update({
                task: taskTitle,
                description: taskDescription,
                assignee_id: selectedAssignee,
                deadline_date: deadlineDate.toISOString().split('T')[0],
                deadline_time: deadlineTime,
            }).eq('id', selectedTask.id);

            if (error) {
                console.error('Error updating task:', error);
                addToast({ title: 'Error', message: 'Failed to update task', type: 'error' });
            } else {
                addToast({ title: 'Success', message: 'Task updated successfully', type: 'success' });
                fetchTasks();
                handleCloseModal();
            }
        } else {
            const { error } = await supabase.from('tasks').insert([{
                task: taskTitle,
                description: taskDescription,
                assignee_id: selectedAssignee,
                created_by: profile.id,
                deadline_date: deadlineDate.toISOString().split('T')[0],
                deadline_time: deadlineTime,
                status: 'In Progress'
            }]);

            if (error) {
                console.error('Error creating task:', error);
                addToast({ title: 'Error', message: 'Failed to create task', type: 'error' });
            } else {
                addToast({ title: 'Success', message: 'Task created successfully', type: 'success' });
                fetchTasks();
                handleCloseModal();
            }
        }

        setLoading(false);
    };

    const handleDeleteTask = (task: Task) => {
        setTaskToDelete(task);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!taskToDelete) return;

        setLoading(true);
        const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);

        if (error) {
            console.error('Error deleting task:', error);
            addToast({ title: 'Error', message: 'Failed to delete task', type: 'error' });
        } else {
            addToast({ title: 'Success', message: 'Task deleted successfully', type: 'success' });
            fetchTasks();
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
        }
        setLoading(false);
    };

    const handleMarkComplete = async (taskId: string) => {
        setLoading(true);
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'Completed' })
            .eq('id', taskId);

        if (error) {
            console.error('Error completing task:', error);
            addToast({ title: 'Error', message: 'Failed to complete task', type: 'error' });
        } else {
            addToast({ title: 'Success', message: 'Task marked as completed', type: 'success' });
            fetchTasks();
        }
        setLoading(false);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalMode('create');
        setSelectedTask(null);
        setTaskTitle('');
        setTaskDescription('');
        setSelectedAssignee('');
        setDeadlineDate(null);
        setDeadlineTime('');
    };

    const handleOpenEdit = (task: Task) => {
        setModalMode('edit');
        setSelectedTask(task);
        setTaskTitle(task.task);
        setTaskDescription(task.description);
        setSelectedAssignee(task.assignee_id);
        setDeadlineDate(new Date(task.deadline_date));
        setDeadlineTime(task.deadline_time);
        setIsModalOpen(true);
    };

    const handleOpenPreview = (task: Task) => {
        setSelectedTask(task);
        setIsPreviewOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-[240px]">
                        <Input
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            variant="metallic"
                            className="h-10"
                            leftIcon={<IconLayout className="w-4 h-4 text-gray-500" />}
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="relative w-full md:w-[180px]">
                        <Dropdown
                            value={quickFilter}
                            onChange={(val) => {
                                setQuickFilter(val);
                                setFilterDate(null); // Clear manual date if quick filter used
                            }}
                            options={[
                                { value: 'all', label: 'All Time' },
                                { value: 'today', label: 'Due Today' },
                                { value: 'yesterday', label: 'Due Yesterday' },
                                { value: 'tomorrow', label: 'Due Tomorrow' },
                                { value: 'overdue', label: 'Overdue', descriptionClassName: '!text-brand-error bg-brand-error/10 border-brand-error/20' },
                                { value: 'assigned_me', label: 'Assigned to Me' },
                                { value: 'created_me', label: 'Created by Me' }
                            ]}
                            variant="metallic"
                        >
                            <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                <div className="flex items-center gap-2 relative z-10">
                                    <IconFilter className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
                                    <span className="truncate">
                                        {quickFilter === 'all' ? 'Quick Filter' : 
                                         quickFilter === 'today' ? 'Due Today' : 
                                         quickFilter === 'yesterday' ? 'Due Yesterday' : 
                                         quickFilter === 'tomorrow' ? 'Due Tomorrow' : 
                                         quickFilter === 'overdue' ? 'Overdue' : 
                                         quickFilter === 'assigned_me' ? 'My Tasks' : 'My Assignments'}
                                    </span>
                                </div>

                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </Dropdown>
                    </div>

                    {/* Date Filter */}
                    <div className="relative w-full md:w-[180px]">
                        <DatePicker
                            value={filterDate}
                            onChange={(date) => {
                                setFilterDate(date);
                                setQuickFilter('all'); // Clear quick filter if manual date used
                            }}
                        >
                            <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                <div className="flex items-center gap-2 relative z-10">
                                    <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
                                    <span className="truncate">{systemFormatDate(filterDate) || 'Filter By Date'}</span>
                                </div>

                                <div className="flex items-center gap-1.5 relative z-10">
                                    <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {filterDate && (
                                        <div
                                            className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFilterDate(null);
                                            }}
                                        >
                                            <IconX className="w-3 h-3" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DatePicker>
                    </div>

                    {/* Assignee Filter */}
                    {canCreate && (
                        <div className="relative w-full md:w-[220px]">
                            <Dropdown
                                value={filterAssignee}
                                onChange={setFilterAssignee}
                                options={[
                                    { value: 'all', label: 'Filter By Assignee' },
                                    ...users.map(u => ({
                                        value: u.id,
                                        label: u.name,
                                        description: u.role,
                                        descriptionClassName: getRoleCapsuleClasses(u.role || '')
                                    }))
                                ]}
                                showSearch={true}
                                menuClassName="!w-[380px]"
                            >
                                <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <div className="flex items-center gap-2 relative z-10">
                                        <IconUser className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
                                        <span className="truncate">
                                            {filterAssignee === 'all' 
                                                ? 'Filter By Assignee' 
                                                : users.find(u => u.id === filterAssignee)?.name || 'Filter By Assignee'
                                            }
                                        </span>
                                    </div>

                                    <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </Dropdown>
                        </div>
                    )}
                </div>

                {canCreate && (
                    <Button
                        variant="metallic"
                        onClick={() => {
                            setModalMode('create');
                            setIsModalOpen(true);
                        }}
                        leftIcon={<IconPlus className="w-4 h-4" />}
                        className="w-full md:w-auto whitespace-nowrap"
                    >
                        Create Task
                    </Button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* All Tasks */}
                <Card
                    isElevated={true}
                    disableHover={activeFilter === 'all'}
                    className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeFilter === 'all'
                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                        }`}
                    bodyClassName="h-full"
                    onClick={() => setActiveFilter('all')}
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-5 relative z-10 w-full">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeFilter === 'all' ? 'text-white/80' : 'text-gray-400'}`}>All Tasks</p>
                                <p className={`text-2xl font-black mb-1 ${activeFilter === 'all' ? 'text-white' : 'text-brand-primary'}`}>{allTasksCount}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={activeFilter === 'all' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('urgent')}>
                                        Total Tasks
                                    </span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border transition-all ${activeFilter === 'all'
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                }`}>
                                <IconLayout className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* In Progress */}
                <Card
                    isElevated={true}
                    disableHover={activeFilter === 'progress'}
                    className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeFilter === 'progress'
                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                        }`}
                    bodyClassName="h-full"
                    onClick={() => setActiveFilter('progress')}
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-5 relative z-10 w-full">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeFilter === 'progress' ? 'text-white/80' : 'text-gray-400'}`}>In Progress</p>
                                <p className={`text-2xl font-black mb-1 ${activeFilter === 'progress' ? 'text-white' : 'text-brand-warning'}`}>{inProgressCount}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={activeFilter === 'progress' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('in progress')}>
                                        Active Tasks
                                    </span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border transition-all ${activeFilter === 'progress'
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                }`}>
                                <IconClock className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Completed */}
                <Card
                    isElevated={true}
                    disableHover={activeFilter === 'completed'}
                    className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeFilter === 'completed'
                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                        }`}
                    bodyClassName="h-full"
                    onClick={() => setActiveFilter('completed')}
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-5 relative z-10 w-full">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeFilter === 'completed' ? 'text-white/80' : 'text-gray-400'}`}>Completed</p>
                                <p className={`text-2xl font-black mb-1 ${activeFilter === 'completed' ? 'text-white' : 'text-brand-success'}`}>{completedCount}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={activeFilter === 'completed' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('approved')}>
                                        Done
                                    </span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border transition-all ${activeFilter === 'completed'
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                }`}>
                                <IconCheckCircle className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tasks Table */}
            <div>
                <Table
                    columns={[
                        {
                            header: 'S. No.',
                            key: 'sNo',
                            className: 'min-w-[80px] whitespace-nowrap',
                            render: (_: any, index: number) => index + 1
                        },
                        {
                            header: 'Task',
                            key: 'task',
                            className: 'font-medium text-white'
                        },
                        {
                            header: 'Created By',
                            key: 'createdBy',
                            className: 'text-gray-400 text-center',
                            render: (task: Task) => {
                                const name = task.creator_profile?.name;
                                return formatDisplayName(name) || 'Unknown';
                            }
                        },
                        {
                            header: 'Assignee',
                            key: 'assignee',
                            className: 'w-48 text-gray-400 text-center whitespace-nowrap',
                            render: (task: Task) => {
                                const name = task.assignee_profile?.name;
                                return formatDisplayName(name) || 'Unassigned';
                            }
                        },
                        {
                            header: 'Status',
                            key: 'status',
                            className: 'text-center',
                            render: (task: Task) => (
                                <span className={getStatusCapsuleClasses(task.status)}>
                                    {task.status}
                                </span>
                            )
                        },
                        {
                            header: 'Deadline',
                            key: 'deadline',
                            className: 'w-44 text-center',
                            render: (task: Task) => (
                                <div className="flex flex-col items-center justify-center">
                                    <span className="text-white font-medium">{formatDeadlineDate(task.deadline_date)}</span>
                                    <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">{formatTime(task.deadline_time)}</span>
                                </div>
                            )
                        },
                        {
                            header: 'Time Left',
                            key: 'timeLeft',
                            className: 'w-44 text-center',
                            render: (task: Task) => {
                                if (task.status === 'Completed') {
                                    return <span className="text-sm font-bold uppercase tracking-wider text-brand-success">Completed</span>;
                                }
                                return (
                                    <Countdown 
                                        date={`${task.deadline_date}T${task.deadline_time || '00:00:00'}`} 
                                        status={task.status} 
                                        className="text-sm font-bold uppercase tracking-wider" 
                                    />
                                );
                            }
                        },
                        {
                            header: '',
                            key: 'actions',
                            className: 'w-32 text-right',
                            render: (task: Task) => (
                                <div className="flex items-center justify-end gap-2 pr-2">
                                    {task.status !== 'Completed' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkComplete(task.id);
                                            }}
                                            className="p-2 hover:bg-brand-success/10 rounded-lg text-gray-500 hover:text-brand-success transition-all group"
                                            title="Mark as Complete"
                                        >
                                            <IconCheckCircle className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                                        </button>
                                    )}
                                    {(canManageAll || (isPM && task.created_by === profile?.id)) ? (
                                        <KebabMenu
                                            options={[
                                                {
                                                    label: 'View',
                                                    icon: <IconEye className="w-4 h-4" />,
                                                    onClick: () => handleOpenPreview(task)
                                                },
                                                {
                                                    label: 'Edit',
                                                    icon: <IconEdit className="w-4 h-4" />,
                                                    onClick: () => handleOpenEdit(task)
                                                },
                                                {
                                                    label: 'Delete',
                                                    icon: <IconTrash className="w-4 h-4" />,
                                                    variant: 'danger',
                                                    onClick: () => handleDeleteTask(task)
                                                }
                                            ]}
                                        />
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenPreview(task);
                                            }}
                                            className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all group"
                                        >
                                            <IconChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                                        </button>
                                    )}
                                </div>
                            )
                        }
                    ]}
                    data={tasks}
                    onRowClick={task => handleOpenPreview(task)}
                    isLoading={loading}
                    isMetallicHeader={true}
                    emptyMessage="No tasks found. Create your first task to get started."
                />

                {/* Pagination */}
                {Math.ceil(totalTasks / itemsPerPage) > 1 && (
                    <div className="mt-8 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 px-1">
                        <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Task Index</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-60">Synchronized View Navigation</p>
                        </div>
                        <Pagination
                            current={currentPage}
                            total={Math.ceil(totalTasks / itemsPerPage)}
                            onChange={(page) => {
                                setCurrentPage(page);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Create Task Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={modalMode === 'edit' ? 'Edit Task' : 'Create New Task'}
                size="md"
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={handleCloseModal}
                            className="px-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handleCreateTask}
                            isLoading={loading}
                            className="px-8"
                        >
                            {modalMode === 'edit' ? 'Update Task' : 'Create Task'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Task Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Task Title
                        </label>
                        <Input
                            type="text"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                            variant="metallic"
                        />
                    </div>

                    {/* Task Description */}
                    <div>
                        <TextArea
                            label="Task Description"
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                            variant="metallic"
                            onExpand={() => setIsDescriptionExpanded(true)}
                            className="min-h-[140px]"
                        />
                    </div>

                    {/* Deadline Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <DatePicker
                            label="Deadline Date"
                            value={deadlineDate}
                            onChange={setDeadlineDate}
                            placeholder="Select deadline date"
                            variant="metallic"
                        />
                        <TimeSelect
                            label="Deadline Time"
                            value={deadlineTime}
                            onChange={setDeadlineTime}
                            placeholder="Select deadline time"
                            variant="metallic"
                        />
                    </div>

                    {/* Assignee Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Assignee
                        </label>
                        <Dropdown
                            value={selectedAssignee}
                            onChange={setSelectedAssignee}
                            options={users.map(u => ({
                                value: u.id,
                                label: u.name,
                                description: u.role,
                                descriptionClassName: getRoleCapsuleClasses(u.role || '')
                            }))}
                            placeholder="Select an assignee"
                            variant="metallic"
                            showSearch={true}
                        />
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title={selectedTask?.status === 'Completed' ? (
                    <div className="flex items-center gap-2">
                        <IconCheckCircle className="w-5 h-5 text-brand-success" />
                        <span className="text-brand-success">Task Completed</span>
                    </div>
                ) : (
                    selectedTask?.task || 'Task Details'
                )}
                size="md"
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={() => setIsPreviewOpen(false)}
                            className="px-8"
                        >
                            Close
                        </Button>
                        {selectedTask?.status !== 'Completed' && (
                            <Button
                                variant="metallic"
                                onClick={() => {
                                    if (selectedTask) {
                                        handleMarkComplete(selectedTask.id);
                                        setIsPreviewOpen(false);
                                    }
                                }}
                                isLoading={loading}
                                className="px-8"
                            >
                                Mark Complete
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Description
                        </label>
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)]">
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                                {selectedTask?.description || 'No description provided.'}
                            </p>
                        </div>
                    </div>


                </div>
            </Modal>

            {/* Expanded Description Modal */}
            <Modal
                isOpen={isDescriptionExpanded}
                onClose={() => setIsDescriptionExpanded(false)}
                title="Task Description"
                size="lg"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end">
                        <Button variant="metallic" onClick={() => setIsDescriptionExpanded(false)}>
                            Done
                        </Button>
                    </div>
                )}
            >
                <div className="h-full min-h-[400px]">
                    <TextArea
                        variant="metallic"
                        placeholder="Type task details here..."
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        className="h-full"
                        rows={15}
                        autoFocus
                    />
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                }}
                title="Delete Task"
                size="sm"
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setTaskToDelete(null);
                            }}
                            className="px-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic-error"
                            onClick={handleConfirmDelete}
                            isLoading={loading}
                            className="px-8"
                        >
                            Delete Task
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-brand-error/10 flex items-center justify-center text-brand-error mb-4">
                        <IconTrash className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Confirm Deletion</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                        Are you sure you want to delete <span className="text-white font-bold">"{taskToDelete?.task}"</span>? This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default Tasks;
