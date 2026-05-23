const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '서버가 정상 작동 중입니다' });
});

// 부대 목록 (임시 데이터)
app.get('/api/units', (req, res) => {
  res.json([
    { id: 1, name: '제5322부대', code: 'UNIT001' }
  ]);
});

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});