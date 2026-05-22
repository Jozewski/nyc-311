// Consistent color palette used across all charts
export const BOROUGH_COLORS = {
  'BRONX':         '#4A90D9',
  'BROOKLYN':      '#E85D75',
  'MANHATTAN':     '#2ECC71',
  'QUEENS':        '#F5A623',
  'STATEN ISLAND': '#9B59B6',
};

export const BOROUGHS = Object.keys(BOROUGH_COLORS);

export const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// API base — matches Express server port
export const API_BASE = 'http://localhost:8000/api';