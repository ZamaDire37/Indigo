require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { createSupabaseContext, withSupabase } = require('@supabase/server');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SECRET_KEY.includes('••')
  ? process.env.SUPABASE_SECRET_KEY
  : (process.env.SUPABASE_PUBLISHABLE_KEY || '');

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = {
  supabase,
  createSupabaseContext,
  withSupabase,
  supabaseUrl,
  supabaseKey
};
