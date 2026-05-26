require('dotenv').config();
const express = require('express');
const cors = require('cors');

const unitsRouter = require('./routes/units');
const foodsRouter = require('./routes/foods');
const mealsRouter = require('./routes/meals');
const soldiersRouter = require('./routes/soldiers');
const soldierLogsRouter = require('./routes/soldierLogs');
const statsRouter = require('./routes/stats');
const adminRouter = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
  });
});

app.use('/api/units', unitsRouter);
app.use('/api/foods', foodsRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/soldiers', soldiersRouter);
app.use('/api/soldier-logs', soldierLogsRouter);
app.use('/api/admin', adminRouter);
app.use('/api', statsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
  });
}

module.exports = app;
