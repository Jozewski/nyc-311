const express = require('express');
const { getDb } = require('../../db');

const router = express.Router();

// GET /api/seasonal-trends
//   No params  → returns list of available complaint types for the dropdown
//   ?complaint= → returns monthly counts per borough for that complaint type
router.get('/', (req, res) => {
  const db = getDb();
  const { complaint } = req.query;

  // No filter — return available complaint types for the UI dropdown
  if (!complaint) {
    const types = db.prepare(`
      SELECT DISTINCT complaint_type
      FROM service_requests
      WHERE complaint_type IS NOT NULL
        AND complaint_type != ''
      ORDER BY complaint_type
    `).all();

    return res.json({ complaintTypes: types.map(r => r.complaint_type) });
  }

  // Monthly counts per borough for the selected complaint type
  const query = `
    SELECT
      created_month AS month,
      borough,
      COUNT(*) AS total
    FROM service_requests
    WHERE complaint_type = ?
      AND borough NOT IN ('Unspecified', 'N/A', '')
      AND borough IS NOT NULL
      AND created_month IS NOT NULL
    GROUP BY created_month, borough
    ORDER BY created_month, borough
  `;

  try {
    const rows = db.prepare(query).all(complaint);
    res.json(rows);
  } catch (err) {
    console.error('/api/seasonal-trends error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;