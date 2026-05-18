
import React from 'react';
import { Card } from '../components/Surfaces';
import Button from '../components/Button';
import { IconFilter, IconPlus, IconMoreVertical } from '../components/Icons';

const Channels: React.FC = () => {
    const channels = [
        { name: 'general-discussion', description: 'Main channel for team communication', members: 42, activity: 'High' },
        { name: 'product-development', description: 'Technical design and engineering', members: 18, activity: 'Medium' },
        { name: 'announcements', description: 'Important project updates and news', members: 124, activity: 'Low' },
        { name: 'design-feedback', description: 'Review and approve new UI assets', members: 12, activity: 'High' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Broadcast Channels</h1>
                    <p className="text-sm text-gray-500">Manage your communication hubs and member permissions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" leftIcon={<IconFilter className="w-4 h-4" />}>Manage Tags</Button>
                    <Button variant="metallic" size="sm" leftIcon={<IconPlus className="w-4 h-4" />}>Create Channel</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {channels.map((channel, i) => (
                    <Card key={i} className="group hover:border-brand-primary/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-surface-overlay flex items-center justify-center text-xl font-bold text-brand-primary border border-surface-border group-hover:bg-brand-primary/10 transition-colors">
                                #
                            </div>
                            <button className="text-gray-500 hover:text-white transition-colors">
                                <IconMoreVertical />
                            </button>
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">#{channel.name}</h4>
                        <p className="text-sm text-gray-400 mb-6">{channel.description}</p>

                        <div className="flex items-center justify-between pt-6 border-t border-surface-border">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(user => (
                                        <div key={user} className="w-6 h-6 rounded-full border-2 border-surface-card bg-surface-overlay overflow-hidden">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`} alt="Avatar" />
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xs text-gray-500 font-medium">+{channel.members - 3} members</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${channel.activity === 'High' ? 'bg-brand-success/10 text-brand-success' :
                                channel.activity === 'Medium' ? 'bg-brand-warning/10 text-brand-warning' : 'bg-white/5 text-gray-500'
                                }`}>
                                {channel.activity} Activity
                            </span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Channels;
