// Vercel 서버리스 진입점.
// rewrite로 /api/* 가 이 파일로 들어오며, req.url에는 원래 경로(/api/units 등)가
// 유지되어 Express 앱의 /api/* 라우트가 그대로 매칭된다.
module.exports = require('../server/index.js');
