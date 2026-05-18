
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function seedVerificationData() {
    console.log('Seeding verification data...');

    // 1. Create Mock Freelancers (profiles) if not exist
    const mockFreelancers = [
        { name: 'Elite Veteran', id: '00000000-0000-0000-0000-000000000001' },
        { name: 'One Hit Wonder', id: '00000000-0000-0000-0000-000000000002' },
        { name: 'Active Rising Star', id: '00000000-0000-0000-0000-000000000003' }
    ];

    for (const f of mockFreelancers) {
        await supabase.from('profiles').upsert({
            id: f.id,
            name: f.name,
            role: 'Freelancer',
            is_active: true
        });
    }

    // 2. Create Projects and Reviews
    // Freelancer 1: 50 projects, avg rating 4.8
    for (let i = 1; i <= 50; i++) {
        const projectId = `PROJ-VET-${i}`;
        await supabase.from('projects').upsert({
            project_id: projectId,
            assignee: 'Elite Veteran',
            status: 'Approved'
        });
        await supabase.from('project_reviews').upsert({
            project_id: projectId,
            reviewer_id: '00000000-0000-0000-0000-000000000000', // Mock Admin
            rating: 4.8,
            review_text: 'Consistent excellent work.'
        });
    }

    // Freelancer 2: 1 project, avg rating 5.0 (The "One Hit Wonder")
    await supabase.from('projects').upsert({
        project_id: 'PROJ-ONE-1',
        assignee: 'One Hit Wonder',
        status: 'Approved'
    });
    await supabase.from('project_reviews').upsert({
        project_id: 'PROJ-ONE-1',
        reviewer_id: '00000000-0000-0000-0000-000000000000',
        rating: 5.0,
        review_text: 'Amazing first job!'
    });

    // Freelancer 3: 15 projects, avg rating 4.9
    for (let i = 1; i <= 15; i++) {
        const projectId = `PROJ-STAR-${i}`;
        await supabase.from('projects').upsert({
            project_id: projectId,
            assignee: 'Active Rising Star',
            status: 'Approved'
        });
        await supabase.from('project_reviews').upsert({
            project_id: projectId,
            reviewer_id: '00000000-0000-0000-0000-000000000000',
            rating: 4.9,
            review_text: 'Great progress.'
        });
    }

    console.log('Seeding complete. Check the Algorithm Studio to see Bayesian rankings!');
}

seedVerificationData();
