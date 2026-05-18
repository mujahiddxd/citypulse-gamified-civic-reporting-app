require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Correct env var name used back here
);

async function seed() {
    console.log('Fetching a user to attribute complaints to...');
    const { data: users, error: userError } = await supabase.from('users').select('id').limit(1);
    if (userError || !users.length) {
        console.error('No users found in database. Please register a user first.');
        return;
    }

    const userId = users[0].id;

    console.log('Inserting multiple diverse complaints across Mumbai...');
    const sampleComplaints = [
        {
            user_id: userId, type: 'Garbage', severity: 'High',
            description: 'Massive illegal dumping site near the mangroves.',
            latitude: 19.0550, longitude: 72.8400, area_name: 'Bandra West, Mumbai',
            image_url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80',
            status: 'Approved'
        },
        {
            user_id: userId, type: 'Garbage', severity: 'High',
            description: 'Overflowing community bins spilling onto the main road.',
            latitude: 19.1136, longitude: 72.8697, area_name: 'Andheri East, Mumbai',
            image_url: 'https://images.unsplash.com/photo-1595278069441-2f29f95f4e5a?auto=format&fit=crop&w=600&q=80',
            status: 'Approved'
        },
        {
            user_id: userId, type: 'Garbage', severity: 'Medium',
            description: 'Plastic waste accumulated outside the railway station entrance.',
            latitude: 19.0178, longitude: 72.8431, area_name: 'Dadar West, Mumbai',
            image_url: null, status: 'Approved'
        },
        {
            user_id: userId, type: 'Garbage', severity: 'High',
            description: 'Piles of uncollected garbage blocking the market alleyway.',
            latitude: 18.9217, longitude: 72.8347, area_name: 'Colaba, Mumbai',
            image_url: null, status: 'Approved'
        },
        {
            user_id: userId, type: 'Garbage', severity: 'Medium',
            description: 'Improper disposal of commercial waste near the highway.',
            latitude: 19.1950, longitude: 72.9700, area_name: 'Thane West, Thane',
            image_url: null, status: 'Approved'
        },
        {
            user_id: userId, type: 'Garbage', severity: 'Low',
            description: 'Littering in the public park.',
            latitude: 19.0760, longitude: 72.8777, area_name: 'Kurla West, Mumbai',
            image_url: null, status: 'Approved'
        }
    ];

    const { error: gErr } = await supabase.from('complaints').insert(sampleComplaints);

    if (gErr) console.error('Error inserting complaints:', gErr);

    console.log('Seeding complete. Heatmap should now show multiple fiery markers.');
}

seed();
