
const { createClient } = require('@supabase/supabase-js');

// Constants for ease of configuration
const SUPABASE_URL = 'https://efrborampxloagtlphyf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedAlgorithm() {
    console.log('🚀 Starting Algorithm Config Seed...');

    const configs = [
        { metric_name: 'Confidence Threshold (m)', metric_value: 5, description: 'Min reviews needed before a freelancer rating is fully trusted' },

        // Rising Talent (Tier 1)
        { metric_name: 'Rising Talent Score Min', metric_value: 4.0, description: 'Min Bayesian score for Rising Talent' },
        { metric_name: 'Rising Talent Project Min', metric_value: 2, description: 'Min projects for Rising Talent' },
        { metric_name: 'Rising Talent Earnings Min', metric_value: 0, description: 'Min earnings for Rising Talent' },

        // Top Rated (Tier 2)
        { metric_name: 'Top Rated Score Min', metric_value: 4.7, description: 'Min Bayesian score for Top Rated' },
        { metric_name: 'Top Rated Project Min', metric_value: 10, description: 'Min projects for Top Rated' },
        { metric_name: 'Top Rated Earnings Min', metric_value: 500, description: 'Min earnings for Top Rated' },

        // Top Rated Plus (Tier 3)
        { metric_name: 'Top Rated Plus Score Min', metric_value: 4.85, description: 'Min Bayesian score for Top Rated Plus' },
        { metric_name: 'Top Rated Project Min Plus', metric_value: 30, description: 'Min projects for Top Rated Plus' },
        { metric_name: 'Top Rated Earnings Min Plus', metric_value: 2500, description: 'Min earnings for Top Rated Plus' },

        // Expert (Tier 4)
        { metric_name: 'Expert Score Min', metric_value: 4.95, description: 'Min Bayesian score for Expert' },
        { metric_name: 'Expert Project Min', metric_value: 50, description: 'Min projects for Expert' },
        { metric_name: 'Expert Earnings Min', metric_value: 10000, description: 'Min earnings for Expert' }
    ];

    for (const config of configs) {
        const { error } = await supabase
            .from('algorithm_config')
            .upsert(config, { onConflict: 'metric_name' });

        if (error) {
            console.error(`❌ Error upserting ${config.metric_name}:`, error.message);
        } else {
            console.log(`✅ Upserted ${config.metric_name}`);
        }
    }

    console.log('✨ Seed complete!');
}

seedAlgorithm();
