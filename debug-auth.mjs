// Debug script to check Supabase data with authentication
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wblumhrmsihjaruztlxf.supabase.co';
const supabaseKey = 'sb_publishable_OANejQqwHtL4mVZOUC96Lg_6GJKNTnY';

const supabase = createClient(supabaseUrl, supabaseKey);

// You'll need to provide these values
const EMAIL = process.argv[2] || 'tenderomaxwell@gmail.com';
const PASSWORD = process.argv[3];

async function debugWithAuth() {
  if (!PASSWORD) {
    console.log('Usage: node debug-auth.mjs <email> <password>');
    console.log('');
    console.log('Or, check the Supabase dashboard directly:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Table Editor');
    console.log('4. Check the users_profile table');
    console.log('');
    console.log('Alternatively, open browser console on the working desktop app and run:');
    console.log('');
    console.log('// Get current user');
    console.log('const { data: { user } } = await window.__supabase.auth.getUser();');
    console.log('console.log("User ID:", user?.id);');
    console.log('');
    console.log('// Query profile');
    console.log('const { data } = await window.__supabase.from("users_profile").select("*").eq("id", user?.id);');
    console.log('console.log("Profile:", data);');
    return;
  }

  console.log(`=== Signing in as ${EMAIL} ===\n`);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });

  if (authError) {
    console.log('Auth error:', authError.message);
    return;
  }

  console.log('Signed in successfully!');
  console.log('User ID:', authData.user?.id);
  console.log('');

  // Now query with auth
  const userId = authData.user?.id;

  console.log('=== Querying users_profile ===');
  const { data: profiles, error: profileError } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', userId);

  if (profileError) {
    console.log('Profile query error:', profileError);
  } else if (profiles && profiles.length > 0) {
    console.log('Profile found:');
    console.log(JSON.stringify(profiles[0], null, 2));
  } else {
    console.log('*** NO PROFILE FOUND IN SUPABASE ***');
    console.log('This explains why mobile sees onboarding - the profile was never synced!');
  }

  console.log('\n=== Querying chat_conversations ===');
  const { data: chats, error: chatError } = await supabase
    .from('chat_conversations')
    .select('id, title, user_id')
    .eq('user_id', userId);

  console.log('Chats:', chats?.length || 0, 'found');
  if (chatError) console.log('Chat error:', chatError);

  console.log('\n=== Querying playbook ===');
  const { data: playbook, error: playbookError } = await supabase
    .from('playbook')
    .select('*')
    .eq('user_id', userId);

  console.log('Playbook:', playbook?.length || 0, 'found');
  if (playbookError) console.log('Playbook error:', playbookError);

  // Sign out
  await supabase.auth.signOut();
}

debugWithAuth().catch(console.error);
