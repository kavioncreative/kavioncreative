import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { markdownComponents, markdownPlugins, parseCodesLogicMarkdown } from './ProjectDetails';
import { Copy, AlertCircle, Check } from 'lucide-react';

export const DocViewer: React.FC = () => {
    const [doc, setDoc] = useState<any>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        // Path is like /d/my-custom-doc
        const path = window.location.pathname.replace('/d/', '');
        const docs = JSON.parse(localStorage.getItem('CodesLogic_CustomDocs') || '[]');
        const found = docs.find((d: any) => d.slug === path);
        if (found) {
            setDoc(found);
            document.title = found.title + ' | Documentation';
        }
    }, []);

    const handleCopy = () => {
        if (!doc) return;
        navigator.clipboard.writeText(doc.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (!doc) {
        return (
            <div className="bg-surface-bg min-h-screen text-white flex flex-col gap-3 items-center justify-center">
                <AlertCircle className="w-10 h-10 text-brand-error/50" />
                <p className="text-gray-500 font-medium">Document not found.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface-bg min-h-screen text-white p-4 sm:p-8 overflow-y-auto flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full">
                <div className="bg-surface-card border border-surface-border rounded-[1.3rem] p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-4">
                        <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">{doc.title}</h1>
                        <button 
                            onClick={handleCopy}
                            className={`flex flex-shrink-0 items-center justify-center p-2.5 rounded-xl transition-all border shadow-sm active:scale-95 ${
                                isCopied 
                                ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' 
                                : 'bg-black/40 hover:bg-white/10 text-gray-400 hover:text-white border-white/5'
                            }`}
                            title="Copy Document Text"
                        >
                            {isCopied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    
                    <div className="w-full bg-black/60 border border-white/[0.05] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] rounded-xl px-6 py-6 prose prose-invert prose-brand max-w-none text-base leading-relaxed text-gray-300">
                        <ReactMarkdown components={markdownComponents} remarkPlugins={markdownPlugins}>
                            {parseCodesLogicMarkdown(doc.content)}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};
