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

    console.log('Inserting Garbage Place complaint...');
    const { error: gErr } = await supabase.from('complaints').insert({
        user_id: userId,
        type: 'Garbage',
        severity: 'High',
        description: 'A large pile of uncollected garbage blocking the sidewalk.',
        latitude: 19.0760,
        longitude: 72.8777,
        area_name: 'Kurla West, Mumbai',
        image_url: null,
        status: 'Approved'
    });

    if (gErr) console.error('Error inserting garbage:', gErr);

    console.log('Seeding complete. Heatmap should now show both markers.');
}

seed();
