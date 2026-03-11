const { createClient } = require('@supabase/supabase-js');

const supabaseUrl  = process.env.SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw new Error(`Supabase connection failed: ${error.message}`);
    return true;
}

module.exports = { supabase, testConnection };
