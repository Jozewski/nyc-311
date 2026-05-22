const fs = require('fs');
const path = require('path');
const { getDb } = require('../db');

const BOROUGHS = ['All', 'BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function sanitizeFileToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return '';

  const columns = Object.keys(rows[0]);
  const header = columns.join(',');
  const body = rows.map(row => columns.map(col => escapeCsvValue(row[col])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

function writeCsv(filePath, rows) {
  const csv = rowsToCsv(rows);
  fs.writeFileSync(filePath, csv, 'utf8');
  console.log(`Wrote ${path.basename(filePath)} (${rows.length} rows)`);
}

function buildSummary(db) {
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
    SELECT MIN(created_date) AS earliest, MAX(created_date) AS latest
    FROM service_requests
    WHERE created_date IS NOT NULL
  `).get();

  return [
    {
      totalRequests: totalRequests.total,
      topComplaint: topComplaint ? topComplaint.complaint_type : '',
      topComplaintCount: topComplaint ? topComplaint.total : '',
      fastestAgency: fastestAgency ? fastestAgency.agency_name : '',
      fastestHours: fastestAgency ? fastestAgency.avg_hours : '',
      slowestAgency: slowestAgency ? slowestAgency.agency_name : '',
      slowestHours: slowestAgency ? slowestAgency.avg_hours : '',
      boroughCount: boroughCount.total,
      earliestCreatedDate: dateRange.earliest,
      latestCreatedDate: dateRange.latest,
    },
  ];
}

function buildBoroughFlareups(db) {
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
      WHERE borough NOT IN ('Unspecified', 'N/A', '')
        AND borough IS NOT NULL
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

  return db.prepare(query).all();
}

function getTopComplaintType(db) {
  const row = db.prepare(`
    SELECT complaint_type
    FROM service_requests
    WHERE complaint_type IS NOT NULL
      AND complaint_type != ''
    GROUP BY complaint_type
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `).get();

  return row ? row.complaint_type : null;
}

function buildSeasonalTrends(db, complaint) {
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

  return db.prepare(query).all(complaint).map(row => ({
    complaint_type: complaint,
    ...row,
  }));
}

function buildBoroughComparison(db, top = 8) {
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

  if (!topTypes.length) return [];

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

  return db.prepare(query).all(...topTypes);
}

function buildResolutionTime(db, borough) {
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

  query += `
    GROUP BY agency, agency_name
    HAVING total_resolved >= 30
    ORDER BY avg_hours DESC
    LIMIT 20
  `;

  return db.prepare(query).all(...params).map(row => ({
    borough,
    ...row,
  }));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPresentationSheet(db) {
  const rows = [];

  const summary = buildSummary(db)[0] || {};
  const flareups = buildBoroughFlareups(db);
  const comparison = buildBoroughComparison(db, 8);
  const resolutionAll = buildResolutionTime(db, 'All');
  const topComplaint = getTopComplaintType(db);
  const seasonal = topComplaint ? buildSeasonalTrends(db, topComplaint) : [];

  let order = 1;
  const addRow = (section, metric, value, detail = '', borough = '', source = '') => {
    rows.push({
      section,
      order: order++,
      metric,
      value,
      detail,
      borough,
      source,
    });
  };

  addRow('Executive Summary', 'Total 311 Requests', summary.totalRequests || '', '2023 sample size', 'All NYC', 'summary');
  addRow('Executive Summary', 'Top Complaint Type', summary.topComplaint || '', `Count: ${summary.topComplaintCount || ''}`, 'All NYC', 'summary');
  addRow('Executive Summary', 'Fastest Agency', summary.fastestAgency || '', `Avg resolution: ${summary.fastestHours || ''} hours`, 'All NYC', 'summary');
  addRow('Executive Summary', 'Slowest Agency', summary.slowestAgency || '', `Avg resolution: ${summary.slowestHours || ''} hours`, 'All NYC', 'summary');
  addRow('Executive Summary', 'Boroughs Tracked', summary.boroughCount || '', 'Coverage across all major boroughs', 'All NYC', 'summary');
  addRow('Executive Summary', 'Data Date Range', `${summary.earliestCreatedDate || ''} to ${summary.latestCreatedDate || ''}`, '', 'All NYC', 'summary');

  flareups.forEach((row, index) => {
    addRow(
      'Borough Flare-ups',
      `Top Complaint in ${row.borough}`,
      row.top_complaint,
      `Volume: ${row.total}`,
      row.borough,
      'borough_flareups'
    );
    if (index === 0) {
      addRow('Borough Flare-ups', 'Highest Borough Flare-up Overall', row.top_complaint, `${row.borough} (${row.total})`, row.borough, 'borough_flareups');
    }
  });

  const strongestByBorough = {};
  comparison.forEach(row => {
    if (!strongestByBorough[row.borough] || toNumber(row.total) > toNumber(strongestByBorough[row.borough].total)) {
      strongestByBorough[row.borough] = row;
    }
  });

  Object.keys(strongestByBorough).sort().forEach(borough => {
    const row = strongestByBorough[borough];
    addRow(
      'Cross-Borough Comparison',
      `Strongest Common Issue in ${borough}`,
      row.complaint_type,
      `Count: ${row.total}`,
      borough,
      'borough_comparison_top_8'
    );
  });

  resolutionAll.forEach((row, index) => {
    const label = index === 0
      ? 'Slowest Agency (Overall)'
      : index === resolutionAll.length - 1
        ? 'Fastest Agency (Overall)'
        : `Agency Resolution Benchmark ${index + 1}`;

    addRow(
      'Resolution Time',
      label,
      row.agency_name,
      `Avg hours: ${row.avg_hours}; Resolved: ${row.total_resolved}`,
      'All NYC',
      'resolution_time_all'
    );
  });

  const seasonalByMonth = {};
  seasonal.forEach(row => {
    const month = toNumber(row.month);
    seasonalByMonth[month] = (seasonalByMonth[month] || 0) + toNumber(row.total);
  });

  Object.keys(seasonalByMonth)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(month => {
      addRow(
        'Seasonality',
        `${topComplaint || 'Top complaint'} in ${MONTH_NAMES[month - 1] || month}`,
        seasonalByMonth[month],
        'Citywide monthly total',
        'All NYC',
        'seasonal_trends'
      );
    });

  return rows;
}

function main() {
  const db = getDb();
  const exportDir = path.join(__dirname, '..', 'exports');
  fs.mkdirSync(exportDir, { recursive: true });

  writeCsv(path.join(exportDir, 'summary.csv'), buildSummary(db));
  writeCsv(path.join(exportDir, 'borough_flareups.csv'), buildBoroughFlareups(db));
  writeCsv(path.join(exportDir, 'borough_comparison_top_8.csv'), buildBoroughComparison(db, 8));

  const topComplaint = getTopComplaintType(db);
  if (topComplaint) {
    const seasonalRows = buildSeasonalTrends(db, topComplaint);
    const seasonalName = `seasonal_trends_${sanitizeFileToken(topComplaint)}.csv`;
    writeCsv(path.join(exportDir, seasonalName), seasonalRows);
  }

  BOROUGHS.forEach(borough => {
    const fileName = `resolution_time_${sanitizeFileToken(borough)}.csv`;
    writeCsv(path.join(exportDir, fileName), buildResolutionTime(db, borough));
  });

  writeCsv(path.join(exportDir, 'presentation_sheet.csv'), buildPresentationSheet(db));

  console.log(`\nCSV exports available in: ${exportDir}`);
}

main();
