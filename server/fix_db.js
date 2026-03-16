const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:CfN$Nc8jPfhuZkx@db.fbcmldzculgqddmnepxw.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query(`ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;`);
    console.log('Constraint dropped');
    await client.query(`ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'archived'));`);
    console.log('Constraint added. DB fixed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

run();
