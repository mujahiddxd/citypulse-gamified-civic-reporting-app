require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);

async function addColumns() {
    console.log('Adding columns...');
    // We can't run raw SQL via the client easily unless we have a function.
    // But we can check if they exist by trying to fetch them.
    const { data, error } = await supabase.from('users').select('*').limit(1).single();
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Existing columns:', Object.keys(data));
    }
}

addColumns();
