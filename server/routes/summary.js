const express = require('express');
const { getDb } = require('../../db');

const router = express.Router();

// GET /api/summary
// Returns high-level stats for the dashboard landing view
router.get('/', (_req, res) => {
  const db = getDb();

  try {
    const totalRequests = db.prepare(`
      SELECT COUNT(*) AS total FROM service_requests
    `).get();

    const topComplaint = db.prepare(`
      SELECT complaint_type, COUNT(*) AS total
      FROM service_requests
      WHERE complaint_type IS NOT NULL AND complaint_type != ''
      GROUP BY complaint_type
      ORDER BY total DESC
      LIMIT 1
    `).get();

    const fastestAgency = db.prepare(`
      SELECT agency_name, ROUND(AVG(resolution_hours), 1) AS avg_hours
      FROM service_requests
      WHERE resolution_hours IS NOT NULL
        AND resolution_hours > 0
        AND resolution_hours < 9999
        AND agency_name IS NOT NULL
      GROUP BY agency_name
      HAVING COUNT(*) >= 30
      ORDER BY avg_hours ASC
      LIMIT 1
    `).get();

    const slowestAgency = db.prepare(`
      SELECT agency_name, ROUND(AVG(resolution_hours), 1) AS avg_hours
      FROM service_requests
      WHERE resolution_hours IS NOT NULL
        AND resolution_hours > 0
        AND resolution_hours < 9999
        AND agency_name IS NOT NULL
      GROUP BY agency_name
      HAVING COUNT(*) >= 30
      ORDER BY avg_hours DESC
      LIMIT 1
    `).get();

    const boroughCount = db.prepare(`
      SELECT COUNT(DISTINCT borough) AS total
      FROM service_requests
      WHERE borough NOT IN ('Unspecified', 'N/A', '')
        AND borough IS NOT NULL
    `).get();

    const dateRange = db.prepare(`
      SELECT
        MIN(created_date) AS earliest,
        MAX(created_date) AS latest
      FROM service_requests
      WHERE created_date IS NOT NULL
    `).get();

    res.json({
      totalRequests:  totalRequests.total,
      topComplaint:   topComplaint.complaint_type,
      topComplaintCount: topComplaint.total,
      fastestAgency:  fastestAgency.agency_name,
      fastestHours:   fastestAgency.avg_hours,
      slowestAgency:  slowestAgency.agency_name,
      slowestHours:   slowestAgency.avg_hours,
      boroughCount:   boroughCount.total,
      dateRange,
    });
  } catch (err) {
    console.error('/api/summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;