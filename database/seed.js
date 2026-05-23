require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../server/db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ 시드 데이터 삽입 완료');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ 시드 실패:', err);
  process.exit(1);
});
