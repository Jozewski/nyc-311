const express = require('express');
const { getDb } = require('../../db');
 
const router = express.Router();
 
// GET /api/borough-flareups
// Returns the #1 complaint type per borough using ROW_NUMBER() OVER
router.get('/', (_req, res) => {
  const db = getDb();
 
  const query = `
    WITH ranked AS (
      SELECT
        borough,
        complaint_type,
        COUNT(*) AS total,
        ROW_NUMBER() OVER (
          PARTITION BY borough
          ORDER BY COUNT(*) DESC
        ) AS rank
      FROM service_requests
      WHERE borough     NOT IN ('Unspecified', 'N/A', '')
        AND borough     IS NOT NULL
        AND complaint_type IS NOT NULL
        AND complaint_type != ''
      GROUP BY borough, complaint_type
    )
    SELECT
      borough,
      complaint_type AS top_complaint,
      total
    FROM ranked
    WHERE rank = 1
    ORDER BY total DESC
  `;
 
  try {
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err) {
    console.error('/api/borough-flareups error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
 
module.exports = router;