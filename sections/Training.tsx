import { ElevatedMetallicCard, Modal } from '../components/Surfaces';
import { IconPlay, IconUsers, IconChevronRight, IconSearch } from '../components/Icons';
import { Plus, Edit2, Trash2, Link as LinkIcon, GripVertical, Maximize2, FileText } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { Input, TextArea } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import Button from '../components/Button';
import ReactMarkdown from 'react-markdown';
import { markdownComponents, markdownPlugins, parseCodesLogicMarkdown } from './ProjectDetails';
import { KebabMenu } from '../components/KebabMenu';
import { addToast } from '../components/Toast';
import React, { useState, useMemo } from 'react';
import { Reorder } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface Video {
    id: string;
    title: string;
    description: string;
    youtubeId: string;
    role: 'Super Admin' | 'Admin' | 'Project Manager' | 'Team Lead' | 'Freelancer' | 'Client' | 'All Roles';
    module?: string;
    documentation?: string;
}

const INITIAL_VIDEOS: Video[] = [];

const ROLES = [
    'All Roles',
    'Super Admin',
    'Admin',
    'Project Manager',
    'Team Lead',
    'Freelancer',
    'Client'
];

const Training: React.FC = () => {
    const { effectiveRole } = useUser();
    const [selectedRole, setSelectedRole] = useState('All Roles');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeVideo, setActiveVideo] = useState<Video | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDocExpanded, setIsDocExpanded] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);

    // Custom Docs State
    const [customDocs, setCustomDocs] = useState<any[]>(() => {
        const saved = localStorage.getItem('CodesLogic_CustomDocs');
        return saved ? JSON.parse(saved) : [];
    });
    React.useEffect(() => {
        localStorage.setItem('CodesLogic_CustomDocs', JSON.stringify(customDocs));
    }, [customDocs]);

    // Slash Command State
    const [slashQuery, setSlashQuery] = useState<{ active: boolean, text: string, startIndex: number, cursorIndex: number } | null>(null);
    const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState(false);
    const [newDocForm, setNewDocForm] = useState({ title: '', path: '', content: '' });
    const [standaloneDocTab, setStandaloneDocTab] = useState<'write' | 'preview'>('write');
    
    // Initialize videos from Supabase
    const [videos, setVideos] = useState<Video[]>(INITIAL_VIDEOS);

    React.useEffect(() => {
        const fetchVideos = async () => {
            const { data, error } = await supabase.from('training_videos').select('*').order('order_index', { ascending: true });
            if (data && !error) {
                setVideos(data.map((v: any) => ({
                    id: v.id,
                    title: v.title,
                    description: v.description || '',
                    youtubeId: v.youtube_id,
                    role: v.role,
                    module: v.module || 'General',
                    documentation: v.documentation || ''
                })));
            }
        };
        fetchVideos();
    }, []);
    
    // Add/Edit Video Form State
    const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [newVideoRole, setNewVideoRole] = useState('All Roles');
    const [newVideoModule, setNewVideoModule] = useState('General');
    const [newVideoLink, setNewVideoLink] = useState('');
    const [newVideoDoc, setNewVideoDoc] = useState('');
    const [docTab, setDocTab] = useState<'write' | 'preview'>('write');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

    const handleOpenModal = () => {
        setEditingVideoId(null);
        setNewVideoTitle('');
        setNewVideoRole('All Roles');
        setNewVideoModule('General');
        setNewVideoLink('');
        setNewVideoDoc('');
        setDocTab('write');
        setIsAddModalOpen(true);
    };

    const handleDocChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const val = e.target.value;
        setNewVideoDoc(val);

        // Detect if cursor is right after a '/' or word starting with '/'
        const cursor = e.target.selectionStart || val.length;
        const textBeforeCursor = val.slice(0, cursor);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
        
        if (lastSlashIndex !== -1) {
            // Check if it's a valid slash command (preceded by space or start of string)
            const isStartOrSpace = lastSlashIndex === 0 || /\s/.test(textBeforeCursor.charAt(lastSlashIndex - 1));
            
            if (isStartOrSpace) {
                const queryText = textBeforeCursor.slice(lastSlashIndex + 1);
                if (!/\s/.test(queryText)) {
                    setSlashQuery({
                        active: true,
                        text: queryText,
                        startIndex: lastSlashIndex,
                        cursorIndex: cursor
                    });
                    return;
                }
            }
        }
        setSlashQuery(null);
    };

    const insertDocLink = (doc: any) => {
        if (!slashQuery) return;
        const textBefore = newVideoDoc.substring(0, slashQuery.startIndex);
        const textAfter = newVideoDoc.substring(slashQuery.cursorIndex);
        const linkText = `[${doc.title}](/d/${doc.slug})`;
        setNewVideoDoc(textBefore + linkText + textAfter);
        setSlashQuery(null);
    };

    const openCreateDocModal = (initialTitle: string) => {
        setNewDocForm({
            title: initialTitle,
            path: Math.random().toString(36).substr(2, 6) + '-' + initialTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            content: ''
        });
        setIsCreateDocModalOpen(true);
    };

    const handleSaveNewDoc = () => {
        if (!newDocForm.title || !newDocForm.path) return;
        const newDoc = {
            id: Date.now().toString(),
            title: newDocForm.title,
            slug: newDocForm.path,
            content: newDocForm.content
        };
        setCustomDocs(prev => [...prev, newDoc]);
        setIsCreateDocModalOpen(false);
        insertDocLink(newDoc);
    };

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url; // fallback to input if it's already an ID
    };

    const handleSaveVideo = async () => {
        if (!newVideoTitle || !newVideoRole || !newVideoLink) return;

        const videoData = {
            title: newVideoTitle,
            role: newVideoRole,
            module: newVideoModule || 'General',
            youtube_id: extractYoutubeId(newVideoLink),
            documentation: newVideoDoc,
            description: ''
        };

        if (editingVideoId) {
            const { error } = await supabase.from('training_videos').update(videoData).eq('id', editingVideoId);
            if (!error) {
                setVideos(prev => prev.map(v => v.id === editingVideoId ? {
                    ...v,
                    title: newVideoTitle,
                    role: newVideoRole as any,
                    module: newVideoModule || 'General',
                    youtubeId: extractYoutubeId(newVideoLink),
                    documentation: newVideoDoc
                } : v));
                addToast({ title: 'Success', message: 'Video updated successfully', type: 'success' });
            } else {
                addToast({ title: 'Error', message: 'Failed to update video', type: 'error' });
            }
        } else {
            const { data, error } = await supabase.from('training_videos').insert({
                ...videoData,
                order_index: videos.length
            }).select().single();
            
            if (data && !error) {
                const newVideo: Video = {
                    id: data.id,
                    title: data.title,
                    role: data.role as any,
                    module: data.module || 'General',
                    youtubeId: data.youtube_id,
                    description: data.description || '',
                    documentation: data.documentation || ''
                };
                setVideos(prev => [...prev, newVideo]);
                addToast({ title: 'Success', message: 'Video added successfully', type: 'success' });
            } else {
                addToast({ title: 'Error', message: 'Failed to add video', type: 'error' });
            }
        }
        setIsAddModalOpen(false);
    };

    const confirmDelete = async () => {
        if (videoToDelete) {
            const { error } = await supabase.from('training_videos').delete().eq('id', videoToDelete.id);
            if (!error) {
                setVideos(prev => prev.filter(v => v.id !== videoToDelete.id));
                addToast({ title: 'Deleted', message: 'Video deleted successfully', type: 'success' });
            } else {
                addToast({ title: 'Error', message: 'Failed to delete video', type: 'error' });
            }
            setVideoToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const handleCopyLink = (id: string) => {
        navigator.clipboard.writeText(`#video-${id}`);
        addToast({ title: 'Link Copied', message: 'Internal Training Link Copied!', type: 'success' });
    };

    const customMarkdownComponents = {
        ...markdownComponents,
        a: ({ node, ...props }: any) => {
            if (props.href && props.href.startsWith('#video-')) {
                const vId = props.href.replace('#video-', '');
                const linkedVideo = videos.find(v => v.id === vId);
                const displayTitle = linkedVideo ? linkedVideo.title : 'Deleted Video Reference';

                return (
                    <button 
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-[11px] font-bold uppercase tracking-widest hover:bg-brand-primary/25 hover:border-brand-primary/50 transition-all cursor-pointer shadow-sm group mx-1 align-middle no-underline"
                        onClick={(e) => {
                            e.preventDefault();
                            if (linkedVideo) {
                                setActiveVideo(linkedVideo);
                            } else {
                                addToast({ title: 'Error', message: 'Video not found or you do not have permission to view it.', type: 'error' });
                            }
                        }}
                    >
                        <LinkIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                        {displayTitle}
                    </button>
                );
            }
            if (props.href && props.href.startsWith('/d/')) {
                const docTitle = props.children || 'Documentation';
                return (
                    <a 
                        href={props.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-[11px] font-bold uppercase tracking-widest hover:bg-brand-primary/25 hover:border-brand-primary/50 transition-all cursor-pointer shadow-sm group mx-1 align-middle no-underline"
                    >
                        <FileText className="w-3 h-3 group-hover:scale-110 transition-transform" />
                        {docTitle}
                    </a>
                );
            }
            // Fallback for regular links
            return markdownComponents.a ? markdownComponents.a({ node, ...props }) : <a {...props} />;
        }
    };

    const filteredVideos = videos.filter(video => {
        const matchesRole = selectedRole === 'All Roles' || video.role === selectedRole;
        const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             video.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
    });

    const groupedVideos = useMemo(() => {
        const groups: Record<string, Video[]> = {};
        // Preserve global order when grouping
        filteredVideos.forEach(v => {
            const mod = v.module || 'General';
            if (!groups[mod]) groups[mod] = [];
            groups[mod].push(v);
        });
        return groups;
    }, [filteredVideos]);

    const moduleOptions = useMemo(() => {
        const mods = new Set(videos.map(v => v.module || 'General'));
        return Array.from(mods).map(m => ({ value: m, label: m }));
    }, [videos]);

    // Formatter to implicitly wrap raw #video-xxx tags in markdown link syntax
    const formatVideoLinks = (text: string) => {
        if (!text) return '';
        return text.replace(/\[.*?\]\(#video-[a-zA-Z0-9_-]+\)|#video-([a-zA-Z0-9_-]+)/g, (match, p1) => {
            if (p1) return `[Reference Video](#video-${p1})`;
            return match;
        });
    };

    const renderCardInternal = (video: Video) => {
        const isReordering = effectiveRole === 'Super Admin' && !searchQuery && isReorderMode;

        if (isReordering) {
            return (
                <ElevatedMetallicCard 
                    className="group hover:border-brand-primary/50 transition-colors h-full flex flex-col sm:flex-row items-stretch overflow-hidden"
                    bodyClassName="flex flex-col sm:flex-row flex-1 p-0 w-full"
                >
                    <div className="hidden sm:flex flex-col items-center justify-center pl-4 pr-3 text-white/10 group-hover:text-white/40 cursor-grab active:cursor-grabbing border-r border-white/5 bg-white/[0.01]">
                        <GripVertical size={22} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="w-full sm:w-64 aspect-video relative bg-black flex-shrink-0">
                        <div className="absolute inset-0 z-10 bg-transparent"></div>
                        <iframe
                            className="w-full h-full pointer-events-none"
                            src={`https://www.youtube.com/embed/${video.youtubeId}`}
                            title={video.title}
                            frameBorder="0"
                        ></iframe>
                    </div>
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full h-full">
                            <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-[9px] font-black text-brand-primary uppercase tracking-widest">
                                        {video.role}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors">
                                    {video.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 mt-auto sm:mt-0 self-start sm:self-center">
                                <div onClick={(e) => { e.stopPropagation(); }} className="pointer-events-auto">
                                    <KebabMenu 
                                        options={[
                                            { label: 'Copy Internal Link', icon: <LinkIcon className="w-4 h-4" />, onClick: () => handleCopyLink(video.id) },
                                            { label: 'Edit Video', icon: <Edit2 className="w-4 h-4" />, onClick: () => {
                                                setEditingVideoId(video.id);
                                                setNewVideoTitle(video.title);
                                                setNewVideoRole(video.role);
                                                setNewVideoModule(video.module || 'General');
                                                setNewVideoLink(`https://youtube.com/watch?v=${video.youtubeId}`);
                                                setNewVideoDoc(video.documentation || video.description || '');
                                                setDocTab('write');
                                                setIsAddModalOpen(true);
                                            }},
                                            { label: 'Delete Video', icon: <Trash2 className="w-4 h-4" />, onClick: () => {
                                                setVideoToDelete(video);
                                                setIsDeleteModalOpen(true);
                                            }, variant: 'danger' }
                                        ]} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </ElevatedMetallicCard>
            );
        }

        return (
            <ElevatedMetallicCard 
                className="group overflow-hidden hover:border-brand-primary/50 transition-colors h-full"
            >
                <div className="aspect-video relative bg-black">
                    <div className="absolute inset-0 z-10 bg-transparent" onClick={() => setActiveVideo(video)}></div>
                    <iframe
                        className="w-full h-full pointer-events-none"
                        src={`https://www.youtube.com/embed/${video.youtubeId}`}
                        title={video.title}
                        frameBorder="0"
                    ></iframe>
                </div>
                <div className="p-5" onClick={() => setActiveVideo(video)}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-[9px] font-black text-brand-primary uppercase tracking-widest">
                                    {video.role}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors">
                                {video.title}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {effectiveRole === 'Super Admin' && (
                                <div onClick={(e) => { e.stopPropagation(); }} className="pointer-events-auto">
                                    <KebabMenu 
                                        options={[
                                            { label: 'Copy Internal Link', icon: <LinkIcon className="w-4 h-4" />, onClick: () => handleCopyLink(video.id) },
                                            { label: 'Edit Video', icon: <Edit2 className="w-4 h-4" />, onClick: () => {
                                                setEditingVideoId(video.id);
                                                setNewVideoTitle(video.title);
                                                setNewVideoRole(video.role);
                                                setNewVideoModule(video.module || 'General');
                                                setNewVideoLink(`https://youtube.com/watch?v=${video.youtubeId}`);
                                                setNewVideoDoc(video.documentation || video.description || '');
                                                setDocTab('write');
                                                setIsAddModalOpen(true);
                                            }},
                                            { label: 'Delete Video', icon: <Trash2 className="w-4 h-4" />, onClick: () => {
                                                setVideoToDelete(video);
                                                setIsDeleteModalOpen(true);
                                            }, variant: 'danger' }
                                        ]} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </ElevatedMetallicCard>
        );
    };

    const deleteCustomDoc = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCustomDocs(prev => prev.filter(d => d.id !== id));
    };

    const renderSlashMenu = () => {
        if (!slashQuery?.active) return null;
        
        const filteredDocs = customDocs.filter(d => d.title.toLowerCase().includes(slashQuery.text.toLowerCase()));
        
        return (
            <div className="absolute left-6 bottom-6 mb-2 w-64 bg-surface-overlay border border-surface-border rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3 py-2 text-[10px] font-black text-brand-primary uppercase tracking-widest border-b border-white/5 bg-black/40">
                    Link Document
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                    {filteredDocs.map(doc => (
                        <div key={doc.id} className="group relative flex items-center w-full">
                            <button
                                onClick={() => insertDocLink(doc)}
                                className="w-full text-left px-3 py-2 pr-10 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            >
                                {doc.title}
                            </button>
                            <button 
                                onClick={(e) => deleteCustomDoc(doc.id, e)}
                                className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:bg-brand-error/20 hover:text-brand-error rounded-md transition-all"
                                title="Delete Document"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    
                    {slashQuery.text.length > 0 ? (
                        !filteredDocs.some(d => d.title.toLowerCase() === slashQuery.text.toLowerCase()) && (
                            <button
                                onClick={() => openCreateDocModal(slashQuery.text)}
                                className="w-full text-left px-3 py-2 text-[13px] text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors font-bold flex items-center gap-2"
                            >
                                <Plus size={14} className="stroke-2" />
                                Create "{slashQuery.text}"
                            </button>
                        )
                    ) : (
                        filteredDocs.length === 0 && (
                            <div className="px-3 py-3 text-xs text-gray-500 italic text-center">
                                Type a document name to create
                            </div>
                        )
                    )}
                </div>
            </div>
        );
    };

    if (activeVideo) {
        return (
            <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <ElevatedMetallicCard className="min-h-full flex flex-col" bodyClassName="flex flex-col p-0">
                    {/* Header with Back Button - Sticky to stay at top while scrolling */}
                    <div className="sticky top-0 z-20 bg-surface-card/95 backdrop-blur-md px-6 md:px-8 py-4 md:py-5 border-b border-white/10 flex items-center gap-4 flex-none rounded-t-[1.3rem]">
                        <button 
                            onClick={() => setActiveVideo(null)} 
                            className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-surface-bg border border-surface-border hover:bg-white/10 hover:border-brand-primary/50 transition-all text-gray-400 hover:text-brand-primary group/backbtn"
                        >
                            <IconChevronRight className="w-5 h-5 rotate-180 transition-transform group-hover/backbtn:-translate-x-1" />
                        </button>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">
                                {activeVideo.title}
                            </h3>
                        </div>
                        <span className="ml-auto px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-black text-brand-primary uppercase tracking-widest hidden sm:block">
                            {activeVideo.role}
                        </span>
                    </div>

                    {/* Un-restricted Content area */}
                    <div className="flex-1 px-6 md:px-8 py-6 md:py-8">
                        <div className="max-w-4xl mx-auto aspect-video w-full bg-black rounded-2xl overflow-hidden relative mb-10 shadow-2xl border border-white/10">
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}`}
                                title={activeVideo.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>

                        {/* Divider & Documentation */}
                        {(activeVideo.documentation || activeVideo.description) && (
                            <>
                                <div className="w-full max-w-4xl mx-auto h-px bg-white/10 mb-8 mt-10"></div>
                                <div className="text-gray-300 leading-relaxed text-base max-w-4xl mx-auto prose prose-invert">
                                    <ReactMarkdown components={customMarkdownComponents} remarkPlugins={markdownPlugins}>
                                        {parseCodesLogicMarkdown(formatVideoLinks(activeVideo.documentation || activeVideo.description || ''))}
                                    </ReactMarkdown>
                                </div>
                            </>
                        )}
                    </div>
                </ElevatedMetallicCard>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Page Sidebar - Roles Selection */}
            <div className="lg:w-64 flex-none">
                <ElevatedMetallicCard 
                    title={
                        <div className="flex items-center gap-2">
                            <IconUsers className="w-4 h-4 text-brand-primary" />
                            <span className="text-sm font-bold text-brand-primary uppercase tracking-wider">Training Roles</span>
                        </div>
                    }
                    className="h-full"
                    bodyClassName="p-4"
                >
                    <div className="space-y-1">
                        {ROLES.map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
                                    selectedRole === role 
                                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                                }`}
                            >
                                <span className="text-sm font-bold tracking-wide">{role}</span>
                                <IconChevronRight className={`w-4 h-4 transition-transform duration-300 ${
                                    selectedRole === role ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                                }`} />
                            </button>
                        ))}
                    </div>
                </ElevatedMetallicCard>
            </div>

            {/* Main Content - Video Gallery */}
            <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-hidden">
                {/* Search & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="max-w-xs w-full">
                        <Input 
                            type="text"
                            placeholder="Search tutorials..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            variant="recessed"
                            leftIcon={<IconSearch className="w-4 h-4" />}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {effectiveRole === 'Super Admin' && !searchQuery && (
                            <Button 
                                variant="recessed"
                                className={isReorderMode ? "bg-black/80 border-brand-primary/30 text-brand-primary shadow-[inset_0_4px_24px_rgba(0,0,0,0.9)]" : ""}
                                onClick={() => setIsReorderMode(!isReorderMode)}
                            >
                                {isReorderMode ? 'Done Reordering' : 'Reorder Videos'}
                            </Button>
                        )}
                        {effectiveRole === 'Super Admin' && (
                            <Button 
                                variant="metallic"
                                onClick={handleOpenModal}
                                leftIcon={<Plus className="w-5 h-5" />}
                            >
                                Add Video
                            </Button>
                        )}
                    </div>
                </div>

                {/* Videos Grouped By Module */}
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {Object.entries(groupedVideos).map(([modLabel, modVideos]) => (
                        <div key={modLabel} className="mb-10 last:mb-0">
                            <h2 className="text-[12px] font-black text-brand-primary uppercase tracking-widest mb-4 opacity-80 px-1 border-b border-white/5 pb-2">{modLabel} MODULE</h2>
                            
                            {effectiveRole === 'Super Admin' && !searchQuery && isReorderMode ? (
                                <Reorder.Group 
                                    as="div"
                                    axis="y" 
                                    values={modVideos} 
                                    onReorder={(newOrder) => {
                                        setVideos(prev => {
                                            const newGlobal = [...prev];
                                            const moduleIndices = prev.map((v, i) => (v.module || 'General') === modLabel && filteredVideos.some(fv => fv.id === v.id) ? i : -1).filter(i => i !== -1);
                                            moduleIndices.forEach((globalIdx, localIdx) => {
                                                newGlobal[globalIdx] = newOrder[localIdx];
                                            });
                                            
                                            // Bulk update to supabase
                                            const updates = newGlobal.map((v, idx) => ({ 
                                                id: v.id, 
                                                title: v.title, 
                                                youtube_id: v.youtubeId, 
                                                role: v.role, 
                                                order_index: idx 
                                            }));
                                            supabase.from('training_videos').upsert(updates).then();
                                            
                                            return newGlobal;
                                        });
                                    }}
                                    className="flex flex-col gap-4 w-full"
                                >
                                    {modVideos.map(video => (
                                        <Reorder.Item 
                                            as="div" 
                                            key={video.id} 
                                            value={video} 
                                            className="w-full rounded-2xl cursor-grab active:cursor-grabbing"
                                        >
                                            {renderCardInternal(video)}
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {modVideos.map(video => (
                                        <div key={video.id} className="col-span-1 cursor-pointer">
                                            {renderCardInternal(video)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredVideos.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/5 rounded-3xl mt-4">
                            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] flex items-center justify-center text-brand-primary mb-4">
                                <IconSearch size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white">No tutorials found</h3>
                            <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest font-medium">Try adjusting your search or role filter</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Video Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={<span className="text-white">{editingVideoId ? 'EDIT TRAINING VIDEO' : 'ADD TRAINING VIDEO'}</span>}
                size="md"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="recessed" onClick={() => setIsAddModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="metallic" onClick={handleSaveVideo}>
                            {editingVideoId ? 'Save Changes' : 'Save Video'}
                        </Button>
                    </div>
                )}
            >
                <div className="flex flex-col gap-5 pt-2">
                    <Input 
                        label="VIDEO TITLE" 
                        placeholder="e.g. How to QA Projects" 
                        variant="recessed"
                        value={newVideoTitle}
                        onChange={(e) => setNewVideoTitle(e.target.value)}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Dropdown 
                            label="TARGET ROLE"
                            placeholder="Select Role"
                            options={ROLES.filter(r => r !== 'All Roles').map(role => ({ value: role, label: role }))}
                            value={newVideoRole}
                            onChange={(val) => setNewVideoRole(val as string)}
                            variant="recessed"
                        />
                        <Dropdown 
                            label="MODULE / SECTION"
                            placeholder="Search or Create..."
                            options={moduleOptions}
                            value={newVideoModule}
                            onChange={(val) => setNewVideoModule(val as string)}
                            variant="recessed"
                            showSearch
                            isCreatable
                            onCreate={(val) => setNewVideoModule(val)}
                        />
                        <Input 
                            label="YOUTUBE LINK" 
                            placeholder="https://youtube.com/watch?v=..." 
                            variant="recessed"
                            value={newVideoLink}
                            onChange={(e) => setNewVideoLink(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex flex-col gap-2 relative">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium text-gray-400 ml-1">DETAILED DOCUMENTATION (OPTIONAL)</label>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-black/40 rounded-lg overflow-hidden border border-white/5 p-0.5">
                                    <button 
                                        onClick={() => setDocTab('write')}
                                        className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${docTab === 'write' ? 'bg-surface-border text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        Write
                                    </button>
                                    <button 
                                        onClick={() => setDocTab('preview')}
                                        className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${docTab === 'preview' ? 'bg-surface-border text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        Preview
                                    </button>
                                </div>
                                <button
                                    title="Expand Details"
                                    onClick={() => setIsDocExpanded(true)}
                                    className="p-1.5 rounded-lg border border-transparent hover:bg-white/[0.04] hover:border-white/[0.05] text-gray-500 hover:text-white transition-all shadow-none"
                                >
                                    <Maximize2 size={16} />
                                </button>
                            </div>
                        </div>
                        
                        {docTab === 'write' ? (
                            <div className="relative w-full flex flex-col">
                                <TextArea 
                                    placeholder="Step-by-step written guide (Markdown Supported)... Try typing / to link a document." 
                                    variant="recessed"
                                    className="min-h-[140px]"
                                    value={newVideoDoc}
                                    onChange={handleDocChange}
                                />
                                {renderSlashMenu()}
                            </div>
                        ) : (
                            <div className="w-full bg-black/60 border border-white/[0.05] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] rounded-xl px-4 py-4 min-h-[140px] prose prose-invert prose-brand max-w-none text-sm">
                                {newVideoDoc ? (
                                    <ReactMarkdown components={customMarkdownComponents} remarkPlugins={markdownPlugins}>
                                        {parseCodesLogicMarkdown(formatVideoLinks(newVideoDoc))}
                                    </ReactMarkdown>
                                ) : (
                                    <span className="text-gray-600 italic font-medium">No documentation provided yet...</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Expanded Documentation Modal */}
            <Modal
                isOpen={isDocExpanded}
                onClose={() => setIsDocExpanded(false)}
                title={<span className="text-white">DETAILED DOCUMENTATION</span>}
                size="lg"
                maxHeight="90vh"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="metallic" onClick={() => setIsDocExpanded(false)}>
                            Done Editing
                        </Button>
                    </div>
                )}
            >
                <div className="flex flex-col h-[65vh] p-4">
                     <div className="flex items-center justify-between mb-4 mt-2">
                        <label className="text-sm font-medium text-gray-400 ml-1 uppercase tracking-wider">Editor</label>
                        <div className="flex items-center bg-black/40 rounded-lg overflow-hidden border border-white/5 p-0.5">
                            <button 
                                onClick={() => setDocTab('write')}
                                className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${docTab === 'write' ? 'bg-surface-border text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                            >
                                Write
                            </button>
                            <button 
                                onClick={() => setDocTab('preview')}
                                className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${docTab === 'preview' ? 'bg-surface-border text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>
                    {docTab === 'write' ? (
                            <div className="flex-1 w-full bg-black/60 border border-white/[0.05] rounded-xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] focus-within:shadow-[inset_0_2px_16px_rgba(0,0,0,0.9)] focus-within:border-white/10 transition-all overflow-hidden relative">
                                <textarea 
                                    placeholder="Step-by-step written guide (Markdown Supported)... Try typing / to link a document." 
                                    className="absolute inset-0 w-full h-full bg-transparent text-white placeholder:text-gray-600 outline-none p-6 text-base resize-none overflow-y-auto"
                                    value={newVideoDoc}
                                    onChange={handleDocChange}
                                />
                                {renderSlashMenu()}
                            </div>
                        ) : (
                            <div className="w-full bg-black/60 border border-white/[0.05] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] rounded-xl px-6 py-6 flex-1 overflow-y-auto prose prose-invert prose-brand max-w-none text-base h-[50vh]">
                                {newVideoDoc ? (
                                    <ReactMarkdown components={customMarkdownComponents} remarkPlugins={markdownPlugins}>
                                        {parseCodesLogicMarkdown(formatVideoLinks(newVideoDoc))}
                                    </ReactMarkdown>
                                ) : (
                                    <span className="text-gray-600 italic font-medium">No documentation provided yet...</span>
                                )}
                            </div>
                        )}
                </div>
            </Modal>

            {/* Create Custom Document Modal */}
            <Modal
                isOpen={isCreateDocModalOpen}
                onClose={() => setIsCreateDocModalOpen(false)}
                title={<span className="text-brand-primary">CREATE STANDALONE DOCUMENT</span>}
                size="lg"
                maxHeight="90vh"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="recessed" onClick={() => setIsCreateDocModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="metallic" onClick={handleSaveNewDoc}>
                            Save Document
                        </Button>
                    </div>
                )}
            >
                <div className="flex flex-col gap-6 p-4">
                    <Input 
                        label="DOCUMENT HEADING" 
                        placeholder="e.g. Setting up AWS" 
                        variant="recessed"
                        value={newDocForm.title}
                        onChange={(e) => setNewDocForm({...newDocForm, title: e.target.value, path: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')})}
                    />
                    <Input 
                        label="URL PATH (AUTO-GENERATED)" 
                        placeholder="my-cool-doc" 
                        variant="recessed"
                        value={newDocForm.path}
                        readOnly
                        disabled
                    />
                    <div className="flex flex-col flex-1 h-[45vh]">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">DOCUMENT TEXT</label>
                            <div className="flex items-center bg-black/40 rounded-lg overflow-hidden border border-white/5 p-0.5">
                                <button 
                                    onClick={() => setStandaloneDocTab('write')}
                                    className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${standaloneDocTab === 'write' ? 'bg-surface-border text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Write
                                </button>
                                <button 
                                    onClick={() => setStandaloneDocTab('preview')}
                                    className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${standaloneDocTab === 'preview' ? 'bg-surface-border text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>
                        
                        {standaloneDocTab === 'write' ? (
                            <div className="flex-1 w-full relative bg-black/60 border border-white/[0.05] rounded-xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] focus-within:shadow-[inset_0_2px_16px_rgba(0,0,0,0.9)] focus-within:border-white/10 transition-all overflow-hidden min-h-[30vh]">
                                <textarea 
                                    placeholder="Start writing your document... This text will be shown on the standalone URL path." 
                                    className="absolute inset-0 w-full h-full bg-transparent text-white placeholder:text-gray-600 outline-none p-6 text-base resize-none overflow-y-auto"
                                    value={newDocForm.content}
                                    onChange={(e) => setNewDocForm({...newDocForm, content: e.target.value})}
                                />
                            </div>
                        ) : (
                            <div className="w-full bg-black/60 border border-white/[0.05] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] rounded-xl px-6 py-6 flex-1 overflow-y-auto prose prose-invert prose-brand max-w-none text-base h-[30vh]">
                                {newDocForm.content ? (
                                    <ReactMarkdown components={customMarkdownComponents} remarkPlugins={markdownPlugins}>
                                        {parseCodesLogicMarkdown(formatVideoLinks(newDocForm.content))}
                                    </ReactMarkdown>
                                ) : (
                                    <span className="text-gray-600 italic font-medium">No documentation provided yet...</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={<span className="text-brand-error">Delete Video</span>}
                size="sm"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="recessed" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="metallic-error" onClick={confirmDelete}>
                            Yes, Delete Video
                        </Button>
                    </div>
                )}
            >
                <div>
                    <p className="text-gray-300">Are you sure you want to delete <span className="text-white font-bold">"{videoToDelete?.title}"</span>? This action cannot be undone.</p>
                </div>
            </Modal>
        </div>
    );
};

export default Training;
