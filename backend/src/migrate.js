const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { initDb, getPool } = require('./lib/db');

async function run() {
  await initDb();
  const pool = getPool();
  const sql = fs.readFileSync(path.join(__dirname,'../migrations/schema.sql')).toString();
  await pool.query(sql);
  console.log('Migration executed');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

