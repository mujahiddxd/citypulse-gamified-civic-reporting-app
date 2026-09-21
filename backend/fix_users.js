// Quick script to check auth users and fix the user account
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAndFix() {
    console.log('📋 Listing all Supabase Auth users...\n');

    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error listing users:', listError.message);
        return;
    }

    const users = listData?.users || [];
    console.log(`Found ${users.length} auth users:\n`);

    for (const u of users) {
        console.log(`  📧 ${u.email} | Confirmed: ${u.email_confirmed_at ? '✅ YES' : '❌ NO'} | ID: ${u.id}`);

        // Check if they have a public.users row
        const { data: profile } = await supabase.from('users').select('id, username, role').eq('id', u.id).single();
        if (profile) {
            console.log(`     └─ Profile: ${profile.username} (${profile.role})`);
        } else {
            console.log(`     └─ ⚠️ NO profile in public.users! Creating one...`);
            const username = u.user_metadata?.username || u.email.split('@')[0];
            const role = u.email === 'admin@citypulse.com' ? 'admin' : 'user';
            const { error: insertErr } = await supabase.from('users').insert({
                id: u.id,
                email: u.email,
                username: username,
                role: role
            });
            if (insertErr) {
                console.log(`     └─ ❌ Insert failed: ${insertErr.message}`);
            } else {
                console.log(`     └─ ✅ Created profile: ${username} (${role})`);
            }
        }

        // Auto-confirm email if not confirmed
        if (!u.email_confirmed_at) {
            console.log(`     └─ 🔧 Confirming email for ${u.email}...`);
            const { error: updateErr } = await supabase.auth.admin.updateUserById(u.id, {
                email_confirm: true
            });
            if (updateErr) {
                console.log(`     └─ ❌ Confirm failed: ${updateErr.message}`);
            } else {
                console.log(`     └─ ✅ Email confirmed!`);
            }
        }
    }

    // Check if the user's specific email exists
    const targetEmail = 'mujahidchoudhry37@gmail.com';
    const found = users.find(u => u.email === targetEmail);
    if (!found) {
        console.log(`\n⚠️ ${targetEmail} NOT FOUND in Auth! Creating account...`);
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email: targetEmail,
            password: 'Mujahidsaba@123',
            email_confirm: true,
            user_metadata: { username: 'mujahidchoudhry37' }
        });
        if (createErr) {
            console.log(`❌ Create failed: ${createErr.message}`);
        } else {
            console.log(`✅ Account created for ${targetEmail}!`);
            // Also insert into public.users
            const { error: profileErr } = await supabase.from('users').insert({
                id: newUser.user.id,
                email: targetEmail,
                username: 'mujahidchoudhry37',
                role: 'user'
            });
            if (profileErr) console.log(`⚠️ Profile insert: ${profileErr.message}`);
            else console.log(`✅ Profile created in public.users!`);
        }
    } else {
        console.log(`\n✅ ${targetEmail} exists in Auth.`);
    }

    console.log('\n🏁 Done!');
}

checkAndFix();
