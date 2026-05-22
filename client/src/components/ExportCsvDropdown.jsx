import { useMemo, useState } from 'react';
import { API_BASE, BOROUGHS } from '../constants';

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function toCsv(rows) {
  if (!rows || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerRow = headers.join(',');
  const dataRows = rows
    .map(row => headers.map(header => escapeCsvValue(row[header])).join(','))
    .join('\n');

  return `${headerRow}\n${dataRows}\n`;
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function buildSummaryRows(data) {
  return [{
    totalRequests: data.totalRequests,
    topComplaint: data.topComplaint,
    topComplaintCount: data.topComplaintCount,
    fastestAgency: data.fastestAgency,
    fastestHours: data.fastestHours,
    slowestAgency: data.slowestAgency,
    slowestHours: data.slowestHours,
    boroughCount: data.boroughCount,
    earliestCreatedDate: data.dateRange?.earliest,
    latestCreatedDate: data.dateRange?.latest,
  }];
}

export default function ExportCsvDropdown() {
  const [selectedDataset, setSelectedDataset] = useState('summary');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const datasetOptions = useMemo(() => {
    const resolutionOptions = [
      { id: 'resolution-all', label: 'Resolution Time - All Boroughs', filename: 'resolution_time_all.csv' },
      ...BOROUGHS.map(borough => ({
        id: `resolution-${borough.toLowerCase().replace(/\s+/g, '-')}`,
        label: `Resolution Time - ${borough}`,
        filename: `resolution_time_${borough.toLowerCase().replace(/\s+/g, '_')}.csv`,
        borough,
      })),
    ];

    return [
      { id: 'summary', label: 'Executive Summary', filename: 'summary.csv' },
      { id: 'borough-flareups', label: 'Borough Flare-ups', filename: 'borough_flareups.csv' },
      { id: 'borough-comparison', label: 'Borough Comparison (Top 8)', filename: 'borough_comparison_top_8.csv' },
      { id: 'seasonal-top-complaint', label: 'Seasonal Trends (Top Complaint)', filename: 'seasonal_trends_top_complaint.csv' },
      ...resolutionOptions,
    ];
  }, []);

  async function getDatasetRows(option) {
    if (option.id === 'summary') {
      const data = await fetchJson(`${API_BASE}/summary`);
      return buildSummaryRows(data);
    }

    if (option.id === 'borough-flareups') {
      return fetchJson(`${API_BASE}/borough-flareups`);
    }

    if (option.id === 'borough-comparison') {
      const data = await fetchJson(`${API_BASE}/borough-comparison?top=8`);
      return data.rows || [];
    }

    if (option.id === 'seasonal-top-complaint') {
      const summary = await fetchJson(`${API_BASE}/summary`);
      const complaint = summary.topComplaint;
      const rows = await fetchJson(`${API_BASE}/seasonal-trends?complaint=${encodeURIComponent(complaint)}`);
      return rows.map(row => ({ complaint_type: complaint, ...row }));
    }

    if (option.id.startsWith('resolution-')) {
      const borough = option.borough || 'All';
      const data = await fetchJson(`${API_BASE}/resolution-time?borough=${encodeURIComponent(borough)}`);
      return data.rows || [];
    }

    return [];
  }

  async function onExport() {
    const selected = datasetOptions.find(option => option.id === selectedDataset);
    if (!selected) return;

    setDownloading(true);
    setError('');

    try {
      const rows = await getDatasetRows(selected);
      if (!rows.length) {
        throw new Error('No rows returned for the selected dataset.');
      }

      const csv = toCsv(rows);
      downloadCsv(selected.filename, csv);
    } catch (err) {
      setError(err.message || 'Export failed.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <select
          value={selectedDataset}
          onChange={event => setSelectedDataset(event.target.value)}
          className="bg-slate-800 border border-slate-600 text-slate-100 text-sm rounded-lg px-3 py-2 w-full sm:w-72"
          aria-label="Choose a dataset to export"
        >
          {datasetOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={onExport}
          disabled={downloading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          {downloading ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
