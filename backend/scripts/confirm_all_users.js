require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) { console.error('Error:', error.message); return; }

    const unverified = users.filter(u => !u.email_confirmed_at);
    console.log(`Found ${unverified.length} unverified user(s): ${unverified.map(u => u.email).join(', ')}`);

    for (const u of unverified) {
        const { error: err } = await supabase.auth.admin.updateUserById(u.id, { email_confirm: true });
        if (err) {
            console.error(`  ❌ Failed to confirm ${u.email}: ${err.message}`);
        } else {
            console.log(`  ✅ Confirmed: ${u.email}`);
        }
    }

    console.log('\nDone! All users can now log in.');
}

main().then(() => process.exit(0));
