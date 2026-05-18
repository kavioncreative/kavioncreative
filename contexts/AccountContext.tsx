
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';

interface Account {
    id: string;
    name: string;
    prefix: string;
    display_prefix?: string;
    status?: string;
}

interface AccountContextType {
    accounts: Account[];
    loading: boolean;
    fetchAccounts: (isInitial?: boolean) => Promise<void>;
}


const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile, effectiveRole } = useUser();

    const fetchAccounts = async (isInitial = false) => {
        if (!profile) return;

        if (isInitial) setLoading(true);

        const isSuperAdmin = effectiveRole === 'Super Admin';
        const userRole = effectiveRole?.toLowerCase().trim();

        try {
            let query = supabase
                .from('accounts')
                .select('*')
                .order('name', { ascending: true });

            // Apply account scoping for non-Super Admins
            const isAdminLike = ['admin', 'project manager', 'project operations manager'].includes(userRole || '');
            if (isAdminLike && !isSuperAdmin) {
                const { data: permittedAccounts } = await supabase
                    .from('user_account_access')
                    .select('account_id')
                    .eq('user_id', profile.id);

                if (permittedAccounts && permittedAccounts.length > 0) {
                    const accountIds = permittedAccounts.map(pa => pa.account_id);
                    query = query.in('id', accountIds);
                } else {
                    setAccounts([]);
                    setLoading(false);
                    return;
                }
            }

            const { data, error } = await query;

            if (!error && data) {
                setAccounts(data);
            } else if (error) {
                console.error('Error fetching accounts:', error);
                setAccounts([]);
            }
        } catch (err) {
            console.error('Error fetching accounts in context:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile) {
            fetchAccounts(true);


            // Subscribe to changes in accounts table
            const channel = supabase
                .channel('accounts_changes')
                .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'accounts' }, () => {
                    fetchAccounts();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setAccounts([]);
            setLoading(false);
        }
    }, [profile]);

    return (
        <AccountContext.Provider value={{ accounts, loading, fetchAccounts }}>
            {children}
        </AccountContext.Provider>
    );
};

export const useAccounts = () => {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error('useAccounts must be used within an AccountProvider');
    }
    return context;
};
