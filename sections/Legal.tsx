import React from 'react';
import Button from '../components/Button';

interface LegalProps {
    title: string;
    onBack: () => void;
}

export const LegalPage: React.FC<LegalProps> = ({ title, onBack }) => {
    return (
        <div className="min-h-screen bg-surface-bg p-8 flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-full max-w-4xl bg-surface-card bg-surface-overlay/20 border border-surface-border p-10 rounded-3xl shadow-2xl">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-surface-border">
                    <h1 className="text-3xl font-bold text-white">{title}</h1>
                    <Button variant="metallic" size="sm" onClick={onBack}>Back to Sign In</Button>
                </div>

                <div className="space-y-6 text-gray-400 leading-relaxed text-sm">
                    <p>This is a placeholder for the {title}. This page is currently blank as requested.</p>
                    <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-surface-border rounded-2xl bg-white/[0.02]">
                        <p className="italic">Content for {title} will be added here later.</p>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-surface-border text-center">
                    <p className="text-xs text-gray-500">© 2026 CodesLogic. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};
