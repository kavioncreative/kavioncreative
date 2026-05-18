
import React, { useState, useEffect } from 'react';
import { Card, Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Selection';
import { IconRefreshCw, IconPlus, IconCheckCircle, IconTrash, IconEdit, IconMoreVertical } from '../components/Icons';
import { Table } from '../components/Table';
import { KebabMenu } from '../components/KebabMenu';
import { supabase } from '../lib/supabase';

interface Webhook {
    id?: string;
    name: string;
    url: string;
    secret: string;
    icon: string;
    events: {
        projectCreated: boolean;
        statusChanged: boolean;
        commentAdded: boolean;
        fileUploaded: boolean;
    };
}

const Integrations: React.FC = () => {
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [showIconDropdown, setShowIconDropdown] = useState(false);
    const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
    const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
    const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [webhookData, setWebhookData] = useState({

        name: '',
        url: '',
        secret: '',
        icon: 'Default',
        events: {
            projectCreated: true,
            statusChanged: false,
            commentAdded: false,
            fileUploaded: false
        }
    });

    // Brand Icons Component for rendering SVGs
    const BrandIcon = ({ name, className = "w-6 h-6" }: { name: string, className?: string }) => {
        switch (name) {
            case 'Default': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>;
            case 'N8N': return (
                <div className={`${className} bg-[#EA4B71] rounded flex items-center justify-center`}>
                    <svg className="w-[70%] h-[70%] text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632" />
                    </svg>
                </div>
            );
            case 'Slack': return (
                <div className={`${className} bg-white rounded flex items-center justify-center`}>
                    <svg className="w-[70%] h-[70%]" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.7778 40.31C17.7778 36.5817 20.597 33.5802 24.0988 33.5802C27.6006 33.5802 30.4198 36.5817 30.4198 40.31V56.8752C30.4198 60.6034 27.6006 63.6049 24.0988 63.6049C20.597 63.6049 17.7778 60.6034 17.7778 56.8752V40.31Z" fill="#E01E5A" />
                        <path d="M40.3099 46.2222C36.5817 46.2222 33.5802 43.403 33.5802 39.9012C33.5802 36.3994 36.5817 33.5802 40.3099 33.5802H56.8753C60.6035 33.5802 63.605 36.3994 63.605 39.9012C63.605 43.403 60.6035 46.2222 56.8753 46.2222H40.3099Z" fill="#ECB22D" />
                        <path d="M33.5803 7.1247C33.5803 3.3965 36.3994 0.395062 39.9012 0.395062C43.4031 0.395062 46.2222 3.3965 46.2222 7.1247V23.69C46.2222 27.4183 43.4031 30.4197 39.9012 30.4197C36.3994 30.4197 33.5803 27.4183 33.5803 23.69V7.1247Z" fill="#2FB67C" />
                        <path d="M7.12471 30.4197C3.39652 30.4197 0.395076 27.6006 0.395076 24.0988C0.395076 20.5969 3.39652 17.7778 7.12471 17.7778H23.69C27.4183 17.7778 30.4197 20.5969 30.4197 24.0988C30.4197 27.6006 27.4183 30.4197 23.69 30.4197H7.12471Z" fill="#36C5F1" />
                        <g transform="matrix(0.790123 0 0 0.790123 -0.395047 -0.395061)">
                            <path d="M43 73C38.5817 73 35 76.5817 35 81C35 85.4183 38.5817 89 43 89C47.4183 89 51 85.4183 51 81C51 76.5817 47.4183 73 43 73H35V73Z" fill="#ECB22D" />
                            <path d="M73 39H65V31C65 26.5817 68.5817 23 73 23C77.4183 23 81 26.5817 81 31C81 35.4183 77.4183 39 73 39Z" fill="#2FB67C" />
                            <path d="M9 43H17V51C17 55.4183 13.4183 59 9 59C4.58172 59 1 55.4183 1 51C1 46.5817 4.58172 43 9 43Z" fill="#E01E5A" />
                            <path d="M39 9V17H31C26.5817 17 23 13.4183 23 9C23 4.58172 26.5817 1 31 1C35.4183 1 39 4.58172 39 9Z" fill="#36C5F1" />
                        </g>
                    </svg>
                </div>
            );
            case 'Trello': return (
                <div className={`${className} bg-[#0079BF] rounded flex items-center justify-center`}>
                    <svg className="w-[70%] h-[70%] text-white" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="5" y="4" width="5" height="14" rx="1" />
                        <rect x="14" y="4" width="5" height="9" rx="1" />
                    </svg>
                </div>
            );
            case 'WhatsApp': return (
                <div className={`${className} bg-[#25D366] rounded flex items-center justify-center`}>
                    <svg className="w-[70%] h-[70%] text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                </div>
            );
            case 'Telegram': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>;
            case 'GitHub': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.419-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>;
            case 'Discord': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" /></svg>;
            case 'Notion': return (
                <div className={`${className} bg-white rounded flex items-center justify-center`}>
                    <svg className="w-[70%] h-[70%] text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                    </svg>
                </div>
            );
            case 'Jira': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.53 2C11.53 2 2 11.66 2 11.66 2 11.66 2 16.63 2 17.06 2 19.36 4.31 21.6 6.84 21.6 9.39 21.6 11.53 19.67 11.53 16.7L11.53 2Z" /><path d="M11.53 6.9C11.53 6.9 11.53 21.6 11.53 21.6 11.53 21.6 16.48 21.6 16.92 21.6 19.26 21.6 21.57 19.25 21.57 16.7 21.57 14.16 19.58 12 16.53 12L11.53 6.9Z" /></svg>;
            case 'Linear': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 15.5l-4-4 1.41-1.41L10.5 14.67l6.59-6.59L18.5 9.5l-8 8z" /></svg>;
            case 'Zoom': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M13.67 11.77c.18-.34.3-.72.3-1.13A2.36 2.36 0 0 0 11.61 8.28c-.41 0-.79.12-1.13.3l-5.2-3a3.86 3.86 0 0 1 1.09-.59 4.36 4.36 0 0 1 5.24 1.77 4.36 4.36 0 0 1 1.77 5.24c-.16.4-.36.76-.59 1.09l-3.02-5.22zM8.28 11.61c0-.41.12-.79.3-1.13L3.36 5.26a4.36 4.36 0 0 0 1.77 5.24 4.36 4.36 0 0 0 5.24-1.77c.33-.24.7-.44 1.09-.59l-3 5.2c-.12-.41-.18-.84-.18-1.28zm8.11 3.59c-.41 0-.79-.12-1.13-.3l-5.2 3a4.25 4.25 0 0 0 1.09.59 4.36 4.36 0 0 0 5.24-1.77 4.36 4.36 0 0 0-1.77-5.24 3.73 3.73 0 0 0-.59-1.09l3.02 5.22c-.17.2-.42.39-.66.59zM5.27 16.39a3.86 3.86 0 0 1-1.09.59 4.36 4.36 0 0 1-1.77-5.24 4.36 4.36 0 0 1 5.24 1.77c.16-.4.36-.76.59-1.09l3.02 5.22c-.18.34-.3.72-.3 1.13 0 .41.12.79.3 1.13l-5.2-3zM16.39 12.22c-.18.34-.3.72-.3 1.13 0 .41.12.79.3 1.13l5.22 3a3.54 3.54 0 0 0-.59 1.09 4.36 4.36 0 0 0-5.24-1.77 4.36 4.36 0 0 0-1.77 5.24c-.33-.24-.7-.44-1.09-.59l3-5.2z" /></svg>;
            case 'Google': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" /></svg>;
            case 'GitLab': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .41.26l3.25 10h7.04l3.25-10a.43.43 0 0 1 .41-.26.42.42 0 0 1 .11.15l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.94z" /></svg>;
            case 'Zapier': return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M4 12V2h16v10H4zm9 10H4v-8h16v8h-7z" /></svg>;
            default: return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>;
        }
    };

    const availableIcons = [
        { label: 'Default', icon: 'Default' }, // Store ID instead of Emoji
        { label: 'N8N', icon: 'N8N' },
        { label: 'Slack', icon: 'Slack' },
        { label: 'Trello', icon: 'Trello' },
        { label: 'WhatsApp', icon: 'WhatsApp' },
        { label: 'Telegram', icon: 'Telegram' },
        { label: 'GitHub', icon: 'GitHub' },
        { label: 'Discord', icon: 'Discord' },
        { label: 'Notion', icon: 'Notion' },
        { label: 'Jira', icon: 'Jira' },
        { label: 'Linear', icon: 'Linear' },
        { label: 'Zoom', icon: 'Zoom' },
        { label: 'Google', icon: 'Google' },
        { label: 'GitLab', icon: 'GitLab' },
        { label: 'Zapier', icon: 'Zapier' }
    ];



    useEffect(() => {
        fetchWebhooks(true);
    }, []);


    const fetchWebhooks = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        const { data, error } = await supabase
            .from('webhooks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching webhooks:', error);
        } else {
            setWebhooks(data || []);
        }
        if (isInitial) setIsLoading(false);
    };


    const handleEventChange = (key: keyof typeof webhookData.events) => {
        setWebhookData(prev => ({
            ...prev,
            events: {
                ...prev.events,
                [key]: !prev.events[key]
            }
        }));
    };

    const resetWebhookForm = () => {
        setWebhookData({
            name: '',
            url: '',
            secret: '',
            icon: 'Default',
            events: {
                projectCreated: true,
                statusChanged: false,
                commentAdded: false,
                fileUploaded: false
            }
        });
        setEditingWebhookId(null);
    };

    const handleSaveWebhook = async () => {
        setIsCreatingWebhook(true);

        const payload = {
            name: webhookData.name,
            url: webhookData.url,
            secret: webhookData.secret,
            icon: webhookData.icon,
            events: webhookData.events
        };

        const result = editingWebhookId
            ? await supabase.from('webhooks').update(payload).eq('id', editingWebhookId).select()
            : await supabase.from('webhooks').insert([payload]).select();

        const { data, error } = result;

        if (error) {
            console.error('Error saving webhook:', error);
        } else {
            if (data) {
                if (editingWebhookId) {
                    setWebhooks(prev => prev.map(w => w.id === editingWebhookId ? data[0] : w));
                } else {
                    setWebhooks(prev => [data[0], ...prev]);
                }
            }
            resetWebhookForm();
            setIsWebhookModalOpen(false);
        }

        setIsCreatingWebhook(false);
    };

    const handleEditClick = (webhook: any) => {
        setWebhookData({
            name: webhook.name,
            url: webhook.url,
            secret: webhook.secret || '',
            icon: webhook.icon,
            events: webhook.events
        });
        setEditingWebhookId(webhook.id);
        setIsWebhookModalOpen(true);
    };

    const handleDeleteWebhook = async (id: string) => {
        setDeletingWebhookId(id);
        const { error } = await supabase
            .from('webhooks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting webhook:', error);
        } else {
            setWebhooks(prev => prev.filter(w => w.id !== id));
        }
        setDeletingWebhookId(null);
    };

    const selectedIconObj = availableIcons.find(i => i.icon === webhookData.icon) || availableIcons[0];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <div className="flex justify-end items-center">
                <Button
                    variant="metallic"
                    size="md"
                    leftIcon={<IconPlus className="w-5 h-5" />}
                    onClick={() => setIsWebhookModalOpen(true)}
                >
                    Add Webhook
                </Button>
            </div>

            {/* Webhooks Section */}
            {webhooks.length > 0 && (
                <div className="space-y-4">
                    <Table<Webhook>
                        data={webhooks}
                        isLoading={isLoading}
                        isMetallicHeader

                        columns={[
                            {
                                header: 'Webhook Name',
                                key: 'name',
                                render: (webhook) => (
                                    <div className="flex items-center gap-3">
                                        <BrandIcon name={webhook.icon} className="w-8 h-8 font-bold" />
                                        <span className="font-bold text-white">{webhook.name}</span>
                                    </div>
                                )
                            },
                            {
                                header: 'Triggers',
                                key: 'events',
                                render: (webhook) => (
                                    <div className="flex flex-wrap gap-1">
                                        {webhook.events.projectCreated && (
                                            <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-[10px] font-medium border border-brand-primary/20">
                                                Project Created
                                            </span>
                                        )}
                                        {webhook.events.statusChanged && (
                                            <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-[10px] font-medium border border-brand-primary/20">
                                                Status Changed
                                            </span>
                                        )}
                                        {webhook.events.commentAdded && (
                                            <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-[10px] font-medium border border-brand-primary/20">
                                                Comment Added
                                            </span>
                                        )}
                                        {webhook.events.fileUploaded && (
                                            <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-[10px] font-medium border border-brand-primary/20">
                                                File Uploaded
                                            </span>
                                        )}
                                    </div>
                                )
                            },
                            {
                                header: '',
                                key: 'actions',
                                className: 'w-[50px] text-right px-0',
                                render: (webhook) => (
                                    <div className="flex justify-end pr-2">
                                        <KebabMenu
                                            options={[
                                                {
                                                    label: 'Edit',
                                                    icon: <IconEdit className="w-4 h-4" />,
                                                    onClick: () => handleEditClick(webhook)
                                                },
                                                {
                                                    label: 'Delete',
                                                    icon: <IconTrash className="w-4 h-4" />,
                                                    variant: 'danger',
                                                    onClick: () => webhook.id && handleDeleteWebhook(webhook.id),
                                                    disabled: !!deletingWebhookId
                                                }
                                            ]}
                                        />
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            )}

            {/* Add Webhook Modal */}
            <Modal
                isOpen={isWebhookModalOpen}
                onClose={() => {
                    setIsWebhookModalOpen(false);
                    resetWebhookForm();
                }}
                title={editingWebhookId ? "Edit Webhook" : "Add New Webhook"}
                size="md"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={() => {
                                setIsWebhookModalOpen(false);
                                resetWebhookForm();
                            }}
                            disabled={isCreatingWebhook}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handleSaveWebhook}
                            isLoading={isCreatingWebhook}
                        >
                            {editingWebhookId ? "Save Changes" : "Create Webhook"}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="Webhook Name"
                            placeholder="e.g. Production Deployment Hook"
                            value={webhookData.name}
                            onChange={(e) => setWebhookData({ ...webhookData, name: e.target.value })}
                            variant="metallic"
                        />

                        {/* Integration Platform Dropdown */}
                        <div className="flex flex-col gap-2 w-full relative">
                            <label className="text-sm font-medium text-gray-400 ml-1">Platform</label>
                            <button
                                type="button"
                                onClick={() => setShowIconDropdown(!showIconDropdown)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-black/40 border border-white/[0.05] rounded-xl text-white font-bold transition-all hover:bg-black/60 focus:border-white/20 outline-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
                            >
                                <div className="flex items-center gap-3">
                                    <BrandIcon name={selectedIconObj.icon} className="w-5 h-5 text-gray-400" />
                                    <span>{selectedIconObj.label}</span>
                                </div>
                                <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showIconDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Metallic Depth Overlay for Button */}
                            <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden top-7">
                                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent" />
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-40" />
                            </div>

                            {/* Dropdown Menu */}
                            {showIconDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowIconDropdown(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-surface-card border border-surface-border rounded-xl shadow-2xl z-20 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
                                        {availableIcons.map((item) => (
                                            <button
                                                key={item.label}
                                                onClick={() => {
                                                    setWebhookData({ ...webhookData, icon: item.icon });
                                                    setShowIconDropdown(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${webhookData.icon === item.icon ? 'bg-white/10 text-white' : 'text-gray-400'}`}
                                            >
                                                <BrandIcon name={item.icon} className={`w-5 h-5 ${webhookData.icon === item.icon ? 'text-brand-primary' : 'text-gray-500'}`} />
                                                <span className="font-medium text-sm">{item.label}</span>
                                                {webhookData.icon === item.icon && (
                                                    <IconCheckCircle className="w-4 h-4 text-brand-primary ml-auto" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <Input
                            label="Endpoint URL"
                            placeholder="https://api.example.com/webhooks/..."
                            value={webhookData.url}
                            onChange={(e) => setWebhookData({ ...webhookData, url: e.target.value })}
                            variant="metallic"
                        />
                        <Input
                            label="Secret Key (Optional)"
                            placeholder="whsec_..."
                            type="password"
                            value={webhookData.secret}
                            onChange={(e) => setWebhookData({ ...webhookData, secret: e.target.value })}
                            variant="metallic"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Trigger Events</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Checkbox
                                label="Project Created"
                                checked={webhookData.events.projectCreated}
                                onChange={() => handleEventChange('projectCreated')}
                                variant="metallic"
                            />
                            <Checkbox
                                label="Status Changed"
                                checked={webhookData.events.statusChanged}
                                onChange={() => handleEventChange('statusChanged')}
                                variant="metallic"
                            />
                            <Checkbox
                                label="Comment Added"
                                checked={webhookData.events.commentAdded}
                                onChange={() => handleEventChange('commentAdded')}
                                variant="metallic"
                            />
                            <Checkbox
                                label="File Uploaded"
                                checked={webhookData.events.fileUploaded}
                                onChange={() => handleEventChange('fileUploaded')}
                                variant="metallic"
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Integrations;
