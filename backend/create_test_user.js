require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    try {
        console.log("Creating bypass_user@citypulse.com...");
        const { data, error } = await supabase.auth.admin.createUser({
            email: "bypass_user" + Math.floor(Math.random() * 1000) + "@citypulse.com",
            password: "Password123!",
            email_confirm: true,
            user_metadata: { username: "BypassUser" }
        });
        
        if (error) {
            console.error("Error creating user:", error);
            // Let's try to see if it's the trigger crashing
            return;
        }
        console.log("Success! user:", data.user.email);
    } catch (e) {
        console.error(e);
    }
}
main();
