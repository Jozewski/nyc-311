const express = require('express');
const { getDb } = require('../../db');

const router = express.Router();

// GET /api/borough-comparison?top=8
// Returns complaint counts per borough for the top N complaint types
router.get('/', (req, res) => {
  const db = getDb();
  const top = Math.min(parseInt(req.query.top) || 8, 20); // cap at 20

  // Step 1: get the top N complaint types by overall volume
  const topTypes = db.prepare(`
    SELECT complaint_type
    FROM service_requests
    WHERE borough NOT IN ('Unspecified', 'N/A', '')
      AND borough IS NOT NULL
      AND complaint_type IS NOT NULL
      AND complaint_type != ''
    GROUP BY complaint_type
    ORDER BY COUNT(*) DESC
    LIMIT ?
  `).all(top).map(r => r.complaint_type);

  if (!topTypes.length) return res.json({ rows: [], topTypes: [] });

  // Step 2: for those types, get per-borough counts
  const placeholders = topTypes.map(() => '?').join(',');
  const query = `
    SELECT borough, complaint_type, COUNT(*) AS total
    FROM service_requests
    WHERE complaint_type IN (${placeholders})
      AND borough NOT IN ('Unspecified', 'N/A', '')
      AND borough IS NOT NULL
    GROUP BY borough, complaint_type
    ORDER BY borough, total DESC
  `;

  try {
    const rows = db.prepare(query).all(...topTypes);
    res.json({ rows, topTypes });
  } catch (err) {
    console.error('/api/borough-comparison error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;