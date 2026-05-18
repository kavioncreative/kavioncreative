import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Modal, Card, ElevatedMetallicCard } from '../components/Surfaces';
import { IconFilter, IconPlus, IconTrash, IconEdit, IconX, IconChartBar } from '../components/Icons';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { addToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import { KebabMenu } from '../components/KebabMenu';

interface TeamSlab {
    id: string;
    team_lead_id: string;
    slab_name: string | null;
    min_price: number;
    max_price: number;
    percentage: number;
    is_active: boolean;
}

const TeamSlabs: React.FC = () => {
    const { profile } = useUser();
    const [slabs, setSlabs] = useState<TeamSlab[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingSlab, setEditingSlab] = useState<TeamSlab | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        min_price: '',
        max_price: '',
        percentage: ''
    });

    const fetchSlabs = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('team_pricing_slabs')
                .select('*')
                .eq('team_lead_id', profile.id)
                .order('min_price', { ascending: true });

            if (error) throw error;
            setSlabs(data || []);
        } catch (err: any) {
            console.error('Error fetching slabs:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load pricing slabs' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlabs();
    }, [profile?.id]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSlab(null);
        setFormData({ name: '', min_price: '', max_price: '', percentage: '' });
    };

    const handleSave = async () => {
        if (!profile?.id) return;
        
        const minVal = parseFloat(formData.min_price);
        const maxVal = parseFloat(formData.max_price);
        const percVal = parseFloat(formData.percentage);

        if (!formData.name || isNaN(minVal) || isNaN(maxVal) || isNaN(percVal)) {
            addToast({ type: 'error', title: 'Missing Fields', message: 'All fields are required.' });
            return;
        }

        if (minVal >= maxVal) {
            addToast({ type: 'error', title: 'Invalid Range', message: 'Minimum price must be less than maximum price.' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                team_lead_id: profile.id,
                slab_name: formData.name,
                min_price: minVal,
                max_price: maxVal,
                percentage: percVal
            };

            if (editingSlab) {
                const { error } = await supabase
                    .from('team_pricing_slabs')
                    .update(payload)
                    .eq('id', editingSlab.id);

                if (error) throw error;
                addToast({ type: 'success', title: 'Success', message: 'Slab updated successfully' });
            } else {
                const { error } = await supabase
                    .from('team_pricing_slabs')
                    .insert(payload);

                if (error) throw error;
                addToast({ type: 'success', title: 'Success', message: 'Slab created successfully' });
            }

            handleCloseModal();
            fetchSlabs();
        } catch (err: any) {
            console.error('Error saving slab:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to save slab' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSlab = async () => {
        if (!editingSlab) return;
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('team_pricing_slabs')
                .delete()
                .eq('id', editingSlab.id);

            if (error) throw error;
            addToast({ type: 'success', title: 'Deleted', message: 'Slab removed successfully' });
            setIsDeleteModalOpen(false);
            setEditingSlab(null);
            fetchSlabs();
        } catch (err: any) {
            console.error('Error deleting slab:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to delete slab' });
        } finally {
            setSubmitting(false);
        }
    };

    const calculateValues = (price: number) => {
        const perc = parseFloat(formData.percentage) || 0;
        const designerShare = price * (perc / 100);
        const tlProfit = price - designerShare;

        return {
            designerShare: designerShare.toFixed(2),
            tlProfit: tlProfit.toFixed(2)
        };
    };

    const minPreview = calculateValues(parseFloat(formData.min_price) || 0);
    const maxPreview = calculateValues(parseFloat(formData.max_price) || 0);

    if (loading && slabs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                <p className="text-gray-500 text-sm animate-pulse font-bold tracking-widest uppercase">Loading Slabs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-center justify-end px-2 gap-4">
                <Button 
                    variant="metallic" 
                    size="sm"
                    leftIcon={<IconPlus size={16} />}
                    onClick={() => {
                        handleCloseModal();
                        setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    Add Slab
                </Button>
            </div>

            <div className="flex flex-col gap-4 min-h-[300px]">
                {slabs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-12 border-2 border-dashed border-surface-border rounded-3xl bg-white/[0.02]">
                        <div className="p-4 rounded-full bg-brand-primary/10 mb-4">
                            <IconChartBar className="w-8 h-8 text-brand-primary" />
                        </div>
                        <h4 className="text-lg font-bold text-white">No Team Slabs</h4>
                        <p className="text-gray-500 text-sm mt-1 mb-6 text-center max-w-xs">Define tiered payout structures for your team designers.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>Create First Slab</Button>
                    </div>
                ) : (
                    slabs.map((slab) => (
                        <ElevatedMetallicCard
                            key={slab.id}
                            title={slab.slab_name || 'Unnamed Slab'}
                            bodyClassName="p-6"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-2xl font-bold text-white tracking-tight">${slab.min_price} - ${slab.max_price}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Project Payout Range</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xl font-black text-brand-primary">{slab.percentage}%</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Designer Share</p>
                                    </div>

                                    <div className="border-l border-white/5 pl-6">
                                        <KebabMenu
                                            options={[
                                                { label: 'Edit', icon: <IconEdit size={16} />, onClick: () => {
                                                    setEditingSlab(slab);
                                                    setFormData({
                                                        name: slab.slab_name || '',
                                                        min_price: slab.min_price.toString(),
                                                        max_price: slab.max_price.toString(),
                                                        percentage: slab.percentage.toString()
                                                    });
                                                    setIsModalOpen(true);
                                                } },
                                                { label: 'Delete', icon: <IconTrash size={16} />, variant: 'danger', onClick: () => {
                                                    setEditingSlab(slab);
                                                    setIsDeleteModalOpen(true);
                                                } }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </ElevatedMetallicCard>
                    ))
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSlab ? "Edit Pricing Slab" : "Create Pricing Slab"}
                size="md"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="metallic" onClick={handleSave} isLoading={submitting}>
                            {editingSlab ? "Update Slab" : "Save Slab"}
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="md:col-span-2">
                            <Input
                                variant="metallic"
                                label="Slab Name"
                                placeholder="Basic Tier"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <Input
                            variant="metallic"
                            label="Minimum Price"
                            placeholder="0"
                            type="number"
                            value={formData.min_price}
                            onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                        />
                        <Input
                            variant="metallic"
                            label="Maximum Price"
                            placeholder="500"
                            type="number"
                            value={formData.max_price}
                            onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                        />
                        <div className="md:col-span-2">
                            <Input
                                variant="metallic"
                                label="Designer Percentage (%)"
                                placeholder="30"
                                type="number"
                                value={formData.percentage}
                                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                                helperText="This is what the team designer will earn from your project payout."
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest px-1 text-left">Calculation Preview</h5>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Min Price Preview */}
                            <div className="flex-1 p-5 rounded-2xl bg-surface-overlay border border-surface-border space-y-4 text-left">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-xs font-bold text-gray-400">At Min Price</span>
                                    <span className="text-lg font-bold text-white">${formData.min_price || '0'}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Designer Share ({formData.percentage || '0'}%)</span>
                                        <span className="text-gray-300 font-medium">-${minPreview.designerShare}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                                        <span className="text-gray-400">Profit</span>
                                        <span className="text-brand-success font-bold">${minPreview.tlProfit}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Max Price Preview */}
                            <div className="flex-1 p-5 rounded-2xl bg-surface-overlay border border-surface-border space-y-4 text-left">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-xs font-bold text-gray-400">At Max Price</span>
                                    <span className="text-lg font-bold text-white">${formData.max_price || '0'}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Designer Share ({formData.percentage || '0'}%)</span>
                                        <span className="text-gray-300 font-medium">-${maxPreview.designerShare}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                                        <span className="text-gray-400">Profit</span>
                                        <span className="text-brand-success font-bold">${maxPreview.tlProfit}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Slab Deletion"
                size="sm"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="metallic-error"
                            onClick={handleDeleteSlab}
                            isLoading={submitting}
                        >
                            Delete Slab
                        </Button>
                    </div>
                )}
            >
                <div className="py-2 text-left">
                    <p className="text-gray-300">Are you sure you want to delete the pricing slab <span className="font-bold text-white">{editingSlab?.slab_name}</span>?</p>
                    <p className="text-sm text-gray-500 mt-2">This action is permanent and will affect future designer payout calculations.</p>
                </div>
            </Modal>
        </div>
    );
};

export default TeamSlabs;

