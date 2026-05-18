import React from 'react';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export const markdownPlugins = [remarkGfm, remarkBreaks];

export const parseCodesLogicMarkdown = (text: string) => {
    if (!text) return '';
    // Replace literal bullets with markdown list items
    return text.replace(/^[ \t]*[•][ \t]*/gm, '- ');
};

export const markdownComponents = {
    p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0 text-[13px] leading-relaxed text-gray-300" {...props} />,
    strong: ({ node, ...props }: any) => <strong className="font-bold text-white tracking-wide" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-[13px] text-gray-300" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-[13px] text-gray-300" {...props} />,
    li: ({ node, ...props }: any) => <li className="leading-relaxed text-[13px]" {...props} />,
    a: ({ node, ...props }: any) => <a className="text-brand-primary hover:underline font-bold" target="_blank" rel="noopener noreferrer" {...props} />,
    h1: ({ node, ...props }: any) => <h1 className="text-base font-bold text-white mb-4 mt-6 first:mt-0" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-sm font-bold text-white mb-3 mt-5 first:mt-0" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-sm font-bold text-white mb-2 mt-4 first:mt-0" {...props} />,
};
