// Debug script to check Supabase data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wblumhrmsihjaruztlxf.supabase.co';
const supabaseKey = 'sb_publishable_OANejQqwHtL4mVZOUC96Lg_6GJKNTnY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSupabase() {
  console.log('=== SUPABASE DEBUG ===\n');

  // Check current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Current session:', session ? `User: ${session.user?.email}` : 'No session');
  if (sessionError) console.log('Session error:', sessionError);

  // List auth users (won't work with anon key)
  console.log('\n--- Attempting to read users_profile (will fail without auth) ---');
  const { data: profiles, error: profileError } = await supabase
    .from('users_profile')
    .select('*');

  console.log('Profiles:', profiles);
  console.log('Profile error:', profileError);

  // Check table structure
  console.log('\n--- Checking if we can see any data ---');

  const tables = ['users_profile', 'chat_conversations', 'playbook', 'activities'];
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    console.log(`${table}: count=${count}, error=${error?.message || 'none'}`);
  }

  console.log('\n=== To see actual data, you need to: ===');
  console.log('1. Open the Supabase dashboard at https://supabase.com/dashboard');
  console.log('2. Go to Table Editor');
  console.log('3. Check the users_profile table');
  console.log('4. Look for rows with your user ID');
}

debugSupabase().catch(console.error);
