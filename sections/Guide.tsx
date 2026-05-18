import React, { useState } from 'react';
import { Card, Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { 
    IconPlay, 
    IconActivity, 
    IconLayers, 
    IconDollar, 
    IconCheckCircle, 
    IconChevronRight,
    IconBrush,
    IconBriefcase,
    IconSearch,
    IconSend,
    IconClock,
    IconPlus,
    IconTrash,
    IconCloudUpload,
    IconX
} from '../components/Icons';

import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';

import { GridPatternCard, GridPatternCardBody } from '../components/ui/card-with-grid-ellipsis-pattern';

const Guide: React.FC = () => {
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [portfolioLinks, setPortfolioLinks] = useState<string[]>(['']);
    const [isUploading, setIsUploading] = useState(false);
    const [cvFiles, setCvFiles] = useState<File[]>([]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        whatsapp: '',
        email: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

    const handleAddLink = () => setPortfolioLinks([...portfolioLinks, '']);
    const handleRemoveLink = (index: number) => {
        const newLinks = portfolioLinks.filter((_, i) => i !== index);
        setPortfolioLinks(newLinks);
    };

    const handleLinkChange = (index: number, value: string) => {
        const newLinks = [...portfolioLinks];
        newLinks[index] = value;
        setPortfolioLinks(newLinks);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        // Reset the input value so the same file fails can be selected again if needed
        e.target.value = '';

        setCvFiles(prev => [...prev, ...selectedFiles]);
    };

    const removeFile = (index: number) => {
        setCvFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (cvFiles.length === 0) {
            addToast({ type: 'info', title: 'CV Required', message: 'Please upload your CV to continue.' });
            return;
        }

        setIsSubmitting(true);
        console.log('🚀 Starting application submission...', {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            cvCount: cvFiles.length,
            portfolioCount: portfolioLinks.filter(l => l.trim() !== '').length
        });

        try {
            // 1. Upload CV Files
            const uploadedUrls: string[] = [];
            for (const file of cvFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `cvs/${fileName}`;

                console.log(`📤 Uploading CV: ${file.name} to ${filePath}...`);
                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('❌ CV Upload failed:', uploadError);
                    throw new Error(`CV Upload failed: ${uploadError.message}`);
                }

                console.log('✅ CV uploaded successfully:', uploadData);
                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);
                
                uploadedUrls.push(publicUrl);
            }

            // 2. Insert into applicants table
            console.log('📝 Inserting record into applicants table...');
            const { error: insertError } = await supabase
                .from('applicants')
                .insert([{
                    first_name: formData.firstName.trim(),
                    last_name: formData.lastName.trim(),
                    whatsapp: formData.whatsapp.trim(),
                    email: formData.email.trim().toLowerCase(),
                    cv_file_url: uploadedUrls[0], // Taking the first one as primary
                    portfolio_links: portfolioLinks.filter(l => l.trim() !== ''),
                    position: 'Designer',
                    status: 'Pending'
                }]);

            if (insertError) {
                console.error('❌ Table insertion failed:', insertError);
                throw new Error(`Database record failed: ${insertError.message}`);
            }

            console.log('🎉 Application submitted successfully!');
            addToast({ type: 'success', title: 'Application Sent', message: "We've received your application. We'll get back to you soon!" });
            setIsApplyModalOpen(false);
            
            // Reset form
            setFormData({ firstName: '', lastName: '', whatsapp: '', email: '' });
            setCvFiles([]);
            setPortfolioLinks(['']);

        } catch (error: any) {
            console.error('🛑 Submission sequence error:', error);
            addToast({ type: 'error', title: 'Submission Failed', message: error.message || 'An error occurred while sending your application.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-bg overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="max-w-5xl mx-auto w-full p-6 lg:p-12 space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Hero Header */}
                <GridPatternCard className="rounded-[3rem] border border-white/5 bg-black/60 shadow-2xl p-12 py-24 text-center">
                    <GridPatternCardBody>
                        <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight uppercase">
                            Designer <span className="text-brand-primary">Onboarding</span>
                        </h1>
                        <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
                            Welcome to our creative ecosystem. Learn how we work, how you get paid, and join our elite team of designers.
                        </p>
                    </GridPatternCardBody>
                </GridPatternCard>

                {/* 1. Video Introduction */}
                <section id="video-intro" className="space-y-6">
                    <div className="flex items-center gap-4 my-20">
                        <div className="h-px flex-1 bg-white/5" />
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/5 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Video Introduction</h2>
                        </div>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <Card className="overflow-hidden p-0 border-white/10 shadow-2xl bg-black">
                        <div className="aspect-video w-full">
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/M7lc1UVf-VE?rel=0&modestbranding=1"
                                title="Designer Onboarding Video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        </div>
                    </Card>
                </section>

                {/* 2. Workflow Journey */}
                <section id="workflow-journey" className="space-y-12">
                    <div className="flex items-center gap-4 my-20">
                        <div className="h-px flex-1 bg-white/5" />
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/5 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Workflow Journey</h2>
                        </div>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div className="relative max-w-4xl mx-auto">
                        <div className="space-y-12">
                            {[
                                { 
                                    title: 'Project Assignment', 
                                    side: 'left',
                                    description: 'When a project is added to the platform, it is assigned to a designer by a project manager.'
                                },
                                { 
                                    title: 'Design Creation', 
                                    side: 'right',
                                    description: 'When a project is assigned to a designer, the designer creates the design and submits it for initial QA.'
                                },
                                { 
                                    title: 'Internal QA', 
                                    side: 'left',
                                    description: 'The QA manager reviews the submitted design and requests revisions if any changes are required. If no revisions are needed, the project proceeds to submission.'
                                },
                                { 
                                    title: 'Submission Process', 
                                    side: 'right',
                                    description: 'The designer uses the assets provided in the platform’s Assets section to prepare the presentation files and submits the required presentation along with the editable source file, then marks the project status as Done.'
                                },
                                { 
                                    title: 'Client Review', 
                                    side: 'left',
                                    description: 'The submitted design is shared with the client for review. The client may approve the design or request revisions, which are then communicated back to the designer for updates.'
                                },
                                { 
                                    title: 'Finalization', 
                                    side: 'right',
                                    description: 'Once the client approves the design, the final files are delivered and the project is marked as completed. The project then moves to the payment clearance stage according to the platform’s payment process.'
                                },
                            ].map((step, i) => {
                                const pinColors = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500'];
                                const pinColor = pinColors[i % pinColors.length];

                                return (
                                    <div key={i} className={`relative flex flex-col md:flex-row items-center ${step.side === 'right' ? 'md:flex-row-reverse' : ''}`}>
                                        <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full z-0 opacity-20">
                                            {/* Desktop Spine: Continuous line from center of first step to center of last */}
                                            <div className="hidden md:block w-full h-full">
                                                {i > 0 && (
                                                    <div 
                                                        className="absolute -top-12 h-[calc(50%+3rem)] w-full"
                                                        style={{ backgroundImage: 'linear-gradient(to bottom, white 50%, transparent 50%)', backgroundSize: '100% 6px' }}
                                                    />
                                                )}
                                                {i < 5 && (
                                                    <div 
                                                        className="absolute top-1/2 h-1/2 w-full"
                                                        style={{ backgroundImage: 'linear-gradient(to bottom, white 50%, transparent 50%)', backgroundSize: '100% 6px' }}
                                                    />
                                                )}
                                            </div>

                                            {/* Mobile Connector: Simple bridge between cards, hidden behind/inside card frames */}
                                            <div className="md:hidden w-full h-full">
                                                {i > 0 && (
                                                    <div 
                                                        className="absolute -top-12 h-12 w-full"
                                                        style={{ backgroundImage: 'linear-gradient(to bottom, white 50%, transparent 50%)', backgroundSize: '100% 6px' }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Central Step Indicator - Hidden on Mobile */}
                                        <div className="hidden md:flex md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-10 h-10 rounded-full bg-black border border-white/10 items-center justify-center z-10 shadow-2xl">
                                            <div className="text-sm font-black text-white">{i + 1}</div>
                                        </div>

                                        {/* Workflow Content Card */}
                                        <div className={`w-full md:w-1/2 px-4 md:px-12 ${step.side === 'left' ? 'md:pr-12' : 'md:pl-12'}`}>
                                            <div className="relative group p-3 rounded-[18px] border border-white/[0.06] bg-white/[0.02] transition-all group-hover:border-white/10">
                                                {/* Inner Metallic Panel */}
                                                <div className="bg-[#1a1a1a] rounded-2xl p-8 pt-12 pb-10 overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] border border-white/5 transition-all duration-500 relative">
                                                    {/* Unified Surface Lighting */}
                                                    
                                                    {/* Surface Lighting Glow */}
                                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
                                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />

                                                    <div className="relative z-10 text-center">
                                                        <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-4">{step.title}</h3>
                                                        <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                                                            {step.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Horizontal Connector Line (Desktop Only) - Techy Dash Link */}
                                                <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-12 h-[2px] opacity-20 z-0 
                                                    ${step.side === 'left' ? 'left-full' : 'right-full'}`}
                                                    style={{ backgroundImage: 'linear-gradient(to right, white 50%, transparent 50%)', backgroundSize: '6px 100%' }}
                                                />
                                                
                                                {/* Thumb Pin Element - Centered on inner card top edge, positioned relative to frame */}
                                                <div className={`absolute top-3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full ${pinColor} border-[4px] border-white/20 shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_-2px_4px_rgba(0,0,0,0.3)] z-50 transition-transform group-hover:scale-110`}>
                                                    <div className="absolute inset-1.5 rounded-full bg-white/30 blur-[1px]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 4. Payment Overview */}
                <section id="payment-overview" className="space-y-6">
                    <div className="flex items-center gap-4 my-20">
                        <div className="h-px flex-1 bg-white/5" />
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/5 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Payment Overview</h2>
                        </div>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="relative overflow-hidden group border-white/5 hover:border-white/10">
                            <h3 className="text-xl font-bold text-white mb-4">Pending Clearance</h3>
                            <p className="text-gray-400 leading-relaxed text-sm">
                                Once a project is approved by the client, the earnings enter a <span className="text-white font-bold">Pending Clearance</span> state. This short period allows the platform to complete standard processing before the funds become available.
                            </p>
                        </Card>
                        <Card className="relative overflow-hidden group border-white/5 hover:border-white/10">
                            <h3 className="text-xl font-bold text-white mb-4">Available Balance</h3>
                            <p className="text-gray-400 leading-relaxed text-sm">
                                After the clearance period (typically 7–14 days), the funds are moved to your <span className="text-white font-bold">Available Balance</span>. The available funds are then transferred to your preferred withdrawal method between the <span className="text-white font-bold">5th and 10th</span> of each month.
                            </p>
                        </Card>
                    </div>
                </section>

                {/* 5. FAQ Section */}
                <section id="faq" className="space-y-6">
                    <div className="flex items-center gap-4 my-20">
                        <div className="h-px flex-1 bg-white/5" />
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/5 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest">FAQ</h2>
                        </div>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    
                    <div className="max-w-3xl mx-auto space-y-4">
                        {[
                            {
                                q: "How long does the application process take?",
                                a: "Applications are typically reviewed within 48–72 hours. You'll receive an email notification once your profile is verified and approved. We prioritize high-quality portfolios that demonstrate attention to detail."
                            },
                            {
                                q: "What software do I need to use?",
                                a: "We require industry-standard tools such as Adobe Illustrator and Adobe Photoshop. Depending on the project requirements, designers are expected to deliver the editable source files in these formats."
                            },
                            {
                                q: "Are there minimum weekly hours required?",
                                a: "No, we offer a completely flexible workflow. You can pick up projects that fit your availability and scale your workload as you wish. There are no mandatory hours."
                            },
                            {
                                q: "How do revisions and feedback work?",
                                a: "Revisions are handled through our internal QA process and direct client feedback loops. Each project includes a set number of revision rounds to ensure the highest quality results."
                            },
                            {
                                q: "How do I get paid in dollars?",
                                a: "We use Payoneer for USD transactions. Please ensure that you have a verified Payoneer account to receive payments."
                            },
                            {
                                q: "I am under 18 and don’t have a Payoneer account.",
                                a: "If you are under 18, you can use a verified Payoneer account belonging to a parent or relative. Alternatively, we also support bank transfers to Pakistani bank accounts, where the funds will be transferred in Pakistani Rupees (PKR)."
                            },
                            {
                                q: "What are “Assets” in the submission process?",
                                a: "Assets refer to the presentation templates and supporting files used during the submission process. These assets are available in the Assets section of the platform after you register and log in as a team member."
                            }
                        ].map((faq, i) => (
                            <div 
                                key={i} 
                                className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    openFaqIndex === i 
                                        ? 'bg-white/[0.04] border-white/20 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]' 
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <button
                                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <h3 className={`text-lg font-bold transition-colors duration-300 ${openFaqIndex === i ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                        {faq.q}
                                    </h3>
                                    <div className={`p-2 rounded-lg transition-all duration-300 ${openFaqIndex === i ? 'bg-brand-primary/20 text-brand-primary rotate-45' : 'bg-white/5 text-gray-500'}`}>
                                        <IconPlus size={20} />
                                    </div>
                                </button>
                                
                                <div 
                                    className={`transition-all duration-500 ease-in-out px-6 ${
                                        openFaqIndex === i ? 'max-h-48 pb-8 opacity-100' : 'max-h-0 pb-0 opacity-0 pointer-events-none'
                                    }`}
                                >
                                    <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mb-6" />
                                    <p className="text-gray-400 leading-relaxed text-sm">
                                        {faq.a}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 5. Join as Designer */}
                <section id="join-designer" className="pt-12">
                    <div className="relative rounded-2xl bg-[#1a1a1a] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] transition-all group border border-white/5">
                        {/* Chrome/Silver Frame Effect */}
                        <div className="absolute inset-0 border-[8px] border-white/[0.03] rounded-2xl pointer-events-none z-20" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl pointer-events-none z-20" />
                        
                        {/* Matte Metal Background */}
                        <div className="absolute inset-0 bg-[#121212] opacity-90" />

                        {/* Metallic Rivets / Bolts in Corners */}
                        <div className="absolute top-6 left-6 w-3 h-3 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent border border-white/20 shadow-lg z-30" />
                        <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent border border-white/20 shadow-lg z-30" />
                        <div className="absolute bottom-6 left-6 w-3 h-3 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent border border-white/20 shadow-lg z-30" />
                        <div className="absolute bottom-6 right-6 w-3 h-3 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent border border-white/20 shadow-lg z-30" />

                        {/* Surface Lighting Glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />
                        
                        <div className="relative z-10 flex flex-col items-center text-center space-y-8 p-8 lg:p-16">
                            <div className="space-y-4">
                                <h2 className="text-3xl lg:text-5xl font-bold text-white uppercase tracking-tighter">
                                    Ready to <span className="text-brand-primary">Apply?</span>
                                </h2>
                                <p className="text-gray-400 text-lg max-w-xl mx-auto">
                                    Join our community of world-class designers and start your journey with us today.
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                                <Button 
                                    variant="metallic" 
                                    className="px-12 py-4 h-auto text-lg font-black uppercase shadow-xl shadow-brand-primary/20 w-full sm:w-auto"
                                    onClick={() => setIsApplyModalOpen(true)}
                                >
                                    Apply as Designer
                                </Button>
                                <Button 
                                    variant="recessed" 
                                    className="px-12 py-4 h-auto text-lg font-bold uppercase tracking-widest w-full sm:w-auto"
                                    onClick={() => window.location.href = '/signin'}
                                >
                                    Sign In
                                </Button>
                            </div>
                        </div>

                        {/* Decorative Icons */}
                        <div className="absolute -bottom-12 -left-12 opacity-[0.03] text-white rotate-12">
                            <IconBrush size={200} />
                        </div>
                        <div className="absolute -top-12 -right-12 opacity-[0.03] text-white -rotate-12">
                            <IconBriefcase size={200} />
                        </div>
                    </div>
                </section>

            </div>

            {/* Apply as Designer Modal */}
            <Modal
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
                title="Apply as Designer"
                size="md"
                isElevatedHeader
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={() => setIsApplyModalOpen(false)}
                            className="px-6"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 shadow-lg shadow-brand-primary/20"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="First Name"
                            placeholder="e.g. John"
                            required
                            variant="recessed"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                        <Input
                            label="Last Name"
                            placeholder="e.g. Doe"
                            required
                            variant="recessed"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="WhatsApp Number"
                            placeholder="923036618342"
                            required
                            variant="recessed"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        />
                        <Input
                            label="Email"
                            placeholder="yourname@domain.com"
                            required
                            variant="recessed"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-gray-400 ml-1">Upload CV & Documents</label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                id="cv-upload"
                                multiple
                                onChange={handleFileSelect}
                            />
                            <div
                                onClick={() => !isSubmitting && document.getElementById('cv-upload')?.click()}
                                className={`w-full flex flex-col items-center justify-center rounded-2xl p-8 bg-white/[0.03] border border-white/10 relative overflow-hidden transition-all duration-300 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)] hover:bg-white/[0.06] hover:border-white/20 ${isSubmitting ? 'cursor-wait opacity-50' : 'cursor-pointer'} group`}
                            >
                                {/* Top Edge Highlight for Elevation */}
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                {/* Diagonal Metallic Shine Overlay */}
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none opacity-40" />
                                {/* Center-weighted Shadow Depth Falloff */}
                                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.9)] opacity-70 pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="p-4 rounded-full bg-white/[0.05] border border-white/10 text-gray-400 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all duration-300 mb-4 shadow-lg">
                                        {isSubmitting ? (
                                            <svg className="animate-spin h-6 w-6 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <IconCloudUpload size={24} />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
                                            {isSubmitting ? 'Uploading...' : 'Choose CV File'}
                                        </p>
                                        <p className="text-[11px] text-gray-500 font-medium whitespace-pre-wrap px-8">PDF, DOC, DOCX up to 10MB</p>
                                    </div>
                                </div>
                            </div>

                            {/* File Previews Grid (Matches Choose Your Move Modal) */}
                            {cvFiles.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 animate-in fade-in duration-300">
                                    {cvFiles.map((file, index) => {
                                        const extension = file.name.split('.').pop()?.toLowerCase();
                                        
                                        const getIcon = () => {
                                            let iconName = 'txt-icon.png';
                                            const ext = extension || '';
                                            if (['doc', 'docx'].includes(ext)) iconName = 'doc-icon.png';
                                            else if (ext === 'pdf') iconName = 'pdf-icon.png';
                                            
                                            // Assume other icons might be used if they upload images or other stuff, 
                                            // but for CV we mostly care about PDF/DOC
                                            return (
                                                <img 
                                                    src={`/${iconName}`} 
                                                    alt={ext}
                                                    className="w-10 h-10 object-contain opacity-90"
                                                />
                                            );
                                        };

                                        return (
                                            <div
                                                key={`${file.name}-${index}`}
                                                className="group relative flex flex-col gap-2"
                                            >
                                                <div className="relative aspect-square rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-all duration-300 group-hover:bg-white/[0.06] group-hover:border-white/20 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] group-hover:shadow-xl group-hover:shadow-black/60">
                                                    {/* Top Edge Highlight */}
                                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-20" />
                                                    {/* Diagonal Metallic Shine Overlay */}
                                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none opacity-40 z-20" />

                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        {getIcon()}
                                                    </div>

                                                    {/* Delete Action */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-error active:scale-95 z-30"
                                                    >
                                                        <IconX size={14} />
                                                    </button>
                                                    <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                                                </div>
                                                <span className="text-[11px] font-medium text-gray-400 truncate px-1 text-center group-hover:text-white transition-colors">
                                                    {file.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-400 ml-1">Portfolio Links</label>
                            <button
                                type="button"
                                onClick={handleAddLink}
                                className="p-1 px-3 text-[10px] font-bold uppercase tracking-widest bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-lg hover:bg-brand-primary hover:text-white transition-all flex items-center gap-1"
                            >
                                <IconPlus className="w-3 h-3" />
                                Add Link
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {portfolioLinks.map((link, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder="https://behance.net/..."
                                        value={link}
                                        variant="recessed"
                                        onChange={(e) => handleLinkChange(index, e.target.value)}
                                        className="flex-1"
                                    />
                                    {portfolioLinks.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="recessed"
                                            onClick={() => handleRemoveLink(index)}
                                            className="h-[52px] w-[52px] p-0 flex items-center justify-center border-brand-error/20 hover:text-brand-error hover:border-brand-error/40"
                                        >
                                            <IconTrash className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Guide;

