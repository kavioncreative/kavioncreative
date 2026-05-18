
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { addToast } from './Toast';
import { DatePicker } from './DatePicker';
import { Input } from './Input';
import { Dropdown } from './Dropdown';
import { useAccounts } from '../contexts/AccountContext';

interface PerformanceFormProps {
    onComplete: () => void;
    onSubmitStatusChange: (isSubmitting: boolean) => void;
    userId?: string;
}

export const PerformanceForm: React.FC<PerformanceFormProps> = ({ onComplete, onSubmitStatusChange, userId }) => {
    const [formData, setFormData] = useState({
        accountId: '',
        date: new Date() as Date | null,
        successScore: '',
        rating: '',
        ctr: '',
        conversionRate: '',
        impressions: '',
        clicks: '',
        orders: '',
        cancelledOrders: ''
    });

    const { accounts } = useAccounts();

    const handleSubmit = async () => {
        onSubmitStatusChange(true);
        try {
            if (!formData.accountId) {
                throw new Error('Please select an account');
            }
            if (!formData.date) {
                throw new Error('Please select a date');
            }

            const { error } = await supabase
                .from('performance_metrics')
                .insert({
                    account_id: formData.accountId,
                    user_id: userId, // Record who filled this form
                    date: formData.date.toISOString().split('T')[0],
                    success_score: parseFloat(formData.successScore) || 0,
                    rating: parseFloat(formData.rating) || 0,
                    ctr: parseFloat(formData.ctr) || 0,
                    conversion_rate: parseFloat(formData.conversionRate) || 0,
                    impressions: parseInt(formData.impressions) || 0,
                    clicks: parseInt(formData.clicks) || 0,
                    orders: parseInt(formData.orders) || 0,
                    cancelled_orders: parseInt(formData.cancelledOrders) || 0
                });

            if (error) throw error;

            addToast({ type: 'success', title: 'Data Submitted', message: 'Performance data has been recorded.' });
            onComplete();
        } catch (error: any) {
            console.error('Error submitting form:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to submit data.' });
        } finally {
            onSubmitStatusChange(false);
        }
    };

    // Expose handleSubmit via ref if needed, but for now we'll just handle it within the parent's footer.
    // Actually, it's better if the parent calls handleSubmit.
    // I'll use forwardRef.

    return (
        <div className="space-y-6">
            {/* Account Dropdown */}
            <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Account</label>
                <Dropdown
                    variant="metallic"
                    placeholder="Select account"
                    options={(accounts || []).map(acc => ({
                        value: acc.id,
                        label: acc.name,
                        description: acc.prefix
                    }))}
                    value={formData.accountId}
                    onChange={(val) => setFormData({ ...formData, accountId: val })}
                    showSearch={true}
                    size="md"
                />
            </div>

            {/* Date Field */}
            <DatePicker
                label="Date"
                value={formData.date}
                onChange={(date: Date | null) => setFormData({ ...formData, date })}
                variant="metallic"
                className="w-full"
            />

            <div className="grid grid-cols-2 gap-4">
                <Input
                    variant="metallic"
                    label="Success Score"
                    placeholder="0.00"
                    type="number"
                    value={formData.successScore}
                    onChange={(e) => setFormData({ ...formData, successScore: e.target.value })}
                    size="md"
                />
                <Input
                    variant="metallic"
                    label="Rating"
                    placeholder="0.0"
                    type="number"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    size="md"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    variant="metallic"
                    label="CTR (%)"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    value={formData.ctr}
                    onChange={(e) => setFormData({ ...formData, ctr: e.target.value })}
                    size="md"
                />
                <Input
                    variant="metallic"
                    label="Conv. Rate (%)"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    value={formData.conversionRate}
                    onChange={(e) => setFormData({ ...formData, conversionRate: e.target.value })}
                    size="md"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    variant="metallic"
                    label="Impressions"
                    placeholder="0"
                    type="number"
                    value={formData.impressions}
                    onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
                    size="md"
                />
                <Input
                    variant="metallic"
                    label="Clicks"
                    placeholder="0"
                    type="number"
                    value={formData.clicks}
                    onChange={(e) => setFormData({ ...formData, clicks: e.target.value })}
                    size="md"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    variant="metallic"
                    label="Orders"
                    placeholder="0"
                    type="number"
                    value={formData.orders}
                    onChange={(e) => setFormData({ ...formData, orders: e.target.value })}
                    size="md"
                />
                <Input
                    variant="metallic"
                    label="Cancelled"
                    placeholder="0"
                    type="number"
                    value={formData.cancelledOrders}
                    onChange={(e) => setFormData({ ...formData, cancelledOrders: e.target.value })}
                    size="md"
                />
            </div>

            {/* Hidden submit trigger for parent */}
            <button id="perf-form-submit" onClick={handleSubmit} className="hidden" />
        </div>
    );
};
