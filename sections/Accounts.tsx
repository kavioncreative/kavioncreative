import React, { useState, useEffect, useMemo } from 'react';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { IconEdit, IconTrash, IconPlus, IconAlertTriangle } from '../components/Icons';
import { Modal, SuccessModal } from '../components/Surfaces';
import { Input } from '../components/Input';
import { KebabMenu } from '../components/KebabMenu';
import { supabase } from '../lib/supabase';
import { useAccounts } from '../contexts/AccountContext';
import { useUser } from '../contexts/UserContext';
import { addToast } from '../components/Toast';
import { getAccountCapsuleClasses, getStatusCapsuleClasses } from '../components/Badge';

interface Account {
    id: string;
    name: string;
    type: string;
    balance: string;
    status: string;
    prefix?: string;
}

const Accounts: React.FC = () => {
    const { hasPermission } = useUser();
    const { accounts, loading, fetchAccounts } = useAccounts();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', prefix: '' });
    const [prefixError, setPrefixError] = useState('');

    const handleAddAccount = async () => {
        if (!formData.name || !formData.prefix) return;

        // Check for duplicate prefix
        const isDuplicate = accounts.some(acc => acc.prefix?.toUpperCase() === formData.prefix.toUpperCase());
        if (isDuplicate) {
            setPrefixError('Prefix already exists');
            return;
        }

        setSubmitting(true);
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
            setSubmitting(false);
            return;
        }

        const newAccount = {
            name: formData.name,
            prefix: formData.prefix,
            display_prefix: formData.prefix,
            // type, balance, status, user_id removed as they don't exist in schema
        };

        const { error } = await supabase
            .from('accounts')
            .insert([newAccount]);

        if (!error) {
            setIsSuccess(true);
            await fetchAccounts();
        } else {
            addToast({ type: 'error', title: 'Error', message: error.message });
        }
        setSubmitting(false);
    };

    const handleEditAccount = async () => {
        if (!selectedAccount || !formData.name || !formData.prefix) return;

        // Check for duplicate prefix (excluding current account)
        const isDuplicate = accounts.some(acc =>
            acc.id !== selectedAccount.id &&
            acc.prefix?.toUpperCase() === formData.prefix.toUpperCase()
        );
        if (isDuplicate) {
            setPrefixError('Prefix already exists');
            return;
        }

        setSubmitting(true);
        const { error } = await supabase
            .from('accounts')
            .update({ name: formData.name, prefix: formData.prefix, display_prefix: formData.prefix })
            .eq('id', selectedAccount.id);

        if (!error) {
            addToast({ type: 'success', title: 'Account Updated', message: `Account "${formData.name}" updated successfully.` });
            setIsEditModalOpen(false);
            await fetchAccounts();
        } else {
            addToast({ type: 'error', title: 'Error', message: error.message });
        }
        setSubmitting(false);
    };

    const handleDeleteAccount = async () => {
        if (!selectedAccount) return;

        setSubmitting(true);
        try {
            // Using .select() with delete ensures we get confirmation that a row was actually affected
            // If data is empty but error is null, it typically means RLS blocked the deletion
            const { data, error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', selectedAccount.id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error('Deletion failed. You might not have permission to delete this record.');
            }

            addToast({
                type: 'success',
                title: 'Account Deleted',
                message: `Account "${selectedAccount.name}" removed successfully.`
            });
            await fetchAccounts();
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            console.error('Supabase deletion error:', error);
            addToast({
                type: 'error',
                title: 'Deletion Failed',
                message: error.message || 'An unexpected error occurred.'
            });
        } finally {
            setSubmitting(false);
            setSelectedAccount(null);
        }
    };

    const handleClose = () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
        setIsSuccess(false);
        setSelectedAccount(null);
        setFormData({ name: '', prefix: '' });
        setPrefixError('');
    };

    const columns = useMemo(() => {
        const baseColumns = [
            {
                header: 'Account Name',
                key: 'name',
                render: (item: any) => (
                    <span className="font-semibold text-white/90">{item.name}</span>
                )
            },
            {
                header: 'Prefix',
                key: 'prefix',
                render: (item: any) => (
                    <span className={getAccountCapsuleClasses()}>{item.prefix || '-'}</span>
                )
            },
            {
                header: 'Status',
                key: 'status',
                render: (item: any) => {
                    const status = item.status || 'Active';
                    return (
                        <span className={getStatusCapsuleClasses(status)}>
                            {status}
                        </span>
                    );
                }
            },
        ];

        if (hasPermission('manage_accounts')) {
            baseColumns.push({
                header: '',
                key: 'actions',
                className: 'text-right',
                render: (item: any) => (
                    <KebabMenu
                        options={[
                            {
                                label: 'Edit',
                                icon: <IconEdit className="w-4 h-4" />,
                                onClick: () => {
                                    setSelectedAccount(item);
                                    setFormData({ name: item.name, prefix: item.prefix || '' });
                                    setIsEditModalOpen(true);
                                }
                            },
                            {
                                label: 'Delete',
                                icon: <IconTrash className="w-4 h-4" />,
                                variant: 'danger',
                                onClick: () => {
                                    setSelectedAccount(item);
                                    setIsDeleteModalOpen(true);
                                }
                            }
                        ]}
                    />
                )
            } as any);
        }

        return baseColumns;
    }, [hasPermission, accounts]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {hasPermission('manage_accounts') && (
                <div className="flex justify-end">
                    <Button
                        variant="metallic"
                        size="sm"
                        leftIcon={<IconPlus className="w-4 h-4" />}
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        Add Account
                    </Button>
                </div>
            )}

            <Table columns={columns} data={accounts} isLoading={loading} isMetallicHeader={true} />

            {/* Add Account Modal */}
            <Modal
                isOpen={isAddModalOpen && !isSuccess}
                onClose={handleClose}
                title="Create New Account"
                size="sm"
                isElevatedFooter
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={handleClose}>Cancel</Button>
                        <Button
                            variant="metallic"
                            onClick={handleAddAccount}
                            isLoading={submitting}
                            disabled={!formData.name || !formData.prefix}
                        >
                            Add
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <Input
                        label="Account Name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={submitting}
                        variant="metallic"
                    />
                    <Input
                        label="Display Prefix"
                        placeholder="JHD"
                        value={formData.prefix}
                        error={prefixError}
                        onChange={(e) => {
                            setFormData({ ...formData, prefix: e.target.value });
                            if (prefixError) setPrefixError('');
                        }}
                        disabled={submitting}
                        variant="metallic"
                    />
                </div>
            </Modal>

            {/* Edit Account Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={handleClose}
                title="Edit Account"
                size="sm"
                isElevatedFooter
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={handleClose}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={handleEditAccount}
                            isLoading={submitting}
                            disabled={!formData.name || !formData.prefix}
                        >
                            Save Changes
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <Input
                        label="Account Name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={submitting}
                        variant="metallic"
                    />
                    <Input
                        label="Display Prefix"
                        placeholder="JHD"
                        value={formData.prefix}
                        error={prefixError}
                        onChange={(e) => {
                            setFormData({ ...formData, prefix: e.target.value });
                            if (prefixError) setPrefixError('');
                        }}
                        disabled={submitting}
                        variant="metallic"
                    />
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={handleClose}
                title="Delete Account"
                size="sm"
                isElevatedFooter
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={handleClose}>Cancel</Button>
                        <Button
                            variant="metallic-error"
                            onClick={handleDeleteAccount}
                            isLoading={submitting}
                        >
                            Delete
                        </Button>
                    </div>
                )}
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-brand-error/10 flex items-center justify-center text-brand-error mb-4">
                        <IconAlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
                    <p className="text-gray-400 text-sm">
                        You are about to delete the account <span className="text-white font-bold">"{selectedAccount?.name}"</span>. This action cannot be undone.
                    </p>
                </div>
            </Modal>

            <SuccessModal
                isOpen={isSuccess}
                onClose={handleClose}
                title="Account Created"
                description={`Successfully created account "${formData.name}". It is now active and ready for use.`}
                primaryAction={{ label: 'Close', onClick: handleClose }}
            />
        </div>
    );
};

export default Accounts;
