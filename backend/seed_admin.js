require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAdmin() {
    const adminEmail = 'admin@citypulse.com';
    const adminPassword = 'AdminPass123!';

    console.log(`⏳ Attempting to create static admin account: ${adminEmail}...`);

    try {
        // 1. Create the user using Supabase Admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: { username: 'SuperAdmin' }
        });

        if (authError) {
            if (authError.message.includes("already registered") || authError.code === 'email_exists') {
                console.log(`⚠️  User ${adminEmail} already exists in Auth. Ensuring profile exists and role is 'admin'...`);

                // Find the user via the Admin API
                const { data: listData } = await supabase.auth.admin.listUsers();
                const existingAuthUser = listData?.users?.find(u => u.email === adminEmail);

                if (existingAuthUser) {
                    // Ensure user row exists in public.users (may have been deleted during reset)
                    const { data: existingProfile } = await supabase.from('users').select('id').eq('id', existingAuthUser.id).single();

                    if (!existingProfile) {
                        console.log('⏳ Profile missing in public.users, inserting...');
                        const { error: insertError } = await supabase.from('users').insert({
                            id: existingAuthUser.id,
                            email: adminEmail,
                            username: 'SuperAdmin',
                            role: 'admin'
                        });
                        if (insertError) console.error('Insert error:', insertError.message);
                        else console.log("✅ Admin profile inserted into public.users.");
                    } else {
                        const { error: updateError } = await supabase.from('users').update({ role: 'admin' }).eq('id', existingAuthUser.id);
                        if (updateError) console.error('Update error:', updateError.message);
                        else console.log("✅ Existing user role ensured to be 'admin'.");
                    }
                } else {
                    console.error('❌ Could not find existing auth user via admin API.');
                }
                process.exit(0);
            } else {
                throw authError;
            }
        }

        const userId = authData.user.id;

        console.log(`✅ Base Auth User created. Waiting for trigger to populate public.users...`);
        // Wait for the trigger to insert into public.users
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Update their role to admin
        const { error: roleError } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', userId);

        if (roleError) {
            console.error("❌ Failed to set admin role in public.users table.", roleError);
            process.exit(1);
        }

        console.log(`\n🎉 Success! Static Admin generated.`);
        console.log(`Email:    ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log(`Role:     admin`);

    } catch (err) {
        console.error("❌ Fatal Error:", err);
    }
}

seedAdmin();
