const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkOfficers() {
  const { data, error } = await supabase
    .from('users')
    .select('email, username, role');

  if (error) {
    console.log('Error fetching users:', error.message);
    return;
  }

  console.log('--- All Users in DB ---');
  data.forEach(u => {
    console.log(`Email: ${u.email} | Username: ${u.username} | Role: [${u.role}]`);
  });
}

checkOfficers();
