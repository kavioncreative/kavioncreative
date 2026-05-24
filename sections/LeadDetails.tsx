import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    IconChevronLeft,
    IconUser,
    IconMoreVertical,
    IconPaperclip,
    IconLayoutSidebar,
    IconCalendar,
    IconClock,
    IconChevronRight,
    IconEdit,
    IconSave,
    IconBriefcase,
    IconTag,
    IconMapPin,
    IconSend,
    IconUsers,
    IconHistory
} from '../components/Icons';
import Button from '../components/Button';
import { elevatedCardClasses, Card, Modal } from '../components/Surfaces';
import { ElevatedMetallicCard } from '../components/ElevatedMetallicCard';
import { Input, TextArea, Select } from '../components/Input';
import { Radio, Checkbox } from '../components/Selection';
import { DatePicker } from '../components/DatePicker';
import { TimeSelect } from '../components/TimeSelect';
import { addToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import { Avatar } from '../components/Avatar';
import { uploadFile } from '../utils/storage';
import { IconCamera, IconPhotoOff, IconTrash, IconMessage2, IconLoader2, IconMaximize2, IconEye, IconX, IconDownload, IconAlertCircle } from '../components/Icons';
import ReactMarkdown from 'react-markdown';
import { markdownPlugins, markdownComponents, parseCodesLogicMarkdown } from '../utils/markdown';
import { Dropdown } from '../components/Dropdown';
import { getStatusCapsuleClasses, getStatusTextColor } from '../components/Badge';
import { triggerWebhooks } from '../utils/webhookTrigger';


interface LeadDetailsProps {
    lead: any;
    onBack: () => void;
    onUpdate?: (status?: string) => void;
}

export default function LeadDetails({ lead, onBack, onUpdate }: LeadDetailsProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [pendingImages, setPendingImages] = useState<string[]>([]);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const { profile } = useUser();
    const commentEndRef = useRef<HTMLDivElement>(null);

    // Interaction Proof State
    const [clientMessageText, setClientMessageText] = useState(lead.client_message_text || '');
    const [responseText, setResponseText] = useState(lead.response_text || '');
    const [isClientTextModalOpen, setIsClientTextModalOpen] = useState(false);
    const [isResponseTextModalOpen, setIsResponseTextModalOpen] = useState(false);
    const [clientMessageScreenshot, setClientMessageScreenshot] = useState(lead.client_message_screenshot || '');
    const [responseScreenshot, setResponseScreenshot] = useState(lead.response_screenshot || '');
    const [isSavingProof, setIsSavingProof] = useState(false);
    const [n8nResponse, setN8nResponse] = useState<string | null>(null);
    const [isProofModalOpen, setIsProofModalOpen] = useState(false);
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualSender, setManualSender] = useState<'me' | 'client'>('me');
    const [manualTimestamp, setManualTimestamp] = useState('');

    // Client History State
    const [isClientHistoryOpen, setIsClientHistoryOpen] = useState(false);
    const [clientHistory, setClientHistory] = useState<any[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    // Initiate Project Wizard States
    const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
    const [initiateStep, setInitiateStep] = useState<'summary' | 'brief' | 'price' | 'project_id' | 'addons' | 'deadline' | 'assignee' | 'review'>('summary');

    const [aiSummary, setAiSummary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [summaryAction, setSummaryAction] = useState<'brief' | 'comments' | null>(null);
    const [projectBrief, setProjectBrief] = useState('');
    const [briefMode, setBriefMode] = useState<'edit' | 'preview'>('edit');
    const [optionsRequired, setOptionsRequired] = useState<string | null>(null);
    const [dealValue, setDealValue] = useState('');
    const [assigneePayout, setAssigneePayout] = useState('');
    const [projectIdMode, setProjectIdMode] = useState<string | null>('Auto Generate');
    const [newProjectId, setNewProjectId] = useState('');
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [addonsOther, setAddonsOther] = useState('');
    const [clientDueDate, setClientDueDate] = useState<Date | null>(null);
    const [clientDueTime, setClientDueTime] = useState('');
    const [internalDueDate, setInternalDueDate] = useState<Date | null>(null);
    const [internalDueTime, setInternalDueTime] = useState('');
    const [activeShortcut, setActiveShortcut] = useState<number | null>(null);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [freelancerWorkload, setFreelancerWorkload] = useState<Record<string, { assigned: number, inProgress: number }>>({});
    const [serviceType, setServiceType] = useState(lead.project_title || 'Logo Design');
    const [webhookUrl, setWebhookUrl] = useState(''); // To be filled
    const [isInitiating, setIsInitiating] = useState(false);
    const [projectBriefFiles, setProjectBriefFiles] = useState<File[]>([]);

    const briefFileInputRef = useRef<HTMLInputElement>(null);

    const fetchClientHistory = async () => {
        if (!lead.client_name) return;
        setIsFetchingHistory(true);
        try {
            const { data: leadsData } = await supabase
                .from('leads')
                .select('id, project_title, created_at, message_date')
                .ilike('client_name', lead.client_name)
                .order('created_at', { ascending: true });

            if (leadsData && leadsData.length > 0) {
                const leadMap = leadsData.reduce((acc: any, l: any) => ({ ...acc, [l.id]: l }), {});
                const leadIds = leadsData.map(l => l.id);
                const { data: commentsData, error } = await supabase
                    .from('lead_comments')
                    .select('*')
                    .in('lead_id', leadIds)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                const cleanedHistory = (commentsData || []).filter(comment => {
                    if (comment.author_role === 'system_log' && (comment.content.includes('Evidence Captured:') || comment.content.includes('Interaction Initiated'))) {
                        return false;
                    }
                    return true;
                }).map(comment => ({
                    ...comment,
                    lead: leadMap[comment.lead_id]
                }));

                setClientHistory(cleanedHistory);
            }
        } catch (e) {
            console.error('Error fetching client history:', e);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load client history.' });
        } finally {
            setIsFetchingHistory(false);
        }
    };

    const fetchFreelancersAndWorkload = async () => {
        try {
            // Fetch Freelancers
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('id, name, email, role, daily_capacity')
                .eq('status', 'Active')
                .or('role.ilike.%freelancer%,role.ilike.%team lead%')
                .order('name', { ascending: true });

            if (!usersError && usersData) {
                setTeamMembers(usersData);
            }

            // Fetch Workload
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('designer_name, status');

            if (!projectsError && projectsData) {
                const stats: Record<string, { assigned: number, inProgress: number }> = {};
                projectsData.forEach(proj => {
                    if (proj.designer_name) {
                        if (!stats[proj.designer_name]) {
                            stats[proj.designer_name] = { assigned: 0, inProgress: 0 };
                        }
                        if (proj.status !== 'Completed' && proj.status !== 'Cancelled') {
                            stats[proj.designer_name].assigned += 1;
                        }
                        if (proj.status === 'In Progress' || proj.status === 'Revisions') {
                            stats[proj.designer_name].inProgress += 1;
                        }
                    }
                });
                setFreelancerWorkload(stats);
            }
        } catch (e) {
            console.error('Error fetching freelancers data:', e);
        }
    };

    useEffect(() => {
        if (isInitiateModalOpen) {
            fetchFreelancersAndWorkload();
        }
    }, [isInitiateModalOpen]);

    const handleBriefFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            setProjectBriefFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const statuses = ['New', 'Active', 'Offer Sent', 'Converted', 'Project Completed', 'Upsell Sent', 'Interested', 'Upsell Won', 'Not Interested', 'Lost'];

    const toggleAddon = (item: string) => {
        setSelectedAddons(prev => {
            if (item === 'None') {
                return prev.includes('None') ? [] : ['None'];
            }
            const next = prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev.filter(i => i !== 'None'), item];

            if (item === 'Other' && !next.includes('Other')) {
                setAddonsOther('');
            }
            return next;
        });
    };

    const handleDeadlineShortcut = (hours: number) => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

        setInternalDueDate(futureDate);

        const hh = String(futureDate.getHours()).padStart(2, '0');
        const mm = String(futureDate.getMinutes()).padStart(2, '0');
        setInternalDueTime(`${hh}:${mm}`);
        setActiveShortcut(hours);
    };

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('lead_comments')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const cleanedComments = (data || []).filter(comment => {
                if (comment.author_role === 'system_log' && (comment.content.includes('Evidence Captured:') || comment.content.includes('Interaction Initiated'))) {
                    return false; // Remove completely
                }
                return true;
            });

            setComments(cleanedComments);
        } catch (err: any) {
            console.error('Error fetching lead comments:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load comments.' });
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (commentEndRef.current) {
                commentEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const isInitiated = !!n8nResponse || !!lead.automation_result || comments.some(c => c.author_role === 'system_log');
    const isInitiateRef = useRef(false);

    // REPLACE THIS URL with your actual n8n AI Webhook URL once ready
    const N8N_AI_BRIEF_WEBHOOK_URL = 'https://kashifn8n.app.n8n.cloud/webhook/ai-brief-assistant';

    useEffect(() => {
        if (isInitiateModalOpen && initiateStep === 'summary' && !isInitiateRef.current) {
            isInitiateRef.current = true;
            setIsAiLoading(true);

            const fetchSummary = async () => {
                try {
                    // Combine chat history
                    const chatHistory = comments.map(c => `${c.author_name} (${c.author_role}): ${c.content}`).join('\n\n');

                    const response = await fetch(N8N_AI_BRIEF_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'summarize',
                            project_title: lead.project_title || 'Unknown',
                            chat_history: chatHistory || 'No history provided.'
                        })
                    });

                    if (response.ok) {
                        const summaryText = await response.text();
                        try {
                            let parsed = JSON.parse(summaryText);
                            if (typeof parsed === 'string') {
                                parsed = JSON.parse(parsed);
                            }
                            const aiData = Array.isArray(parsed) ? parsed[0] : parsed;
                            let extracted = aiData.markdown || aiData.output || aiData.text || aiData.message || summaryText;
                            if (typeof extracted === 'string') {
                                extracted = extracted.replace(/\\n/g, '\n');
                            }
                            setAiSummary(extracted);
                        } catch (e) {
                            setAiSummary(summaryText);
                        }
                    } else {
                        setAiSummary('Failed to generate AI Summary. Please write manually.');
                    }
                } catch (error) {
                    console.error('AI Error:', error);
                    setAiSummary('Error connecting to AI Server. Please write manually.');
                } finally {
                    setIsAiLoading(false);
                }
            };

            fetchSummary();
        }
        if (!isInitiateModalOpen) {
            isInitiateRef.current = false;
        }
    }, [isInitiateModalOpen, initiateStep]);

    const handleRefineBrief = async () => {
        if (!refinePrompt.trim() || isRefining) return;

        setIsRefining(true);
        try {
            const response = await fetch(N8N_AI_BRIEF_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'refine',
                    current_brief: aiSummary,
                    refine_prompt: refinePrompt
                })
            });

            if (response.ok) {
                const refinedText = await response.text();
                try {
                    let parsed = JSON.parse(refinedText);
                    if (typeof parsed === 'string') {
                        parsed = JSON.parse(parsed);
                    }
                    const aiData = Array.isArray(parsed) ? parsed[0] : parsed;
                    let extracted = aiData.markdown || aiData.output || aiData.text || aiData.message || refinedText;
                    if (typeof extracted === 'string') {
                        extracted = extracted.replace(/\\n/g, '\n');
                    }
                    setAiSummary(extracted);
                } catch (e) {
                    setAiSummary(refinedText);
                }
                setRefinePrompt('');
            } else {
                addToast({ type: 'error', title: 'AI Error', message: 'Failed to refine the brief.' });
            }
        } catch (error) {
            console.error('Refine error:', error);
            addToast({ type: 'error', title: 'Connection Error', message: 'Could not connect to AI server.' });
        } finally {
            setIsRefining(false);
        }
    };

    const handleNextStep = (next: any) => {
        setInitiateStep(next);
    };

    const [isSubmittingProject, setIsSubmittingProject] = useState(false);

    const handleInitiateProjectSubmit = async () => {
        try {
            setIsSubmittingProject(true);

            // Format dates
            let formattedDate = null;
            if (internalDueDate) {
                const yyyy = internalDueDate.getFullYear();
                const mm = String(internalDueDate.getMonth() + 1).padStart(2, '0');
                const dd = String(internalDueDate.getDate()).padStart(2, '0');
                formattedDate = `${yyyy}-${mm}-${dd}`;
            }

            let formattedClientDate = null;
            if (clientDueDate) {
                const yyyy = clientDueDate.getFullYear();
                const mm = String(clientDueDate.getMonth() + 1).padStart(2, '0');
                const dd = String(clientDueDate.getDate()).padStart(2, '0');
                formattedClientDate = `${yyyy}-${mm}-${dd}`;
            }

            // Upload Attachments
            const attachmentsJson = await Promise.all(projectBriefFiles.map(async file => {
                try {
                    const uploaded = await uploadFile(file);
                    return {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        url: uploaded.url
                    };
                } catch (err) {
                    console.error('Failed to upload file:', file.name, err);
                    return null;
                }
            })).then(results => results.filter(r => r !== null));

            const accountPrefix = lead?.account || 'LD';
            const finalProjectId = (projectIdMode === 'Add Manually' && newProjectId.trim())
                ? newProjectId.trim()
                : (`${accountPrefix} ${Math.floor(100000 + Math.random() * 900000)}`);

            // Fetch account_id from accounts table if an account prefix exists
            let mappedAccountId = null;
            if (lead?.account) {
                const { data: accData } = await supabase.from('accounts').select('id').eq('prefix', lead.account).single();
                if (accData) mappedAccountId = accData.id;
            }

            const finalBrief = summaryAction === 'comments' && aiSummary
                ? (projectBrief ? `${projectBrief}\n\n### Additional Comments\n\n${aiSummary}` : `### Additional Comments\n\n${aiSummary}`)
                : projectBrief;

            const payload = {
                project_id: finalProjectId,
                action_move: 'Add',
                account: lead?.account || null,
                account_id: mappedAccountId,
                project_title: serviceType,
                client_type: 'new',
                client_name: lead?.client_name || lead?.name || lead?.contact_info || 'Unknown',
                items_sold: [],
                addons: { items: selectedAddons, other: addonsOther },
                price: parseFloat(String(dealValue).replace(/[^0-9.]/g, '')) || 0,
                brief: finalBrief,
                options_required: optionsRequired ? parseInt(optionsRequired) : null,
                attachments: attachmentsJson,
                client_due_date: formattedClientDate,
                client_due_time: clientDueTime || null,
                due_date: formattedDate,
                due_time: internalDueTime || null,
                converted_by: profile?.id,
                order_type: 'Inquiry',
                assignee: teamMembers.find(m => m.id === selectedAssigneeId)?.name || teamMembers.find(m => m.id === selectedAssigneeId)?.email || '',
                assignee_id: selectedAssigneeId,
                primary_manager_id: profile?.id,
                collaborators: [],
                designer_fee: assigneePayout || null,
                status: 'In Progress',
                created_at: new Date().toISOString()
            };

            const { data: insertedData, error: insertError } = await supabase
                .from('projects')
                .insert([payload])
                .select();

            if (insertError) throw insertError;

            const inserted = insertedData && insertedData[0];
            if (inserted) {
                const { error: leadUpdateError } = await supabase
                    .from('leads')
                    .update({ status: 'Converted' })
                    .eq('id', lead.id);

                if (leadUpdateError) console.error("Error updating lead status:", leadUpdateError);

                await supabase.from('lead_comments').insert([{
                    lead_id: lead.id,
                    content: `Lead successfully converted to Project: ${finalProjectId}`,
                    author_id: profile?.id,
                    author_name: profile?.name || profile?.email || 'Unknown User',
                    author_role: 'system_log'
                }]);

                triggerWebhooks('projectCreated', {
                    project: inserted,
                    action: 'Add',
                    triggeringUser: profile?.name || profile?.email || 'Unknown User',
                    assignee: payload.assignee,
                    clientName: payload.client_name,
                    orderType: payload.order_type
                }).catch(e => console.error('BG Webhook Error:', e));

                addToast({ type: 'success', title: 'Project Created', message: 'Project initiated successfully and moved to In Progress.' });
                setIsInitiateModalOpen(false);
                onBack();
                if (typeof onUpdate === 'function') onUpdate();
            }
        } catch (error) {
            console.error("Error initiating project:", error);
            addToast({ type: 'error', title: 'Error', message: 'Failed to initiate project.' });
        } finally {
            setIsSubmittingProject(false);
        }
    };

    const savedAutomationResult = lead.automation_result ||
        comments.find(c => c.author_role === 'system_log')?.content
            ?.split('#### 🤖 Automation Response:')[1]?.split('---')[0]?.trim();

    const formatAutomationResult = (text: string | null) => {
        if (!text) return '';
        try {
            // If it's JSON, extract the primary message/status
            const parsed = JSON.parse(text);
            if (typeof parsed === 'object' && parsed !== null) {
                return parsed.response_status || parsed.response || parsed.message || JSON.stringify(parsed);
            }
            return text;
        } catch (e) {
            // Not JSON, return as is
            return text;
        }
    };

    useEffect(() => {
        fetchComments();
    }, [lead.id]);

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    setIsUploadingImage(true);
                    addToast({ type: 'info', title: 'Uploading', message: 'Uploading pasted image...' });
                    try {
                        const uploaded = await uploadFile(file);
                        setPendingImages(prev => [...prev, uploaded.url]);
                        addToast({ type: 'success', title: 'Uploaded', message: 'Image uploaded successfully.' });
                    } catch (err) {
                        console.error('Pasted image upload error:', err);
                        addToast({ type: 'error', title: 'Error', message: 'Failed to upload image.' });
                    } finally {
                        setIsUploadingImage(false);
                    }
                }
                break;
            }
        }
    };

    const handlePostComment = async () => {
        if ((!newComment.trim() && pendingImages.length === 0) || isPosting) return;

        setIsPosting(true);
        try {
            const authorName = manualSender === 'client' ? lead.client_name : (profile?.name || 'Me');
            const authorRole = manualSender === 'client' ? 'client' : (profile?.role || 'User');

            let finalContent = newComment.trim();
            if (pendingImages.length > 0) {
                const imageMarkdown = pendingImages.map((url, i) => `![Attached Image ${i + 1}](${url})`).join('\n\n');
                finalContent = finalContent ? `${finalContent}\n\n${imageMarkdown}` : imageMarkdown;
            }

            const payload: any = {
                lead_id: lead.id,
                content: finalContent,
                author_name: authorName,
                author_role: authorRole
            };

            if ((isManualMode || isInitiated) && manualTimestamp) {
                let dateStr = manualTimestamp.trim();
                if (!/\d{4}/.test(dateStr)) {
                    const currentYear = new Date().getFullYear();
                    const parts = dateStr.split(',');
                    if (parts.length === 2) {
                        dateStr = `${parts[0]} ${currentYear},${parts[1]}`;
                    } else {
                        dateStr = `${dateStr} ${currentYear}`;
                    }
                }
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                    payload.created_at = parsedDate.toISOString();
                } else {
                    addToast({ type: 'error', title: 'Invalid Time', message: 'Could not parse the time format.' });
                    setIsPosting(false);
                    return;
                }
            }

            const { error } = await supabase.from('lead_comments').insert(payload);

            if (error) throw error;
            setNewComment('');
            setPendingImages([]);
            setManualTimestamp('');
            await fetchComments();
            scrollToBottom();
        } catch (err: any) {
            console.error('Error posting comment:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to post comment.' });
        } finally {
            setIsPosting(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (newStatus === lead.status || isUpdatingStatus) return;

        setIsUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ status: newStatus })
                .eq('id', lead.id);

            if (error) throw error;

            // Optional: Post a system comment about status change
            await supabase.from('lead_comments').insert({
                lead_id: lead.id,
                content: `STATUS_CHANGED:${lead.status}:${newStatus}`,
                author_name: profile?.name || 'System',
                author_role: 'system_log'
            });

            addToast({
                type: 'success',
                title: 'Status Updated',
                message: `Lead status is now ${newStatus}`
            });

            if (onUpdate) onUpdate(newStatus);
            await fetchComments();
            scrollToBottom();
        } catch (err: any) {
            console.error('Error updating status:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to update status.' });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleSaveProof = async () => {
        setIsSavingProof(true);
        setN8nResponse(null);
        try {
            // 1. Update Database with Proofs
            const { error: dbError } = await supabase
                .from('leads')
                .update({
                    client_message_screenshot: clientMessageScreenshot || null,
                    response_screenshot: responseScreenshot || null,
                    client_message_text: clientMessageText || null,
                    response_text: responseText || null
                })
                .eq('id', lead.id);

            if (dbError) throw dbError;

            // 2. Trigger n8n and WAIT for response
            const N8N_WEBHOOK_URL = 'https://kashifn8n.app.n8n.cloud/webhook/bfb161af-27c7-448e-8e16-8f0526c26649';

            const webhookPayload = {
                event: 'lead_initiated',
                lead_id: lead.id,
                client_name: lead.client_name,
                project_title: lead.project_title || 'Logo Design',
                account: lead.account || 'Not Specified',
                client_message: clientMessageText || lead.client_message_text || 'Included in chat history',
                client_image: clientMessageScreenshot || lead.client_message_screenshot,
                my_response: responseText || lead.response_text || 'Included in chat history',
                my_image: responseScreenshot || lead.response_screenshot,
                chat_history: comments.map(c => `${c.author_name} (${c.author_role}): ${c.content}`).join('\n\n'),
                initiated_at: new Date().toISOString(),
                initiated_by: profile?.name || 'System'
            };

            let finalResponseText = '';
            try {
                const response = await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(webhookPayload)
                });

                if (response.ok) {
                    finalResponseText = await response.text();
                    setN8nResponse(finalResponseText);

                    // Update database with the result for persistence
                    await supabase
                        .from('leads')
                        .update({ automation_result: finalResponseText })
                        .eq('id', lead.id);

                    // Refresh lead data if onUpdate is provided
                    if (onUpdate) onUpdate();
                } else {
                    finalResponseText = `Error: n8n responded with status ${response.status}`;
                }
            } catch (fetchErr) {
                console.error('Fetch error:', fetchErr);
                finalResponseText = 'Failed to connect to automation server.';
            }


            // 4. Refresh comments
            await fetchComments();
            scrollToBottom();

            addToast({
                type: 'success',
                title: 'Initiated',
                message: 'Interaction proof saved and automation response received.'
            });

        } catch (error: any) {
            console.error('Error in save proof flow:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to initiate chat.' });
        } finally {
            setIsSavingProof(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full bg-surface-bg animate-in fade-in duration-500 overflow-hidden relative">
            {/* 1. LEFT COLUMN - METADATA & PROOF SIDEBAR */}
            <aside
                className={`${isSidebarCollapsed ? "lg:w-[80px]" : "lg:w-[380px]"} hidden lg:flex flex-col h-full lg:border-r border-surface-border bg-surface-bg shrink-0 transition-all duration-300 ease-in-out relative z-30`}
            >
                {/* Fixed Header */}
                <header
                    className={`h-20 shrink-0 border-b border-surface-border flex items-center ${isSidebarCollapsed ? "px-0" : "px-6 lg:px-10"}`}
                >
                    <div className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                        {!isSidebarCollapsed && (
                            <>
                                <button
                                    onClick={onBack}
                                    className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all shrink-0"
                                >
                                    <IconChevronLeft size={20} />
                                </button>
                                <h3 className="flex-1 text-center text-sm font-bold text-white uppercase tracking-widest whitespace-nowrap px-4">
                                    Lead Details
                                </h3>
                            </>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all shrink-0"
                            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <IconLayoutSidebar
                                size={20}
                                className={isSidebarCollapsed ? "" : "text-brand-primary"}
                            />
                        </button>
                    </div>
                </header>

                {/* Scrollable Metadata Content */}
                <div className={`flex-1 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? "lg:px-0 py-10 space-y-8 no-scrollbar" : "p-6 lg:p-8 space-y-10 pb-20 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent"}`}>
                    <MetadataSection title="Lead Metadata" isCollapsed={isSidebarCollapsed} collapsedHeight="lg:h-[630px]">
                        <div className="space-y-5">
                            <MetadataItem
                                label="Lead Intake Date"
                                isDate
                                isRecessed
                                value={new Date(lead.message_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            />
                            <MetadataItem
                                label="Client Name"
                                leftIcon={<IconUser size={16} />}
                                isRecessed
                                value={lead.client_name}
                            />
                            <MetadataItem
                                label="Added By"
                                leftIcon={<IconUsers size={16} />}
                                isRecessed
                                value={lead.added_by || 'Unknown'}
                            />
                            <MetadataItem
                                label="Client Interest"
                                leftIcon={<IconBriefcase size={16} />}
                                isRecessed
                                value={lead.project_title || 'Not Specified'}
                            />
                            <MetadataItem
                                label="Account"
                                leftIcon={<IconBriefcase size={16} />}
                                isRecessed
                                value={lead.account || '—'}
                            />
                            <MetadataItem
                                label="Location"
                                leftIcon={<IconMapPin size={16} />}
                                isRecessed
                                value={lead.location || '—'}
                            />
                            <MetadataItem
                                label="Lead Type"
                                leftIcon={<IconTag size={16} />}
                                isRecessed
                                value={lead.client_type}
                            />
                            {lead.client_type?.toLowerCase() === 'repeat' && (
                                <MetadataItem
                                    label="Prev Order ID"
                                    leftIcon={<IconTag size={16} />}
                                    isRecessed
                                    value={lead.previous_order_id || '—'}
                                />
                            )}
                        </div>
                    </MetadataSection>

                    <MetadataSection title="Workflow Management" isCollapsed={isSidebarCollapsed} collapsedHeight="lg:h-[210px]">
                        <Dropdown
                            options={statuses.map(s => ({ label: s, value: s }))}
                            value={lead.status}
                            onChange={handleUpdateStatus}
                            className="w-full"
                        >
                            <MetadataItem
                                label="Lead Status"
                                value={lead.status}
                                isSelect
                                valueClassName="text-brand-primary"
                            />
                        </Dropdown>

                        <div className="pt-2">
                            <Button
                                variant="metallic"
                                className="w-full !rounded-xl !py-3 font-bold tracking-wider text-[11px] uppercase shadow-nova"
                                leftIcon={<IconBriefcase size={16} />}
                                onClick={() => {
                                    setIsInitiateModalOpen(true);
                                    setInitiateStep('summary');
                                    // Here we will trigger the webhook
                                }}
                            >
                                Initiate New Project
                            </Button>
                        </div>
                    </MetadataSection>
                </div>
            </aside>

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Unified Header Match with ProjectDetails */}
                <header className="h-20 shrink-0 border-b border-surface-border flex items-center justify-between px-6 lg:px-10 bg-surface-bg/50 backdrop-blur-md relative z-40">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-black text-white tracking-tight leading-none truncate max-w-[600px]">
                            {lead.project_title || 'Logo Design'}
                        </h1>
                        <span className={getStatusCapsuleClasses(lead.status)}>
                            {lead.status}
                        </span>
                    </div>
                    {lead.client_name && (
                        <div className="flex items-center">
                            <Button
                                variant="recessed"
                                size="sm"
                                className="!rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                                leftIcon={<IconHistory size={16} className="text-brand-primary" />}
                                onClick={() => {
                                    setIsClientHistoryOpen(true);
                                    fetchClientHistory();
                                }}
                            >
                                Client History
                            </Button>
                        </div>
                    )}
                </header>

                <main className="flex-1 overflow-y-auto no-scrollbar scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
                    <div className="w-full px-6 py-6 lg:px-10 lg:pt-10 lg:pb-10 flex flex-col relative z-10 bg-transparent min-h-full">

                        {/* 1. New State: Interaction Proof Form */}
                        {(!n8nResponse && !lead.automation_result && comments.length === 0 && !isManualMode) && (
                            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-top-6 duration-700 min-h-0">
                                <ElevatedMetallicCard
                                    title={
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-brand-primary/10 text-brand-primary">
                                                <IconCamera size={18} />
                                            </div>
                                            <div>
                                                <h2 className="text-xs font-black text-white uppercase tracking-widest">Interaction Proof</h2>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Capture evidence of your first response</p>
                                            </div>
                                        </div>
                                    }
                                    className="flex-1 flex flex-col h-full"
                                    bodyClassName="p-8 flex-1 flex flex-col min-h-0"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 flex-1 min-h-0">
                                        {/* Column 1: Client Message */}
                                        <div className="flex flex-col space-y-10 min-h-0">
                                            <div className="space-y-3 shrink-0">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Message Text</span>
                                                    </div>
                                                    <button onClick={() => setIsClientTextModalOpen(true)} className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 transition-all">
                                                        <IconMaximize2 size={14} />
                                                    </button>
                                                </div>
                                                <TextArea value={clientMessageText} onChange={(e) => setClientMessageText(e.target.value)} placeholder="Paste the client's message here..." variant="recessed" className="h-32 text-[11px] font-bold" />
                                            </div>
                                            <div className="flex flex-col space-y-3 flex-1 min-h-0">
                                                <div className="flex items-center gap-2 px-1 mb-1 shrink-0">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Message Screenshot</span>
                                                </div>
                                                <ScreenshotUpload label="Upload Proof" url={clientMessageScreenshot} onUpload={(url) => setClientMessageScreenshot(url)} className="flex-1 min-h-0" />
                                            </div>
                                        </div>

                                        {/* Column 2: Your Response */}
                                        <div className="flex flex-col space-y-10 min-h-0">
                                            <div className="space-y-3 shrink-0">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Response Text</span>
                                                    </div>
                                                    <button onClick={() => setIsResponseTextModalOpen(true)} className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 transition-all">
                                                        <IconMaximize2 size={14} />
                                                    </button>
                                                </div>
                                                <TextArea value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Write your response here..." variant="recessed" className="h-32 text-[11px] font-bold" />
                                            </div>
                                            <div className="flex flex-col space-y-3 flex-1 min-h-0">
                                                <div className="flex items-center gap-2 px-1 mb-1 shrink-0">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Response Screenshot</span>
                                                </div>
                                                <ScreenshotUpload label="Upload Proof" url={responseScreenshot} onUpload={(url) => setResponseScreenshot(url)} className="flex-1 min-h-0" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex flex-col md:flex-row justify-center items-center gap-4 shrink-0">
                                        <Button
                                            variant="metallic"
                                            className="!rounded-2xl !py-4 !px-12 font-black tracking-[0.2em] text-[12px] uppercase shadow-nova hover:scale-[1.05] active:scale-[0.95] transition-all min-w-[280px]"
                                            onClick={handleSaveProof}
                                            isLoading={isSavingProof}
                                            disabled={isSavingProof || !clientMessageText || !responseText}
                                            leftIcon={<IconMessage2 size={18} />}
                                        >
                                            {isSavingProof ? 'Initiating...' : 'Initiate chat'}
                                        </Button>
                                        <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">or</span>
                                        <Button
                                            variant="recessed"
                                            className="!rounded-2xl !py-4 !px-8 font-black tracking-widest text-[11px] uppercase border-white/10 hover:bg-white/5 transition-all min-w-[220px]"
                                            onClick={() => setIsManualMode(true)}
                                            leftIcon={<IconUsers size={16} />}
                                        >
                                            Build Manual History
                                        </Button>
                                    </div>

                                    {/* Loading Overlay */}
                                    {isSavingProof && (
                                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <IconLoader2 className="text-brand-primary animate-spin" size={32} />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-2">
                                                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] animate-pulse">Processing Automation</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Waiting for n8n response...</p>
                                            </div>
                                        </div>
                                    )}
                                </ElevatedMetallicCard>
                            </div>
                        )}

                        {/* 2. Initiated State: Project Brief Style Card */}
                        {isInitiated && (
                            <div className="shrink-0 animate-in fade-in slide-in-from-top-6 duration-700 pb-8">
                                <ElevatedMetallicCard
                                    title={
                                        <div className="flex items-center gap-4">
                                            <span>Interaction Brief</span>
                                            {(n8nResponse || savedAutomationResult) && (
                                                <div className="!border-none !rounded-md !px-3 !py-1.5 !tracking-wider !text-[10px] whitespace-nowrap !min-w-max text-center font-black uppercase bg-blue-500/20 text-blue-400 animate-in zoom-in duration-500">
                                                    {formatAutomationResult(n8nResponse || savedAutomationResult)}
                                                </div>
                                            )}
                                        </div>
                                    }
                                    rightElement={
                                        (clientMessageScreenshot || responseScreenshot || lead.client_message_screenshot || lead.response_screenshot) && (
                                            <Button
                                                variant="recessed"
                                                size="sm"
                                                className="!h-8 !px-4 !rounded-lg text-[9px] font-black uppercase tracking-widest border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10 transition-all"
                                                leftIcon={<IconEye size={14} />}
                                                onClick={() => setIsProofModalOpen(true)}
                                            >
                                                View Proof
                                            </Button>
                                        )
                                    }
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/40" />
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Message</span>
                                            </div>
                                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-[13px] font-medium leading-relaxed text-gray-300 min-h-[120px] shadow-inner whitespace-pre-wrap">
                                                {clientMessageText || lead.client_message_text || 'No text provided.'}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/40" />
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Response</span>
                                            </div>
                                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-[13px] font-medium leading-relaxed text-gray-300 min-h-[120px] shadow-inner whitespace-pre-wrap">
                                                {responseText || lead.response_text || 'No text provided.'}
                                            </div>
                                        </div>
                                    </div>
                                </ElevatedMetallicCard>
                            </div>
                        )}

                        {/* Message Thread Section */}
                        {(comments.length > 0 || isManualMode || isInitiated) && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 flex-1 flex flex-col min-h-0">
                                {(isManualMode && !isInitiated) && (
                                    <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 flex items-center justify-between animate-in slide-in-from-top-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                                            <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Manual Conversation Mode Active</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="!h-7 text-[9px] font-black text-gray-500 hover:text-white"
                                            onClick={() => setIsManualMode(false)}
                                        >
                                            Switch to One-shot
                                        </Button>
                                    </div>
                                )}
                                <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar min-h-0">
                                    {comments.map((comment, idx) => {
                                        const isClient = comment.author_role === 'client';

                                        // Handle Status Change Card
                                        if (comment.content?.startsWith("STATUS_CHANGED:")) {
                                            const parts = comment.content.split(":");
                                            const oldStatus = parts[1];
                                            const newStatus = parts[2];

                                            return (
                                                <div
                                                    key={comment.id}
                                                    className={`space-y-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}
                                                    style={{ animationDelay: `${idx * 50}ms` }}
                                                >
                                                    <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
                                                        <div className="px-6 py-4 border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden">
                                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" />
                                                            <div className="flex justify-between items-center relative z-10 w-full">
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${getStatusCapsuleClasses(newStatus).split(" ").find((c) => c.includes("text-")) || "text-brand-primary"}`}>
                                                                    STATUS CHANGED
                                                                </span>
                                                            </div>
                                                            <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none -z-10">
                                                                <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Changed By</span>
                                                            <span className="text-[11px] font-bold text-white uppercase tracking-widest">{comment.author_name || "User"}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Date</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                                                    {new Date(comment.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                                                                </span>
                                                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                                    {new Date(comment.created_at).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Previous Status</span>
                                                            <span className={`${getStatusCapsuleClasses(oldStatus)} opacity-50`}>{oldStatus}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01]">
                                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Current Status</span>
                                                            <span className={getStatusCapsuleClasses(newStatus)}>{newStatus}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Standard Text Comment
                                        return (
                                            <div
                                                key={comment.id}
                                                className={`space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500`}
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isClient ? 'bg-brand-primary/60 animate-pulse' : 'bg-emerald-500/60'}`} />
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                            {isClient ? 'Client Message' : 'Your Response'} • {comment.author_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                                        {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                                                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`
                                                    p-6 rounded-2xl border text-[13px] font-medium leading-relaxed shadow-inner transition-all duration-300
                                                    ${isClient
                                                        ? 'bg-brand-primary/[0.02] border-brand-primary/10 text-gray-300 hover:border-brand-primary/20'
                                                        : 'bg-white/[0.02] border-white/5 text-gray-300 hover:border-white/10'
                                                    }
                                                `}>
                                                    <div className="prose prose-invert prose-sm max-w-none">
                                                        <ReactMarkdown
                                                            remarkPlugins={markdownPlugins}
                                                            components={markdownComponents}
                                                        >
                                                            {comment.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={commentEndRef} />
                                </div>

                                {/* New Comment Input */}
                                <div className="pt-6 shrink-0">
                                    <ElevatedMetallicCard
                                        title={
                                            <span className="text-brand-primary">
                                                {(isManualMode || isInitiated) ? "Manual Conversation Mode" : "Team Discussion"}
                                            </span>
                                        }
                                        rightElement={
                                            (isManualMode || isInitiated) ? (
                                                <div className="flex p-1 bg-[#0a0a0a] border border-white/[0.05] rounded-xl w-fit shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] relative overflow-hidden">
                                                    <button
                                                        onClick={() => setManualSender('me')}
                                                        className={`relative px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${manualSender === 'me'
                                                            ? 'text-white shadow-[0_4px_12px_rgba(255,107,0,0.3)]'
                                                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {manualSender === 'me' && (
                                                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-[#ff6b00] opacity-90 z-0 rounded-lg border border-white/20" />
                                                        )}
                                                        <span className="relative z-10">Me</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setManualSender('client')}
                                                        className={`relative px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${manualSender === 'client'
                                                            ? 'text-white shadow-[0_4px_12px_rgba(255,107,0,0.3)]'
                                                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {manualSender === 'client' && (
                                                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-[#ff6b00] opacity-90 z-0 rounded-lg border border-white/20" />
                                                        )}
                                                        <span className="relative z-10">Client</span>
                                                    </button>
                                                </div>
                                            ) : undefined
                                        }
                                        headerClassName="px-8 py-3 flex items-center justify-between"
                                        bodyClassName="p-8"
                                    >
                                        <div className="space-y-4">
                                            <TextArea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder={isUploadingImage ? "Uploading image..." : ((isManualMode || isInitiated) ? `Type ${manualSender}'s message... (Paste images to upload)` : "Write a comment... (Paste images to upload)")}
                                                variant="recessed"
                                                className="relative z-10"
                                                inputClassName="min-h-[140px]"
                                                disabled={isUploadingImage}
                                                onPaste={handlePaste}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && e.ctrlKey) {
                                                        e.preventDefault();
                                                        handlePostComment();
                                                    }
                                                }}
                                            />

                                            {pendingImages.length > 0 && (
                                                <div className="flex flex-wrap gap-3 pt-2">
                                                    {pendingImages.map((url, i) => (
                                                        <div key={i} className="relative group/file rounded-xl overflow-visible w-20 h-20 shadow-lg animate-in zoom-in duration-300">
                                                            <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 relative bg-surface-overlay">
                                                                <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />

                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/file:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20 backdrop-blur-[1px]">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPreviewImageUrl(url);
                                                                        }}
                                                                        className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary shadow-lg"
                                                                        title="Preview"
                                                                    >
                                                                        <IconEye size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Remove Button (Hover) */}
                                                            <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/file:opacity-100 transition-opacity z-30">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setPendingImages(prev => prev.filter((_, idx) => idx !== i));
                                                                    }}
                                                                    className="bg-surface-card border border-surface-border text-gray-400 hover:text-brand-error p-1 rounded-full shadow-lg transition-colors"
                                                                    title="Remove Image"
                                                                >
                                                                    <IconX size={10} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 relative z-10 pt-2">
                                                {(isManualMode || isInitiated) ? (
                                                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center gap-2">
                                                            <IconClock size={14} strokeWidth={2.5} className="text-gray-400" />
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hidden sm:inline">Message Time</span>
                                                        </div>
                                                        <Input
                                                            type="text"
                                                            size="sm"
                                                            placeholder="e.g. Apr 21, 11:58 AM"
                                                            value={manualTimestamp}
                                                            onChange={(e) => setManualTimestamp(e.target.value)}
                                                            variant="recessed"
                                                            className="w-[180px]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest px-1 flex items-center gap-2">
                                                        Press <kbd className="px-2 py-1 rounded-md bg-surface-card border border-surface-border text-gray-400 font-black shadow-inner tracking-widest">CTRL+ENTER</kbd> to send
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                                    {(isManualMode || isInitiated) && (
                                                        <div className="hidden md:flex items-center">
                                                            <kbd className="px-2 py-1 rounded-md bg-surface-card border border-surface-border text-[9px] text-gray-400 font-black shadow-inner tracking-widest">CTRL+ENTER</kbd>
                                                        </div>
                                                    )}
                                                    <Button
                                                        variant="metallic"
                                                        className="flex-1 sm:flex-none px-8 py-3 sm:py-2.5 h-auto sm:h-[38px] text-xs font-bold uppercase tracking-widest transition-all duration-500"
                                                        leftIcon={<IconSend size={14} />}
                                                        onClick={handlePostComment}
                                                        isLoading={isPosting}
                                                        disabled={isPosting || !newComment.trim()}
                                                    >
                                                        {isManualMode || isInitiated ? "Send Message" : "Post Comment"}
                                                    </Button>
                                                </div>
                                            </div>

                                            {(isManualMode && !isInitiated) && comments.length > 0 && (
                                                <div className="pt-4 mt-4 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                    <Button
                                                        variant="metallic"
                                                        className="w-full h-14 !rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20"
                                                        onClick={handleSaveProof}
                                                        isLoading={isSavingProof}
                                                        leftIcon={<IconZap size={18} />}
                                                    >
                                                        Generate Project Brief from History
                                                    </Button>
                                                    <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-tighter mt-3 italic">
                                                        This will analyze the entire manual conversation to create your brief
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </ElevatedMetallicCard>
                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* Client Message Text Expansion Modal */}
            <Modal
                isOpen={isClientTextModalOpen}
                onClose={() => setIsClientTextModalOpen(false)}
                title="Client Message Content"
                size="xl"
            >
                <div className="space-y-6">
                    <div className="p-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
                        <p className="text-[10px] text-brand-primary font-black uppercase tracking-widest text-center">
                            Full Client Message Text
                        </p>
                    </div>

                    <TextArea
                        value={clientMessageText}
                        onChange={(e) => setClientMessageText(e.target.value)}
                        placeholder="Paste the full client message here..."
                        variant="recessed"
                        className="h-[500px] text-[13px] font-medium leading-relaxed"
                        autoFocus
                    />

                    <div className="flex justify-center pt-2">
                        <Button
                            variant="metallic"
                            className="!rounded-2xl !py-4 !px-12 font-black tracking-[0.2em] text-[12px] uppercase shadow-nova hover:scale-[1.05] active:scale-[0.95] transition-all min-w-[200px]"
                            onClick={() => setIsClientTextModalOpen(false)}
                        >
                            Confirm Content
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Your Response Text Expansion Modal */}
            <Modal
                isOpen={isResponseTextModalOpen}
                onClose={() => setIsResponseTextModalOpen(false)}
                title="Your Response Content"
                size="xl"
            >
                <div className="space-y-6">
                    <div className="p-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
                        <p className="text-[10px] text-brand-primary font-black uppercase tracking-widest text-center">
                            Full Response Text
                        </p>
                    </div>

                    <TextArea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write your full response here..."
                        variant="recessed"
                        className="h-[500px] text-[13px] font-medium leading-relaxed"
                        autoFocus
                    />

                    <div className="flex justify-center pt-2">
                        <Button
                            variant="metallic"
                            className="!rounded-2xl !py-4 !px-12 font-black tracking-[0.2em] text-[12px] uppercase shadow-nova hover:scale-[1.05] active:scale-[0.95] transition-all min-w-[200px]"
                            onClick={() => setIsResponseTextModalOpen(false)}
                        >
                            Confirm Content
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Interaction Proof Evidence Modal */}
            <Modal
                isOpen={isProofModalOpen}
                onClose={() => setIsProofModalOpen(false)}
                title="Interaction Evidence"
                size="xl"
            >
                <div className="space-y-8 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Message Proof</span>
                            </div>
                            <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40 aspect-video flex items-center justify-center group">
                                {clientMessageScreenshot ? (
                                    <img src={clientMessageScreenshot} alt="Client Proof" className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-600">
                                        <IconPhotoOff size={32} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">No Image Attached</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Response Proof</span>
                            </div>
                            <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40 aspect-video flex items-center justify-center group">
                                {responseScreenshot ? (
                                    <img src={responseScreenshot} alt="Response Proof" className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-600">
                                        <IconPhotoOff size={32} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">No Image Attached</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-4">
                        <Button
                            variant="metallic"
                            className="!rounded-2xl !py-3 !px-10 font-black tracking-[0.2em] text-[11px] uppercase shadow-nova"
                            onClick={() => setIsProofModalOpen(false)}
                        >
                            Close Preview
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Full Image Preview Modal */}
            <Modal
                isOpen={!!previewImageUrl}
                onClose={() => setPreviewImageUrl(null)}
                title="Image Preview"
                size="xl"
                isElevatedHeader
                isElevatedFooter
                footer={
                    <div className="flex justify-end items-center gap-3 w-full">
                        <div className="flex gap-3 items-center">
                            <Button
                                variant="recessed"
                                onClick={() => setPreviewImageUrl(null)}
                                className="uppercase tracking-widest text-[10px] font-black px-6 h-10 border-white/5 hover:bg-white/5"
                            >
                                Close Preview
                            </Button>

                            <Button
                                variant="metallic"
                                onClick={() => {
                                    if (previewImageUrl) {
                                        fetch(previewImageUrl)
                                            .then(response => response.blob())
                                            .then(blob => {
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.style.display = 'none';
                                                a.href = url;
                                                a.download = `Lead_Attachment_${new Date().getTime()}`;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                            })
                                            .catch(err => console.error('Error downloading image:', err));
                                    }
                                }}
                                className="uppercase tracking-widest text-[10px] font-black px-8 h-10 shadow-lg shadow-brand-primary/10"
                                leftIcon={<IconDownload size={14} />}
                            >
                                Download
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="flex flex-col items-center justify-center p-4">
                    {previewImageUrl && (
                        <img
                            src={previewImageUrl}
                            alt="Full Preview"
                            className="max-w-full max-h-[70vh] object-contain rounded-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                        />
                    )}
                </div>
            </Modal>

            {/* Client History Modal */}
            <Modal
                isOpen={isClientHistoryOpen}
                onClose={() => setIsClientHistoryOpen(false)}
                title={`History for ${lead.client_name}`}
                size="lg"
                isElevatedHeader
            >
                <div className="p-4 md:p-5 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
                    {isFetchingHistory ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <IconLoader2 className="animate-spin text-brand-primary" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Loading Client History...</p>
                        </div>
                    ) : clientHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <IconHistory className="text-gray-600" size={48} />
                            <p className="text-sm font-bold uppercase tracking-widest text-gray-500">No Past History Found</p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-white/10">
                            {clientHistory.map((comment, idx) => {
                                const isClient = comment.author_role === 'client';
                                const isStatusChange = comment.content?.startsWith("STATUS_CHANGED:");
                                const isNewLead = idx === 0 || comment.lead_id !== clientHistory[idx - 1].lead_id;

                                return (
                                    <React.Fragment key={comment.id}>
                                        {isNewLead && (
                                            <div className="relative pl-12 mb-6 mt-8 first:mt-0">
                                                <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-primary ring-4 ring-surface-bg" />
                                                <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl px-4 py-2 inline-flex items-center gap-3">
                                                    <IconBriefcase size={14} className="text-brand-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                                                        {comment.lead?.project_title || 'Untitled Inquiry'}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-2 border-l border-brand-primary/20">
                                                        {new Date(comment.lead?.created_at || comment.lead?.message_date || comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {isStatusChange ? (
                                            <div className="relative pl-12">
                                                <div className="absolute left-[15px] top-4 w-2.5 h-2.5 rounded-full bg-brand-primary ring-4 ring-surface-bg shadow-[0_0_10px_rgba(255,107,0,0.5)]" />
                                                <div className="bg-brand-primary/[0.05] border border-brand-primary/20 rounded-2xl p-4 inline-block">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                                        {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status Changed:</span>
                                                        <span className={getStatusCapsuleClasses(comment.content.split(":")[2])}>{comment.content.split(":")[2]}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative pl-12">
                                                <div className={`absolute left-[15px] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-surface-bg ${isClient ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isClient ? 'text-blue-400' : 'text-emerald-400'}`}>
                                                        {isClient ? 'Client' : 'Team'} • {comment.author_name}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                                        {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })},{' '}
                                                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[13px] font-medium leading-relaxed text-gray-300">
                                                    <div className="prose prose-invert prose-sm max-w-none">
                                                        <ReactMarkdown remarkPlugins={markdownPlugins} components={markdownComponents}>
                                                            {comment.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Initiate Project Wizard Modal */}
            <Modal
                isOpen={isInitiateModalOpen}
                onClose={() => setIsInitiateModalOpen(false)}
                title={
                    initiateStep === 'summary' ? 'Summarize Project Details' :
                        initiateStep === 'brief' ? 'Finalize Brief' :
                            initiateStep === 'price' ? 'Price' :
                                initiateStep === 'project_id' ? 'Project ID' :
                                    initiateStep === 'addons' ? 'Addons' :
                                        initiateStep === 'deadline' ? 'Deadline' :
                                            initiateStep === 'assignee' ? 'Assignee' :
                                                initiateStep === 'review' ? 'Review & Initiate' :
                                                    'Initiate Project'
                }
                size="lg"
                isElevatedHeader
                noBodyPadding
                footer={
                    <div className="flex justify-between items-center w-full">
                        {initiateStep === 'summary' ? (
                            <Button variant="recessed" onClick={() => setIsInitiateModalOpen(false)}>Cancel</Button>
                        ) : (
                            <Button variant="recessed" onClick={() => {
                                if (initiateStep === 'brief') handleNextStep('summary');
                                else if (initiateStep === 'price') handleNextStep('brief');
                                else if (initiateStep === 'project_id') handleNextStep('price');
                                else if (initiateStep === 'addons') handleNextStep('project_id');
                                else if (initiateStep === 'deadline') handleNextStep('addons');
                                else if (initiateStep === 'assignee') handleNextStep('deadline');
                                else if (initiateStep === 'review') handleNextStep('assignee');
                            }}>Back</Button>
                        )}
                        <div className="flex gap-3">
                            {initiateStep === 'summary' && !isAiLoading && (
                                <>
                                    <Button variant="secondary" onClick={() => {
                                        setSummaryAction('comments');
                                        handleNextStep('brief');
                                    }}>Use as Comments</Button>
                                    <Button variant="metallic" onClick={() => {
                                        setSummaryAction('brief');
                                        setProjectBrief(aiSummary);
                                        handleNextStep('brief');
                                    }}>Use as Brief</Button>
                                </>
                            )}
                            {initiateStep === 'brief' && <Button variant="metallic" onClick={() => handleNextStep('price')}>Next</Button>}
                            {initiateStep === 'price' && <Button variant="metallic" onClick={() => handleNextStep('project_id')}>Next</Button>}
                            {initiateStep === 'project_id' && <Button variant="metallic" onClick={() => handleNextStep('addons')}>Next</Button>}
                            {initiateStep === 'addons' && <Button variant="metallic" onClick={() => handleNextStep('deadline')}>Next</Button>}
                            {initiateStep === 'deadline' && <Button variant="metallic" onClick={() => handleNextStep('assignee')}>Next</Button>}
                            {initiateStep === 'assignee' && <Button variant="metallic" onClick={() => handleNextStep('review')}>Review</Button>}
                            {initiateStep === 'review' && (
                                <Button
                                    variant="metallic"
                                    onClick={handleInitiateProjectSubmit}
                                    isLoading={isSubmittingProject}
                                >
                                    Create Project
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                <div className="px-6 py-6 lg:px-10 lg:py-8 space-y-6 min-h-[400px]">
                    {initiateStep === 'summary' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            {isAiLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <IconLoader2 className="animate-spin text-brand-primary" size={32} />
                                    <p className="text-sm font-bold uppercase tracking-widest text-brand-primary animate-pulse">Generating AI Project Brief...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">AI Generated Summary</p>
                                    <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 rounded-xl bg-black/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] border border-white/5 text-[13px] font-medium leading-relaxed text-gray-300 custom-scrollbar">
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <ReactMarkdown remarkPlugins={markdownPlugins} components={markdownComponents}>
                                                {aiSummary ? parseCodesLogicMarkdown(aiSummary) : 'Waiting for summary...'}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Chat with AI to refine this brief... (e.g. 'Add 3D logo requirement')"
                                            className="flex-1"
                                            variant="recessed"
                                            value={refinePrompt}
                                            onChange={(e) => setRefinePrompt(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleRefineBrief();
                                                }
                                            }}
                                            disabled={isRefining}
                                        />
                                        <Button
                                            variant="secondary"
                                            className="px-6 shrink-0"
                                            onClick={handleRefineBrief}
                                            isLoading={isRefining}
                                            disabled={isRefining || !refinePrompt.trim()}
                                        >
                                            Send
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {initiateStep === 'brief' && (
                        <div className="flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Options Required Section */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                    Options Required
                                </label>
                                <Input
                                    variant="recessed"
                                    placeholder="How Many Options Required?"
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={optionsRequired || ''}
                                    onChange={(e) => setOptionsRequired(e.target.value)}
                                    className="w-full"
                                    size="lg"
                                />
                            </div>

                            {/* Project Title Section */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                    Project Title
                                </label>
                                <Input
                                    variant="recessed"
                                    placeholder="Enter Project Title"
                                    value={serviceType || ''}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    className="w-full"
                                    size="lg"
                                />
                            </div>

                            {/* Edit/Preview Toggle */}
                            <div className="inline-flex p-1 bg-black/60 border border-white/[0.05] rounded-2xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] w-fit mb-4">
                                <button
                                    onClick={() => setBriefMode('edit')}
                                    className={`px-10 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${briefMode === 'edit'
                                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_8px_20px_-4px_rgba(217,54,26,0.4)] scale-[1.02]'
                                        : 'text-gray-500 hover:text-white'
                                        }`}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setBriefMode('preview')}
                                    className={`px-10 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${briefMode === 'preview'
                                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_8px_20px_-4px_rgba(217,54,26,0.4)] scale-[1.02]'
                                        : 'text-gray-500 hover:text-white'
                                        }`}
                                >
                                    Preview
                                </button>
                            </div>

                            {briefMode === 'edit' ? (
                                <div className="space-y-4">
                                    <div className="bg-black/60 border border-white/[0.05] rounded-2xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col focus-within:bg-black/80 transition-all duration-300">
                                        <TextArea
                                            variant="flat"
                                            placeholder="Describe the project..."
                                            value={projectBrief}
                                            onChange={(e) => setProjectBrief(e.target.value)}
                                            className="!min-h-[150px] !bg-transparent !p-4 !text-sm"
                                        />

                                        <div className="px-4 py-2 border-t border-white/10 bg-surface-card relative shadow-[0_-4px_10px_rgba(0,0,0,0.4)] flex items-center justify-between">
                                            <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.03)_40%,rgba(255,255,255,0.01)_100%)] pointer-events-none" />

                                            <div className="flex items-center gap-4 relative z-10">
                                                <button
                                                    onClick={() => briefFileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all duration-300 cursor-pointer group active:scale-95"
                                                >
                                                    <IconPaperclip className="w-4 h-4 text-brand-primary group-hover:text-white transition-colors" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">Attach</span>
                                                </button>
                                                <input
                                                    type="file"
                                                    multiple
                                                    ref={briefFileInputRef}
                                                    onChange={handleBriefFileUpload}
                                                    className="hidden"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 rounded-2xl bg-black/40 border border-white/5 min-h-[150px] prose prose-invert prose-sm max-w-none">
                                    {projectBrief ? (
                                        <ReactMarkdown remarkPlugins={markdownPlugins} components={markdownComponents}>
                                            {projectBrief}
                                        </ReactMarkdown>
                                    ) : (
                                        <p className="text-gray-600 italic">No project description provided.</p>
                                    )}
                                </div>
                            )}

                            {projectBriefFiles.length > 0 && (
                                <div className="flex flex-wrap gap-4 mt-6">
                                    {projectBriefFiles.map((file, index) => {
                                        const isImage = file.type.startsWith('image/');
                                        const previewUrl = isImage ? URL.createObjectURL(file) : null;
                                        return (
                                            <div key={index} title={file.name} className="relative group w-24 flex flex-col items-center animate-in fade-in zoom-in duration-300 cursor-default">
                                                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all duration-300 shadow-lg mb-2 overflow-hidden relative">
                                                    {previewUrl ? (
                                                        <img
                                                            src={previewUrl}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <IconPaperclip className="w-8 h-8 text-gray-500 group-hover:text-brand-primary transition-colors duration-300" />
                                                    )}

                                                    {/* Hover Actions Overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-10">
                                                        {previewUrl && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewImageUrl(previewUrl);
                                                                }}
                                                                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-brand-primary hover:border-brand-primary transition-all duration-300 transform scale-90 group-hover:scale-100"
                                                                title="Preview"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setProjectBriefFiles(prev => prev.filter((_, i) => i !== index));
                                                            }}
                                                            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-brand-error hover:border-brand-error transition-all duration-300 transform scale-90 group-hover:scale-100"
                                                            title="Remove"
                                                        >
                                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center px-1">
                                                    {file.name}
                                                </span>
                                                <span className="text-[9px] font-medium text-gray-500 mt-0.5">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {summaryAction === 'comments' && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 mt-4">
                                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Additional Notes</p>
                                    <div className="text-xs text-gray-400 whitespace-pre-wrap">{aiSummary}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {initiateStep === 'price' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                    Project Price
                                </label>
                                <Input
                                    variant="recessed"
                                    placeholder="eg 20"
                                    type="number"
                                    value={dealValue}
                                    onChange={(e) => setDealValue(e.target.value)}
                                    leftIcon={<span className="text-gray-500 font-bold">$</span>}
                                    size="lg"
                                />
                            </div>

                            <div className="w-full h-px bg-white/5" />

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                    Assignee Payout (Optional)
                                </label>
                                <Input
                                    variant="recessed"
                                    placeholder="Leave empty for Tiered (Auto)"
                                    type="number"
                                    value={assigneePayout}
                                    onChange={(e) => setAssigneePayout(e.target.value)}
                                    leftIcon={<span className="text-gray-500 font-bold">$</span>}
                                    size="lg"
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-[#FF6B4B]/5 border border-[#FF6B4B]/20 flex gap-4 items-start shadow-[inset_0_2px_12px_rgba(255,107,75,0.03)]">
                                <div className="p-1.5 rounded-full bg-[#FF6B4B]/10 text-[#FF6B4B] shrink-0">
                                    <IconAlertCircle size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-[#FF6B4B] uppercase tracking-[0.2em] mb-2">Note:</h4>
                                    <p className="text-[10px] font-bold text-[#FF6B4B] uppercase tracking-[0.15em] leading-loose opacity-90">
                                        Leave assignee payout (optional) field, empty for normal logos. For special projects (animation/web), discuss price with management before adding.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {initiateStep === 'project_id' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col justify-center min-h-[250px] py-4">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                    Project ID Generation
                                </label>
                                <Radio
                                    label="Auto Generate"
                                    name="project-id-mode"
                                    variant="metallic"
                                    checked={projectIdMode === 'Auto Generate'}
                                    onChange={() => setProjectIdMode('Auto Generate')}
                                />
                                <Radio
                                    label="Add Manually"
                                    name="project-id-mode"
                                    variant="metallic"
                                    checked={projectIdMode === 'Add Manually'}
                                    onChange={() => setProjectIdMode('Add Manually')}
                                />
                            </div>
                            {projectIdMode === 'Add Manually' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                            Project ID
                                        </label>
                                        <Input
                                            variant="recessed"
                                            value={newProjectId}
                                            onChange={(e) => setNewProjectId(e.target.value)}
                                            placeholder="E.g. LOGO-1234"
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {initiateStep === 'addons' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                {['Social Media Kit', 'Stationery Designs', 'None', 'Other'].map((item) => (
                                    <React.Fragment key={item}>
                                        <Checkbox
                                            label={item}
                                            variant="metallic"
                                            checked={selectedAddons.includes(item)}
                                            onChange={() => toggleAddon(item)}
                                        />
                                        {item === 'Other' && selectedAddons.includes('Other') && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                <Input
                                                    variant="recessed"
                                                    value={addonsOther}
                                                    onChange={(e) => setAddonsOther(e.target.value)}
                                                    placeholder="Specify other addons..."
                                                    size="lg"
                                                />
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {initiateStep === 'deadline' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 py-2">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-px flex-1 bg-white/10"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">CLIENT DEADLINE</span>
                                <div className="h-px flex-1 bg-white/10"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <DatePicker
                                    variant="metallic"
                                    placeholder="Select Date"
                                    value={clientDueDate}
                                    onChange={(date) => setClientDueDate(date)}
                                    disabled={isInitiating}
                                />
                                <TimeSelect
                                    variant="metallic"
                                    placeholder="Select Time"
                                    value={clientDueTime}
                                    onChange={(time) => setClientDueTime(time)}
                                    disabled={isInitiating}
                                />
                            </div>

                            <div className="flex items-center gap-4 mt-8 mb-6">
                                <div className="h-px flex-1 bg-white/10"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">ASSIGNEE DEADLINE</span>
                                <div className="h-px flex-1 bg-white/10"></div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {[2, 6, 8, 12, 24].map(hours => (
                                        <Button
                                            key={hours}
                                            variant="recessed"
                                            size="sm"
                                            disabled={isInitiating}
                                            onClick={() => handleDeadlineShortcut(hours)}
                                            className={`!px-3 !py-1.5 !h-auto !text-[10px] font-bold uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${activeShortcut === hours
                                                ? '!text-white !border-white/20 !bg-white/10'
                                                : ''
                                                }`}
                                        >
                                            {hours} Hrs
                                        </Button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <DatePicker
                                        variant="metallic"
                                        placeholder="Select Date"
                                        value={internalDueDate}
                                        onChange={(date) => {
                                            setInternalDueDate(date);
                                            setActiveShortcut(null);
                                        }}
                                        disabled={isInitiating}
                                    />
                                    <TimeSelect
                                        variant="metallic"
                                        placeholder="Select Time"
                                        value={internalDueTime}
                                        onChange={(time) => {
                                            setInternalDueTime(time);
                                            setActiveShortcut(null);
                                        }}
                                        disabled={isInitiating}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {initiateStep === 'assignee' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">ASSIGNEE</p>
                                <Dropdown
                                    variant="metallic"
                                    placeholder="Select Assignee"
                                    showSearch={true}
                                    searchPlaceholder="Search..."
                                    options={teamMembers
                                        .sort((a, b) => {
                                            const statA = freelancerWorkload[a.name || a.email] || { assigned: 0 };
                                            const statB = freelancerWorkload[b.name || b.email] || { assigned: 0 };
                                            const remA = (a.daily_capacity || 5) - statA.assigned;
                                            const remB = (b.daily_capacity || 5) - statB.assigned;
                                            return remB - remA;
                                        })
                                        .map(m => {
                                            const name = m.name || m.email;
                                            const stat = freelancerWorkload[name] || { assigned: 0, inProgress: 0 };
                                            const capacity = m.daily_capacity || 5;
                                            const usage = stat.assigned / capacity;

                                            const descriptionClassName = usage >= 1.0
                                                ? 'bg-brand-error/20 border-brand-error/30 text-brand-error'
                                                : usage > 0.4
                                                    ? 'bg-brand-warning/20 border-brand-warning/30 text-brand-warning'
                                                    : 'bg-brand-success/20 border-brand-success/30 text-brand-success';

                                            return {
                                                label: name,
                                                value: m.id,
                                                description: `${stat.assigned} / ${capacity}`,
                                                descriptionClassName
                                            };
                                        })
                                    }
                                    value={selectedAssigneeId || ''}
                                    onChange={(id) => setSelectedAssigneeId(id)}
                                    disabled={isInitiating}
                                />
                            </div>
                        </div>
                    )}

                    {initiateStep === 'review' && (
                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-300 pb-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {/* Project Details */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Project Details</h4>
                                <div className="space-y-8">
                                    <Input
                                        variant="metallic"
                                        label="Project ID"
                                        value={projectIdMode === 'Add Manually' ? newProjectId : `Will be Auto-Generated (e.g. ${lead?.account || 'LD'} 123456)`}
                                        readOnly
                                    />
                                    <Input
                                        variant="metallic"
                                        label="Project Title"
                                        value={serviceType}
                                        readOnly
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            variant="metallic"
                                            label="Project Price"
                                            value={dealValue}
                                            leftIcon={<span className="text-gray-500 font-bold">$</span>}
                                            readOnly
                                        />
                                        <Input
                                            variant="metallic"
                                            label="Assignee Payout"
                                            value={assigneePayout || 'Tiered (Auto)'}
                                            leftIcon={assigneePayout ? <span className="text-gray-500 font-bold">$</span> : undefined}
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-surface-border/30 w-full" />

                            {/* Brief Details */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Brief Details</h4>
                                <div className="space-y-8">
                                    <Input
                                        variant="metallic"
                                        label="Options Required"
                                        value={optionsRequired}
                                        readOnly
                                    />
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Project Brief</label>
                                        <div className="p-6 bg-black/40 rounded-3xl border border-white/5 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)] max-h-[300px] overflow-y-auto custom-scrollbar">
                                            <ReactMarkdown components={markdownComponents} remarkPlugins={markdownPlugins}>
                                                {parseCodesLogicMarkdown(projectBrief)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-surface-border/30 w-full" />

                            {/* Deadlines */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Deadlines</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        variant="metallic"
                                        label="Client Deadline"
                                        value={`${clientDueDate ? clientDueDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}${clientDueTime ? ` at ${clientDueTime}` : ''}`}
                                        readOnly
                                    />
                                    <Input
                                        variant="metallic"
                                        label="Internal Deadline"
                                        value={`${internalDueDate ? internalDueDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}${internalDueTime ? ` at ${internalDueTime}` : ''}`}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-surface-border/30 w-full" />

                            {/* Assignee */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Assignee</h4>
                                <Input
                                    variant="metallic"
                                    label="Selected Assignee"
                                    value={teamMembers.find(m => m.id === selectedAssigneeId)?.name || teamMembers.find(m => m.id === selectedAssigneeId)?.email || 'None'}
                                    readOnly
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

// UI Subcomponents
const ScreenshotUpload = ({ label, url, onUpload, className }: { label: string, url: string, onUpload: (url: string) => void, className?: string }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await uploadFile(file, 'leads-proof');
            onUpload(result.url);
            addToast({ type: 'success', title: 'Uploaded', message: 'Screenshot uploaded successfully.' });
        } catch (err) {
            console.error('Upload error:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to upload screenshot.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`space-y-4 flex flex-col ${className}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">{label}</p>

            <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`
                    group relative w-full rounded-2xl border-2 border-dashed transition-all duration-500 overflow-hidden flex-1 min-h-[200px]
                    ${isUploading ? 'cursor-wait border-brand-primary/50 bg-brand-primary/[0.02]' : 'border-white/10 hover:border-brand-primary/40 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer'}
                `}
            >
                {/* Always show Placeholder in the main box */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-600 group-hover:text-brand-primary group-hover:border-brand-primary/30 group-hover:scale-110 transition-all duration-500 shadow-xl">
                        <IconCamera size={24} />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-[0.15em] transition-colors">Click to upload</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">{url ? 'Replace Screenshot' : 'Proof Screenshot'}</span>
                    </div>
                </div>

                {/* Loading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 z-10">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <IconLoader2 className="text-brand-primary animate-pulse" size={20} />
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] animate-pulse">Uploading...</span>
                    </div>
                )}

                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {/* Thumbnail Preview below the field */}
            {url && !isUploading && (
                <div className="animate-in slide-in-from-top-2 duration-500">
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4 group/thumb hover:border-brand-primary/30 transition-colors">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/40 shrink-0">
                            <img src={url} alt="Thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">Screenshot Attached</p>
                            <p className="text-[9px] font-bold text-brand-primary uppercase tracking-wider mt-0.5">File Uploaded Successfully</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onUpload(''); }}
                            className="p-2 rounded-xl bg-white/5 text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-all mr-1"
                            title="Remove Screenshot"
                        >
                            <IconTrash size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetadataSection: React.FC<{
    title: string;
    children: React.ReactNode;
    isCollapsed?: boolean;
    collapsedHeight?: string;
}> = ({ title, children, isCollapsed, collapsedHeight = "h-14" }) => (
    <div className="w-full flex justify-center">
        {isCollapsed ? (
            <div
                className={`w-[2px] ${collapsedHeight} bg-surface-border rounded-full transition-all duration-300`}
            />
        ) : (
            <div className="w-full min-w-[280px]">
                <ElevatedMetallicCard
                    title={title}
                    headerClassName="px-6 py-4"
                    bodyClassName="p-6 space-y-5"
                    className="hover:border-white/5 transition-all group"
                >
                    {children}
                </ElevatedMetallicCard>
            </div>
        )}
    </div>
);

const MetadataItem: React.FC<{
    label: React.ReactNode;
    value: React.ReactNode;
    isMono?: boolean;
    isAccent?: boolean;
    isSelect?: boolean;
    isRecessed?: boolean;
    isDate?: boolean;
    isTime?: boolean;
    leftIcon?: React.ReactNode;
    valueClassName?: string;
    onClick?: () => void;
}> = ({
    label,
    value,
    isMono,
    isAccent,
    isSelect,
    isRecessed,
    isDate,
    isTime,
    leftIcon,
    valueClassName,
    onClick,
}) => (
        <div
            className={`px-1 group/item ${onClick || isSelect ? "cursor-pointer" : ""}`}
            onClick={onClick}
        >
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-hover/item:text-brand-primary/70 transition-colors uppercase">
                {label}
            </p>
            <div
                className={`
              w-full flex items-center justify-between transition-all duration-300 relative overflow-hidden
              ${isSelect || isRecessed
                        ? "bg-black/25 border border-surface-border/40 rounded-xl px-4 py-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.02)]"
                        : "bg-transparent border-2 border-transparent px-0 py-1"
                    }
              ${isSelect ? "cursor-pointer hover:border-white/10 active:scale-[0.98]" : ""}
          `}
            >
                {/* Subtle Vertical Metallic Gradient for isSelect/isRecessed */}
                {(isSelect || isRecessed) && (
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01),transparent)] pointer-events-none" />
                )}

                <div
                    className={`
                  relative z-10 w-full flex items-center gap-2
                  ${isMono ? "font-mono" : "font-bold"} 
                  ${isAccent ? "text-brand-primary text-base" : "text-sm"}
                  ${isSelect ? "text-white" : valueClassName || "text-gray-300"}
              `}
                >
                    {isDate && (
                        <IconCalendar
                            size={16}
                            className={
                                isSelect || isRecessed ? "text-brand-primary" : "text-gray-500"
                            }
                        />
                    )}
                    {isTime && (
                        <IconClock
                            size={16}
                            className={
                                isSelect || isRecessed ? "text-brand-primary" : "text-gray-500"
                            }
                        />
                    )}
                    {leftIcon && <div className="text-gray-500">{leftIcon}</div>}
                    <div className="flex-1 overflow-hidden">{value}</div>
                </div>
                {isSelect && (
                    <svg
                        className="w-4 h-4 text-gray-600 group-hover/item:text-brand-primary transition-colors shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                )}
            </div>
        </div>
    );

