import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useUser } from '../contexts/UserContext';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { IconPlus, IconEdit, IconTrash, IconSend } from '../components/Icons';
import { Modal } from '../components/Surfaces';
import { KebabMenu } from '../components/KebabMenu';

const Channels: React.FC = () => {
    const { profile } = useUser();
    
    // State
    const [channels, setChannels] = useState<{id: string, name: string, description?: string}[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Messages State
    const [messages, setMessages] = useState<any[]>([]);
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Profiles for Dropdown
    const [profiles, setProfiles] = useState<any[]>([]);
    
    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelDesc, setNewChannelDesc] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editChannelId, setEditChannelId] = useState<string | null>(null);
    const [editChannelName, setEditChannelName] = useState('');
    const [editChannelDesc, setEditChannelDesc] = useState('');
    const [editSelectedUsers, setEditSelectedUsers] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    
    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!profile?.id) return;
        
        const fetchInitialData = async () => {
            setIsLoading(true);
            
            const { data: usersData } = await supabase.from('profiles').select('id, name, role').order('name');
            if (usersData) {
                setProfiles(usersData);
            }

            const { data: channelsData, error: channelsError } = await supabase
                .from('channel_members')
                .select(`
                    channel_id,
                    channels (id, name, description)
                `)
                .eq('user_id', profile.id);
                
            if (channelsData && !channelsError) {
                const mappedChannels = channelsData
                    .filter(item => item.channels !== null)
                    .map(item => ({
                        // @ts-ignore
                        id: item.channels.id,
                        // @ts-ignore
                        name: item.channels.name,
                        // @ts-ignore
                        description: item.channels.description
                    }));
                
                setChannels(mappedChannels);
                if (mappedChannels.length > 0 && !activeChannelId) {
                    setActiveChannelId(mappedChannels[0].id);
                }
            }
            
            setIsLoading(false);
        };
        
        fetchInitialData();
    }, [profile?.id]);

    // Fetch Messages & Subscribe
    useEffect(() => {
        if (!activeChannelId) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('channel_messages')
                .select('*')
                .eq('channel_id', activeChannelId)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);
            }
        };

        fetchMessages();

        const channelSub = supabase.channel(`messages:${activeChannelId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'channel_messages',
                filter: `channel_id=eq.${activeChannelId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channelSub);
        };
    }, [activeChannelId]);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getProfile = (id: string) => profiles.find(p => p.id === id);

    const handleSendMessage = async () => {
        if (!messageText.trim() || !activeChannelId || !profile?.id) return;

        const textToPost = messageText.trim();
        setMessageText(''); // Optimistically clear input

        try {
            const { data, error } = await supabase.from('channel_messages').insert([{
                channel_id: activeChannelId,
                sender_id: profile.id,
                content: textToPost,
                is_system_message: false
            }]).select().single();
            
            if (error) {
                console.error("Supabase insert error:", error);
                throw error;
            }

            // Update local state immediately to ensure it shows up
            if (data) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.id)) return prev;
                    return [...prev, data];
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessageText(textToPost); // Restore on error
            alert("Failed to send message. Please try again.");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const userOptions = profiles.map(p => ({
        value: p.id,
        label: p.name,
        description: p.role
    }));

    const handleCreateChannel = async () => {
        if (!newChannelName.trim() || selectedUsers.length === 0 || !profile?.id) return;
        
        setIsCreating(true);
        const channelSlug = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
        
        try {
            const { data: channelData, error: channelError } = await supabase
                .from('channels')
                .insert([{ name: channelSlug, description: newChannelDesc, created_by: profile.id }])
                .select()
                .single();
                
            if (channelError) throw channelError;

            const membersToInsert = [...new Set([...selectedUsers, profile.id])].map(userId => ({
                channel_id: channelData.id,
                user_id: userId
            }));

            const { error: membersError } = await supabase
                .from('channel_members')
                .insert(membersToInsert);

            if (membersError) throw membersError;

            const newChannelObj = {
                id: channelData.id,
                name: channelData.name,
                description: channelData.description
            };
            setChannels(prev => [...prev, newChannelObj]);
            setActiveChannelId(newChannelObj.id);

            for (const userId of selectedUsers) {
                if (userId === profile.id) continue;
                try {
                    await addNotification({
                        type: 'system',
                        reference_id: channelData.id,
                        message: `You have been added to a new channel: #${channelData.name}`,
                        user_id: userId,
                        is_read: false
                    });
                } catch (err) {}
            }

            setNewChannelName('');
            setNewChannelDesc('');
            setSelectedUsers([]);
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Error creating channel:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenEditModal = async (channel: any) => {
        setEditChannelId(channel.id);
        setEditChannelName(channel.name);
        setEditChannelDesc(channel.description || '');
        setEditSelectedUsers([]);
        setIsEditModalOpen(true);

        const { data } = await supabase
            .from('channel_members')
            .select('user_id')
            .eq('channel_id', channel.id);
            
        if (data) {
            setEditSelectedUsers(data.map(m => m.user_id));
        }
    };

    const handleEditChannel = async () => {
        if (!editChannelName.trim() || editSelectedUsers.length === 0 || !editChannelId || !profile?.id) return;
        
        setIsEditing(true);
        const channelSlug = editChannelName.trim().toLowerCase().replace(/\s+/g, '-');
        
        try {
            await supabase
                .from('channels')
                .update({ name: channelSlug, description: editChannelDesc })
                .eq('id', editChannelId);

            // Replace all members
            await supabase.from('channel_members').delete().eq('channel_id', editChannelId);
            
            const membersToInsert = [...new Set([...editSelectedUsers, profile.id])].map(userId => ({
                channel_id: editChannelId,
                user_id: userId
            }));
            
            await supabase.from('channel_members').insert(membersToInsert);

            setChannels(prev => prev.map(c => 
                c.id === editChannelId 
                    ? { ...c, name: channelSlug, description: editChannelDesc } 
                    : c
            ));

            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error editing channel:", error);
        } finally {
            setIsEditing(false);
        }
    };

    const confirmDeleteChannel = (id: string) => {
        setChannelToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteChannel = async () => {
        if (!channelToDelete) return;
        setIsDeleting(true);
        
        try {
            // First delete all messages in this channel to prevent foreign key errors
            const { error: msgError } = await supabase.from('channel_messages').delete().eq('channel_id', channelToDelete);
            if (msgError) throw msgError;

            // Then delete all members of this channel
            const { error: memberError } = await supabase.from('channel_members').delete().eq('channel_id', channelToDelete);
            if (memberError) throw memberError;

            // Finally, delete the channel itself
            const { error: channelError } = await supabase.from('channels').delete().eq('id', channelToDelete);
            if (channelError) throw channelError;
            
            // Only remove from UI if database deletion was successful
            setChannels(prev => prev.filter(c => c.id !== channelToDelete));
            if (activeChannelId === channelToDelete) {
                setActiveChannelId(null);
            }
            
            setIsDeleteModalOpen(false);
            setChannelToDelete(null);
        } catch (error: any) {
            console.error("Error deleting channel:", error);
            alert("Failed to delete channel: " + (error.message || "Unknown error"));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex overflow-hidden bg-surface-card rounded-2xl border border-surface-border animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Sidebar */}
            <div className="w-64 border-r border-surface-border flex flex-col bg-surface-bg/50">
                <div className="h-16 px-4 border-b border-surface-border flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-white">Channels</h2>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-8 h-8 p-0 rounded-full hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
                        onClick={() => {
                            setNewChannelName('');
                            setNewChannelDesc('');
                            setSelectedUsers([]);
                            setIsCreateModalOpen(true);
                        }}
                    >
                        <IconPlus className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : channels.length === 0 ? (
                        <div className="text-center py-6 text-sm text-gray-500">
                            No channels yet
                        </div>
                    ) : (
                        channels.map(channel => (
                            <div key={channel.id} className="relative group w-full flex items-center">
                                <button
                                    onClick={() => setActiveChannelId(channel.id)}
                                    className={`w-full text-left pl-3 pr-10 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                        activeChannelId === channel.id 
                                            ? 'bg-brand-primary/10 text-brand-primary font-medium' 
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <span className="text-lg font-light opacity-70">#</span>
                                    <span className="truncate flex-1">{channel.name}</span>
                                </button>
                                
                                <div className={`absolute right-1 transition-opacity duration-200 ${activeChannelId === channel.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <KebabMenu 
                                        options={[
                                            {
                                                label: 'Edit Channel',
                                                icon: <IconEdit className="w-4 h-4" />,
                                                onClick: () => handleOpenEditModal(channel)
                                            },
                                            {
                                                label: 'Delete Channel',
                                                icon: <IconTrash className="w-4 h-4" />,
                                                variant: 'danger',
                                                onClick: () => confirmDeleteChannel(channel.id)
                                            }
                                        ]} 
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Inbox Area */}
            <div className="flex-1 flex flex-col bg-surface-card relative">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : channels.length === 0 || !activeChannelId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-surface-overlay border border-surface-border flex items-center justify-center mb-6 text-brand-primary">
                            <IconPlus className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Create New Channel</h3>
                        <p className="text-gray-400 max-w-sm">
                            Click the + icon in the sidebar to start a new workspace.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="h-16 border-b border-surface-border flex items-center px-6 shrink-0">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-gray-500 font-light">#</span>
                                {channels.find(c => c.id === activeChannelId)?.name}
                            </h2>
                            {channels.find(c => c.id === activeChannelId)?.description && (
                                <span className="text-sm text-gray-500 ml-4 hidden md:inline-block truncate">
                                    | {channels.find(c => c.id === activeChannelId)?.description}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col custom-scrollbar">
                            <div className="mt-auto space-y-6">
                                <div className="text-center pb-4">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        Welcome to #{channels.find(c => c.id === activeChannelId)?.name}
                                    </span>
                                </div>
                                
                                <div className="flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold shrink-0">
                                        B
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="font-bold text-white">System Bot</span>
                                            <span className="text-xs text-gray-500">Beginning of time</span>
                                        </div>
                                        <div className="bg-surface-overlay border border-surface-border rounded-xl rounded-tl-none p-3 text-sm text-gray-300">
                                            Welcome to the beginning of <strong>#{channels.find(c => c.id === activeChannelId)?.name}</strong>! 👋<br />
                                            {channels.find(c => c.id === activeChannelId)?.description && (
                                                <span className="text-gray-400 mt-1 block">Description: {channels.find(c => c.id === activeChannelId)?.description}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {messages.map((msg, idx) => {
                                    const senderInfo = getProfile(msg.sender_id);
                                    
                                    return (
                                        <div key={msg.id || idx} className="flex gap-4 animate-in fade-in duration-300">
                                            <div className="w-10 h-10 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center text-white font-bold shrink-0">
                                                {msg.is_system_message ? 'M' : senderInfo?.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="font-bold text-white">
                                                        {msg.is_system_message ? 'System Bot' : senderInfo?.name || 'Unknown User'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`border rounded-xl rounded-tl-none p-3 text-sm ${msg.is_system_message ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary font-medium' : 'bg-surface-overlay border-surface-border text-gray-300'}`}>
                                                    <ReactMarkdown 
                                                        remarkPlugins={[remarkBreaks]}
                                                        components={{
                                                            p: ({node, ...props}) => <p className="m-0" {...props} />,
                                                            strong: ({node, ...props}) => <strong className="font-bold drop-shadow-sm" {...props} />,
                                                            hr: () => <hr className="my-2 border-brand-primary/20" />
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        
                        <div className="h-20 px-4 bg-surface-bg/50 border-t border-surface-border flex items-center gap-3 shrink-0">
                            <input 
                                type="text" 
                                placeholder={`Message #${channels.find(c => c.id === activeChannelId)?.name}`}
                                className="flex-1 bg-surface-overlay border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-colors"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <Button 
                                variant="metallic"
                                onClick={handleSendMessage}
                                disabled={!messageText.trim()}
                                className="h-[46px] px-6 shrink-0"
                                rightIcon={<IconSend className="w-4 h-4" />}
                            >
                                Post
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Create Channel Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Channel"
                size="sm"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3 items-center">
                        <Button variant="recessed" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button 
                            variant="metallic" 
                            onClick={handleCreateChannel}
                            disabled={!newChannelName.trim() || selectedUsers.length === 0 || isCreating}
                            isLoading={isCreating}
                        >
                            Create Channel
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6 py-2">
                    <Input 
                        label="Channel Name"
                        variant="recessed"
                        leftIcon={<span className="text-gray-500 font-light">#</span>}
                        placeholder="e.g. design-feedback"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    />
                    
                    <Input 
                        label="Description (Optional)"
                        variant="recessed"
                        placeholder="What's this channel about?"
                        value={newChannelDesc}
                        onChange={(e) => setNewChannelDesc(e.target.value)}
                    />
                    
                    <div>
                        <Dropdown 
                            label={`Add Members (${selectedUsers.length} selected)`}
                            variant="recessed"
                            isMulti
                            options={userOptions}
                            value={selectedUsers}
                            onChange={(val) => setSelectedUsers(val as string[])}
                            placeholder="Select users..."
                            showSearch
                            searchPlaceholder="Search users..."
                        />
                        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                            Selected users will receive a notification and gain access to this channel securely.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Edit Channel Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Channel"
                size="sm"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3 items-center">
                        <Button variant="recessed" onClick={() => setIsEditModalOpen(false)} disabled={isEditing}>
                            Cancel
                        </Button>
                        <Button 
                            variant="metallic" 
                            onClick={handleEditChannel}
                            disabled={!editChannelName.trim() || editSelectedUsers.length === 0 || isEditing}
                            isLoading={isEditing}
                        >
                            Save Changes
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6 py-2">
                    <Input 
                        label="Channel Name"
                        variant="recessed"
                        leftIcon={<span className="text-gray-500 font-light">#</span>}
                        placeholder="e.g. design-feedback"
                        value={editChannelName}
                        onChange={(e) => setEditChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    />
                    
                    <Input 
                        label="Description (Optional)"
                        variant="recessed"
                        placeholder="What's this channel about?"
                        value={editChannelDesc}
                        onChange={(e) => setEditChannelDesc(e.target.value)}
                    />
                    
                    <div>
                        <Dropdown 
                            label={`Add Members (${editSelectedUsers.length} selected)`}
                            variant="recessed"
                            isMulti
                            options={userOptions}
                            value={editSelectedUsers}
                            onChange={(val) => setEditSelectedUsers(val as string[])}
                            placeholder="Select users..."
                            showSearch
                            searchPlaceholder="Search users..."
                        />
                    </div>
                </div>
            </Modal>

            {/* Delete Channel Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Channel"
                size="sm"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3 items-center">
                        <Button variant="recessed" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button 
                            variant="metallic-error" 
                            onClick={handleDeleteChannel}
                            disabled={isDeleting}
                            isLoading={isDeleting}
                        >
                            Delete
                        </Button>
                    </div>
                }
            >
                <div className="py-2 text-gray-300 leading-relaxed text-sm">
                    Are you sure you want to delete this channel? This action cannot be undone and will permanently remove all messages and members from the channel.
                </div>
            </Modal>
        </div>
    );
};

export default Channels;
