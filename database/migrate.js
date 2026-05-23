require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../server/db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ 스키마 적용 완료');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ 마이그레이션 실패:', err);
  process.exit(1);
});
