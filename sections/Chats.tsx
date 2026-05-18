
import React from 'react';
import { Card } from '../components/Surfaces';
import { Avatar } from '../components/Avatar';
import { Input } from '../components/Input';
import { IconSearch, IconPlus, IconMoreVertical } from '../components/Icons';

const Chats: React.FC = () => {
    const activeChats = [
        { name: 'Alex Rivier', message: 'The new UI looks amazing!', time: '2m', online: true },
        { name: 'Sarah Chen', message: 'Did you review the assets?', time: '15m', online: false },
        { name: 'Marcus Wright', message: 'Let\'s Sync tomorrow.', time: '1h', online: true },
        { name: 'Elena Kostic', message: 'I\'ll send the files shortly.', time: '3h', online: true },
        { name: 'James Doe', message: 'Waiting for approval.', time: '5h', online: false },
    ];

    return (
        <div className="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Team Chat</h1>
                    <p className="text-sm text-gray-500">Collaborate with your team members in real-time.</p>
                </div>
                <button className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-all">
                    <IconPlus />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[600px]">
                {/* Chat List */}
                <div className="space-y-4">
                    <Input placeholder="Search conversations..." leftIcon={<IconSearch className="w-4 h-4" />} />
                    <div className="space-y-1">
                        {activeChats.map((chat, i) => (
                            <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${i === 0 ? 'bg-brand-primary/10 border border-brand-primary/20' : 'hover:bg-white/[0.04]'}`}>
                                <Avatar size="md" status={chat.online ? 'online' : 'offline'} initials={chat.name.split(' ').map(n => n[0]).join('')} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-sm font-bold text-white truncate">{chat.name}</h4>
                                        <span className="text-[10px] text-gray-500 uppercase">{chat.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{chat.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <Card className="lg:col-span-2 flex flex-col p-0 overflow-hidden relative border-brand-primary/20 bg-brand-primary/[0.02]">
                    <div className="p-6 border-b border-surface-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar size="sm" status="online" initials="AR" />
                            <div>
                                <h4 className="text-sm font-bold text-white">Alex Rivier</h4>
                                <p className="text-[10px] text-brand-success font-bold uppercase tracking-widest">Online</p>
                            </div>
                        </div>
                        <button className="text-gray-500 hover:text-white transition-colors">
                            <IconMoreVertical />
                        </button>
                    </div>

                    <div className="flex-1 p-8 space-y-6">
                        <div className="flex justify-center">
                            <span className="px-3 py-1 bg-surface-overlay rounded-full text-[10px] text-gray-500 font-bold uppercase tracking-widest">Yesterday</span>
                        </div>

                        <div className="flex flex-col gap-2 max-w-[80%]">
                            <div className="p-4 bg-surface-overlay rounded-2xl rounded-tl-none border border-surface-border">
                                <p className="text-sm text-white/90 leading-relaxed">Hey, have you seen the new design system components I just added to the repository?</p>
                            </div>
                            <span className="text-[10px] text-gray-500 ml-1">10:42 PM</span>
                        </div>

                        <div className="flex flex-col gap-2 max-w-[80%] ml-auto items-end">
                            <div className="p-4 bg-brand-primary rounded-2xl rounded-tr-none text-white shadow-lg shadow-brand-primary/20">
                                <p className="text-sm leading-relaxed">Yes! The new UI looks amazing. I particularly love the glassmorphism effects on the cards.</p>
                            </div>
                            <span className="text-[10px] text-gray-500 mr-1">10:45 PM</span>
                        </div>
                    </div>

                    <div className="p-6 border-t border-surface-border">
                        <Input placeholder="Type a message..." rightIcon={<button className="text-brand-primary font-bold text-xs uppercase hover:underline">Send</button>} />
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Chats;
