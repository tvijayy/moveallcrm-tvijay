require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkJobs() {
    const today = new Date().toISOString().split('T')[0];
    let q = supabase.from('jobs').select('*', { count: 'exact' });
    
    // Simulate what controllers are doing
    q = q.or(`move_date.gte.${today},move_date.is.null`).neq('status', 'completed');
    q = q.order('move_date', { ascending: false });

    const { data, error, count } = await q;
    
    if (error) {
        console.error('Error fetching jobs:', error);
    } else {
        console.log(`Count: ${count}`);
        console.table(data.map(d => ({ id: d.id, name: d.first_name, date: d.move_date, status: d.status })));
    }
}

checkJobs();
