import React from 'react';

const GuideMarkCancelled: React.FC = () => {
    return (
        <div className="flex flex-col h-full items-start justify-start p-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-6">Mark Cancelled - Documentation</h1>
            <div className="w-full text-gray-400 space-y-4 text-lg leading-relaxed mix-blend-plus-lighter">
                <p>Documentation for marking a project as cancelled will be populated here.</p>
            </div>
        </div>
    );
};

export default GuideMarkCancelled;
