import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../hooks/useFetch';
import { API_BASE, BOROUGH_COLORS, BOROUGHS, MONTH_LABELS } from '../constants';
import { LoadingSpinner, ErrorMessage, ChartWrapper } from './ChartShared';

// Pivot flat rows [{month, borough, total}] into Recharts format:
// [{month: 1, monthLabel: 'Jan', BRONX: 45, BROOKLYN: 120, ...}]
function pivotByBorough(rows) {
  const byMonth = {};
  rows.forEach(({ month, borough, total }) => {
    if (!byMonth[month]) byMonth[month] = { month, monthLabel: MONTH_LABELS[month] };
    byMonth[month][borough] = total;
  });
  return Object.values(byMonth).sort((a, b) => a.month - b.month);
}

export default function SeasonalTrends() {
  const [selected, setSelected] = useState('');

  // Load complaint type list on mount
  const { data: meta, loading: metaLoading, error: metaError } =
    useFetch(`${API_BASE}/seasonal-trends`);

  // Load chart data only when a complaint type is selected
  const chartUrl = selected
    ? `${API_BASE}/seasonal-trends?complaint=${encodeURIComponent(selected)}`
    : null;
  const { data: rawRows, loading: chartLoading, error: chartError } = useFetch(chartUrl);

  const chartData = useMemo(() => {
    if (!rawRows) return [];
    return pivotByBorough(rawRows);
  }, [rawRows]);

  // Which boroughs actually have data for this complaint?
  const activeBoroughs = useMemo(() => {
    if (!rawRows) return [];
    return [...new Set(rawRows.map(r => r.borough))].filter(b => BOROUGHS.includes(b));
  }, [rawRows]);

  const loading = metaLoading || chartLoading;
  const error   = metaError   || chartError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Seasonal Trends</h1>
        <p className="text-slate-400 mt-1">
          Monthly complaint volume per borough. Select a complaint type to explore.
        </p>
      </div>

      {/* Complaint type selector */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Complaint type</label>
        {metaLoading ? (
          <p className="text-slate-500 text-sm">Loading complaint types...</p>
        ) : (
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2
                       text-sm w-full max-w-md focus:outline-none focus:border-blue-500"
          >
            <option value="">— Select a complaint type —</option>
            {meta?.complaintTypes?.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      </div>

      {error && <ErrorMessage error={error} />}
      {chartLoading && selected && <LoadingSpinner message="Loading trend data..." />}

      {!selected && !metaLoading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center text-slate-500">
          Select a complaint type above to see monthly trends across all boroughs.
        </div>
      )}

      {chartData.length > 0 && !chartLoading && (
        <ChartWrapper
          title={selected}
          subtitle="Monthly complaint count per borough across 2023"
        >
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={v => v.toLocaleString()}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                itemStyle={{ color: '#cbd5e1' }}
                formatter={(value, name) => [value.toLocaleString(), name]}
              />
              <Legend
                wrapperStyle={{ paddingTop: 20, fontSize: 12 }}
                formatter={name => <span style={{ color: BOROUGH_COLORS[name] }}>{name}</span>}
              />
              {activeBoroughs.map(borough => (
                <Line
                  key={borough}
                  type="monotone"
                  dataKey={borough}
                  stroke={BOROUGH_COLORS[borough]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: BOROUGH_COLORS[borough] }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      )}
    </div>
  );
}