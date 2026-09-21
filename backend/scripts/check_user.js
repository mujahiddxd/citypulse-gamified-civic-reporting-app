require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    // Check users table
    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, email, role, created_at')
        .ilike('username', '%mujahid%');

    console.log('\n=== USERS TABLE (matching "mujahid") ===');
    if (error) console.error('Error:', error.message);
    else console.log(JSON.stringify(users, null, 2));

    // Also list ALL users
    const { data: allUsers } = await supabase
        .from('users')
        .select('id, username, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log('\n=== ALL USERS (latest 20) ===');
    console.log(JSON.stringify(allUsers?.map(u => ({ username: u.username, email: u.email, role: u.role })), null, 2));
}

main().then(() => process.exit(0));
