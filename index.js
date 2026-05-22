const express = require('express');
const cors = require('cors');

const boroughFlareupsRouter  = require('./server/routes/boroughFlareups');
const seasonalTrendsRouter   = require('./server/routes/seasonalTrends');
const boroughComparisonRouter = require('./server/routes/boroughComparison');
const resolutionTimeRouter   = require('./server/routes/resolutionTime');
const summaryRouter = require('./server/routes/summary');

const app  = express();
const PORT = 8000;

// Allow requests from the Vite dev server
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/borough-flareups',   boroughFlareupsRouter);
app.use('/api/seasonal-trends',    seasonalTrendsRouter);
app.use('/api/borough-comparison', boroughComparisonRouter);
app.use('/api/resolution-time',    resolutionTimeRouter);
app.use('/api/summary', summaryRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`\n🗽 NYC 311 API running → http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});