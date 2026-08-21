import React, { useState } from 'react';
import { IconCopy, IconCheck } from '../components/Icons';

const GuideAddProject: React.FC = () => {
    const [copied1, setCopied1] = useState(false);
    const [copied2, setCopied2] = useState(false);

    const briefOnlyPrompt = `You will be provided with project details for a logo design. Your task is to ONLY organize and format the information into a clean, professional brief.

STRICT RULES:
- DO NOT change, rephrase, summarize, or interpret any wording from the client’s brief or comments.
- DO NOT add explanations, suggestions, or extra content.
- DO NOT modify tone, intent, or wording in any way.
- ONLY improve formatting, structure, and readability.
- Keep ALL original text EXACTLY as provided.
- If there is any content related to portfolio permissions, DO NOT include it in the output.

FORMATTING GUIDELINES:
- Use clear section headings in **bold**.
- Place the client’s exact text under each relevant heading.
- Do NOT rewrite sentences — only organize them properly.
- If the following fields are present, use them EXACTLY as headings:
  - What is your business/brand name?
  - Do you have a tagline or slogan?
  - Do you have any colour preferences?
  - Tell me about your business, products/services, and what makes your brand unique?
  - Who is your target audience or ideal customer? Example: Small business owners, young professionals, fitness enthusiasts, etc
  - What message or feeling should your logo communicate? Example: Trust, luxury, creativity, simplicity, innovation, professionalism, or reliability.
  - Do you have any specific ideas, symbols, or concepts you want included in the logo?(Optional)
  - What style do you prefer for your logo? Example: Minimalist, Vintage, Abstract
  - Are there any logos that you like and would like to attach? If Yes, Please attach.(Optional)
- If some fields are missing, organize the content using standard logo design brief structure WITHOUT modifying wording.

OUTPUT RULES:
- Return the final result ONLY inside a plain Markdown code block.
- Do NOT include any explanation or extra text outside the code block.

Now format the following brief:

REPLACE THIS TEXT WITH BRIEF`;

    const briefAndCommentsPrompt = `You will be provided with project details and additional comments for a logo design. Your task is to rewrite and organize the information into a clear, professional brief.

STRICT RULES:
- Preserve the original meaning and intent at all times.
- You may improve sentence clarity slightly, but DO NOT change context, requirements, or key details.
- DO NOT add assumptions, extra ideas, or designer suggestions.
- Use only the information provided in the brief and additional comments.
- If there is any content related to portfolio permissions, DO NOT include it in the output.

FORMATTING GUIDELINES:
- Use clear section headings in **bold**.
- Keep the content clean, structured, and easy to scan.
- Slightly refine wording ONLY where necessary for clarity and readability.
- If the following fields are present, use them EXACTLY as headings:
  - Industry (If you’re ordering for a business, what’s your industry?)
  - Logo Title
  - Slogan
  - Preferred Colors
  - Logo Brief
  - Reference Logos / Images
  - Target Audience
- If some fields are missing, organize the content using standard logo design brief structure.

ADDITIONAL COMMENTS HANDLING:
- Carefully review and incorporate all relevant details from the Additional Comments section into appropriate sections of the brief.
- Do NOT ignore or duplicate information unnecessarily.
- Merge comments naturally into the correct sections without changing their meaning.

OUTPUT RULES:
- Return the final result ONLY inside a plain Markdown code block.
- Do NOT include any explanation or extra text outside the code block.

Now process the following:

FULL BRIEF:
REPLACE THIS TEXT WITH BRIEF

ADDITIONAL COMMENTS:
REPLACE THIS TEXT WITH ADDITIONAL COMMENTS`;

    const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full items-start justify-start p-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-6">Add Project - Documentation</h1>

            {/* YouTube Video Player - Fixed Visibility */}
            <div className="w-full mb-10 overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#111] z-10 relative" style={{ minHeight: '400px' }}>
                <div className="w-full relative pt-[56.25%]"> {/* Standard 16:9 Aspect Ratio */}
                    <iframe
                        className="absolute top-0 left-0 w-full h-full block opacity-100"
                        src="https://www.youtube.com/embed/M7lc1UVf-VE?rel=0&modestbranding=1"
                        title="Project Documentation Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                    ></iframe>
                </div>
            </div>

            <div className="w-full text-gray-400 space-y-4 text-lg leading-relaxed mix-blend-plus-lighter pb-12">
                <p>
                    Projects are the core entity in the ecosystem. To start a new project, navigate to the Projects tab and click the "New Project" button located at the top right corner.
                </p>

                {/* Section 1: Brief Only */}
                <h2 className="text-2xl font-bold text-white mt-8 mb-4">Prompt - Incase Of Brief Only</h2>
                <div className="relative group mb-12">
                    <div className="absolute bottom-0 right-0 p-3 z-10">
                        <button
                            onClick={() => handleCopy(briefOnlyPrompt, setCopied1)}
                            className={`p-2 rounded-xl transition-all duration-300 ${copied1
                                ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                            title="Copy to clipboard"
                        >
                            {copied1 ? <IconCheck size={18} /> : <IconCopy size={18} />}
                        </button>
                    </div>
                    <pre className="bg-black/40 border border-white/[0.02] rounded-2xl p-6 text-sm text-gray-400 whitespace-pre-wrap break-words shadow-[inset_0_4px_16px_rgba(0,0,0,0.7),0_1px_rgba(255,255,255,0.02)] font-mono relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />
                        <code>{briefOnlyPrompt}</code>
                    </pre>
                </div>

                {/* Section 2: Industry Details */}
                <h2 className="text-2xl font-bold text-white mt-8 mb-4">Prompt - Incase Of Brief And Additional Comments</h2>
                <div className="relative group mb-16">
                    <div className="absolute bottom-0 right-0 p-3 z-10">
                        <button
                            onClick={() => handleCopy(briefAndCommentsPrompt, setCopied2)}
                            className={`p-2 rounded-xl transition-all duration-300 ${copied2
                                ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                            title="Copy to clipboard"
                        >
                            {copied2 ? <IconCheck size={18} /> : <IconCopy size={18} />}
                        </button>
                    </div>
                    <pre className="bg-black/40 border border-white/[0.02] rounded-2xl p-6 text-sm text-gray-400 whitespace-pre-wrap break-words shadow-[inset_0_4px_16px_rgba(0,0,0,0.7),0_1px_rgba(255,255,255,0.02)] font-mono relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />
                        <code>{briefAndCommentsPrompt}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default GuideAddProject;
