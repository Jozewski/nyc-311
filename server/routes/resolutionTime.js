const express = require('express');
const { getDb } = require('../../db');

const router = express.Router();

const BOROUGHS = ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'];

// GET /api/resolution-time?borough=BRONX
// Returns average resolution hours per agency (optionally filtered by borough)
router.get('/', (req, res) => {
  const db = getDb();
  const { borough } = req.query;

  let query = `
    SELECT
      agency,
      agency_name,
      ROUND(AVG(resolution_hours), 1) AS avg_hours,
      COUNT(*) AS total_resolved
    FROM service_requests
    WHERE resolution_hours IS NOT NULL
      AND resolution_hours > 0
      AND resolution_hours < 9999
      AND borough NOT IN ('Unspecified', 'N/A', '')
      AND borough IS NOT NULL
  `;

  const params = [];
  if (borough && borough !== 'All') {
    query += ` AND borough = ?`;
    params.push(borough);
  }

  // Only include agencies with enough data to be meaningful
  query += `
    GROUP BY agency, agency_name
    HAVING total_resolved >= 30
    ORDER BY avg_hours DESC
    LIMIT 20
  `;

  try {
    const rows = db.prepare(query).all(...params);
    res.json({ rows, boroughs: BOROUGHS });
  } catch (err) {
    console.error('/api/resolution-time error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;