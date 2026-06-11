import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

const systemFormatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
};

async function run() {
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    console.log('Fetching all database records for mapping verification...');
    
    // 1. Fetch platform commissions
    const { data: platformCommissions } = await supabase.from('platform_commissions').select('*, platform_commission_accounts(account_id)');
    const mappedCommissions = platformCommissions.map(item => ({
        ...item,
        assigned_account_ids: item.platform_commission_accounts?.map(r => r.account_id) || []
    }));

    // 2. Fetch pricing slabs
    const { data: pricingSlabs } = await supabase.from('pricing_slabs').select('*').order('min_price', { ascending: true });

    // 3. Fetch accounts
    const { data: accounts } = await supabase.from('accounts').select('*');

    // 4. Fetch all projects
    const { data: projects, error } = await supabase.from('projects').select('*, accounts(prefix)');
    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    console.log(`Retrieved ${projects.length} projects. Mapping...`);
    
    let crashCount = 0;
    
    projects.forEach((p, idx) => {
        try {
            const price = Number(p.price || 0);
            const tipAmount = Number(p.tip_amount || 0);

            let accountId = p.account_id;
            const activeAccounts = accounts || [];
            const activeCommissions = mappedCommissions || [];

            if (!accountId && p.account) {
                const matchedAcc = activeAccounts.find(a => a.name === p.account || a.prefix === p.account);
                if (matchedAcc) accountId = matchedAcc.id;
            }

            const commission = activeCommissions.find(pc => pc.assigned_account_ids.includes(accountId));
            const commissionFactor = commission ? (Number(commission.commission_percentage) > 1 ? Number(commission.commission_percentage) / 100 : Number(commission.commission_percentage)) : 0;

            const platformCut = price * commissionFactor;

            let freelancerCut = 0;
            if (p.designer_fee && Number(p.designer_fee) > 0) {
                freelancerCut = Number(p.designer_fee);
            } else {
                const activeSlabs = pricingSlabs || [];
                const slab = activeSlabs.find(s => price >= Number(s.min_price) && price <= Number(s.max_price));
                const freelancerPct = slab ? Number(slab.freelancer_percentage) : 50;
                freelancerCut = (price - platformCut) * (freelancerPct / 100);
            }

            const companyEarning = price - platformCut - freelancerCut;

            const prefix = p.accounts?.prefix || 'Unassigned Account';

            let formattedId = p.project_id;
            if (prefix !== 'Unassigned Account' && !formattedId.startsWith(prefix)) {
                formattedId = `${prefix} ${formattedId}`;
            }

            const enriched = {
                ...p,
                company_earning: companyEarning,
                platform_cut: platformCut,
                freelancer_cut: freelancerCut,
                account_prefix: prefix,
                formatted_project_id: formattedId,
                client: p.client_name || 'General Client',
                date: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                rawDate: p.clearance_start_date
            };
        } catch (err) {
            crashCount++;
            console.error(`Crash at index ${idx} for project ID: ${p.project_id || 'UNKNOWN'}`);
            console.error(err);
        }
    });

    console.log(`\nMapping verification finished. Total crashes: ${crashCount}`);
}

run();
