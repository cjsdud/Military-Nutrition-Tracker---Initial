// Vercel 서버리스 진입점: 모든 /api/* 요청을 Express 앱으로 위임.
// 파일 경로가 catch-all이라 req.url에 원래 경로(/api/units 등)가 유지됨.
module.exports = require('../server/index.js');
