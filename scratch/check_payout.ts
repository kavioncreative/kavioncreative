
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProject() {
  console.log('--- Checking Project YOU 459479 ---');
  const { data: project, error: pError } = await supabase
    .from('projects')
    .select('*')
    .eq('display_id', 'YOU 459479')
    .single();

  if (pError) {
    console.error('Project fetch error:', pError);
    return;
  }

  console.log('Project Data:', JSON.stringify(project, null, 2));

  if (project.assignee_id) {
    const { data: profile, error: prError } = await supabase
      .from('profiles')
      .select('payout_strategy, fixed_payout_rate, tier_id')
      .eq('id', project.assignee_id)
      .single();

    if (prError) {
      console.error('Profile fetch error:', prError);
    } else {
      console.log('Assignee Profile:', JSON.stringify(profile, null, 2));
    }
  }

  console.log('--- Checking Payout Rules ---');
  const { data: rules, error: rError } = await supabase
    .from('payout_rules')
    .select('*')
    .eq('is_active', true);

  if (rError) {
    console.error('Rules fetch error:', rError);
  } else {
    console.log('Active Rules:', JSON.stringify(rules, null, 2));
  }
}

checkProject();
