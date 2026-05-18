import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKeyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabaseKey = supabaseKeyMatch ? supabaseKeyMatch[1].trim() : env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function dryRun() {
    console.log("=== STEP 1: DRY RUN (TIERED PAYOUT BACKDATE) ===");
    console.log("Target Date: March 17, 2026");

    // 1. Fetch payout rules
    const { data: rules, error: rulesErr } = await supabase
        .from('payout_rules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (rulesErr) throw rulesErr;
    console.log("Active Payout Rules fetched.");

    // 2. Fetch profiles with tiered strategy
    const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, payout_strategy')
        .eq('payout_strategy', 'tiered');

    if (profErr) throw profErr;
    const tieredUserIds = profiles.map(p => p.id);
    const profileMap = {};
    profiles.forEach(p => profileMap[p.id] = p.name);

    console.log(`Found ${tieredUserIds.length} users with 'tiered' payout strategy.`);

    // 3. Fetch projects from March 17th onwards
    // Note: The user said "orders from 17th March". This likely refers to clearance_start_date or created_at.
    // Let's use clearance_start_date (for approved projects) and created_at as fallback.
    const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('project_id, price, designer_fee, team_designer_fee, team_payout, assignee_id, team_designer_id, status, clearance_start_date, created_at')
        .or(`created_at.gte.2026-03-17T00:00:00Z,clearance_start_date.gte.2026-03-17T00:00:00Z`)
        .eq('status', 'Approved');

    if (projErr) throw projErr;

    console.log(`Found ${projects.length} approved projects since March 17th.\n`);

    let changesCount = 0;
    const report = [];

    for (const proj of projects) {
        let changed = false;
        let newDesignerFee = proj.designer_fee;
        let newTeamDesignerFee = proj.team_designer_fee;

        // Check Assignee (Designer Fee)
        if (proj.assignee_id && tieredUserIds.includes(proj.assignee_id)) {
            const price = Number(proj.price || 0);
            let matchingRule = rules.find(r => price >= Number(r.min_price) && price <= Number(r.max_price));
            if (matchingRule) {
                const calculatedFee = Number(matchingRule.payout_amount);
                if (Number(proj.designer_fee) !== calculatedFee) {
                    newDesignerFee = calculatedFee;
                    changed = true;
                }
            }
        }

        // Check Team Designer (Team Designer Fee)
        if (proj.team_designer_id && tieredUserIds.includes(proj.team_designer_id)) {
            const price = Number(proj.price || 0);
            let matchingRule = rules.find(r => price >= Number(r.min_price) && price <= Number(r.max_price));
            if (matchingRule) {
                const calculatedFee = Number(matchingRule.payout_amount);
                if (Number(proj.team_designer_fee) !== calculatedFee) {
                    newTeamDesignerFee = calculatedFee;
                    changed = true;
                }
            }
        }

        if (changed) {
            changesCount++;
            report.push({
                project_id: proj.project_id,
                price: proj.price,
                assignee: profileMap[proj.assignee_id] || 'Unknown',
                old_fee: proj.designer_fee,
                new_fee: newDesignerFee,
                old_team_fee: proj.team_designer_fee,
                new_team_fee: newTeamDesignerFee
            });
        }
    }

    console.log(`Total projects needing update: ${changesCount}`);
    if (changesCount > 0) {
        console.table(report.slice(0, 15));
        if (changesCount > 15) console.log(`... and ${changesCount - 15} more.`);
    }

    console.log("\nDry run complete. Run Step 2 (backup) next if everything looks good.");
}

dryRun().catch(console.error);
