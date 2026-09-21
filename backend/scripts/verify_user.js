require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    const email = 'mujahidchoudhry37@gmail.com';

    // Check auth user status via admin API
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) { console.error('Error listing users:', error.message); return; }

    const authUser = users.find(u => u.email === email);
    if (!authUser) {
        console.log(`❌ No Supabase auth account found for ${email}`);
        return;
    }

    console.log('\n=== Auth User Status ===');
    console.log(`  ID:              ${authUser.id}`);
    console.log(`  Email:           ${authUser.email}`);
    console.log(`  Email confirmed: ${authUser.email_confirmed_at ? '✅ YES - ' + authUser.email_confirmed_at : '❌ NO - not verified'}`);
    console.log(`  Last sign in:    ${authUser.last_sign_in_at || 'Never'}`);
    console.log(`  Created:         ${authUser.created_at}`);
    console.log(`  Banned:          ${authUser.banned_until ? '⛔ YES until ' + authUser.banned_until : 'No'}`);

    if (!authUser.email_confirmed_at) {
        console.log('\n⚡ Forcing email confirmation now...');
        const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
            email_confirm: true
        });
        if (updateErr) {
            console.error('❌ Could not confirm email:', updateErr.message);
        } else {
            console.log('✅ Email confirmed! The user can now log in.');
        }
    }
}

main().then(() => process.exit(0));
