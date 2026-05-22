import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../hooks/useFetch';
import { API_BASE } from '../constants';
import { LoadingSpinner, ErrorMessage, ChartWrapper } from './ChartShared';

const BOROUGHS_ALL = ['All', 'BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'];

// Color scale: faster = green, slower = red (relative to dataset max)
function resolutionColor(hours, max) {
  const ratio = hours / max;
  if (ratio < 0.25) return '#2ecc71';
  if (ratio < 0.5)  return '#f1c40f';
  if (ratio < 0.75) return '#e67e22';
  return '#e74c3c';
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm shadow-xl max-w-xs">
      <p className="text-white font-semibold">{d.agency_name}</p>
      <p className="text-slate-400 font-mono text-xs mt-0.5">{d.agency}</p>
      <p className="text-yellow-300 mt-2 font-mono">{d.avg_hours}h avg resolution</p>
      <p className="text-slate-400 text-xs mt-1">{d.total_resolved.toLocaleString()} resolved requests</p>
    </div>
  );
};

export default function ResolutionTime() {
  const [borough, setBorough] = useState('All');
  const url = `${API_BASE}/resolution-time${borough !== 'All' ? `?borough=${encodeURIComponent(borough)}` : ''}`;
  const { data, loading, error } = useFetch(url);

  const rows = data?.rows ?? [];
  const maxHours = rows.length ? Math.max(...rows.map(r => r.avg_hours)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Resolution Time by Agency</h1>
          <p className="text-slate-400 mt-1">
            Average hours to resolve a complaint — color-coded fastest to slowest.
          </p>
        </div>

        {/* Borough filter */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {BOROUGHS_ALL.map(b => (
            <button
              key={b}
              onClick={() => setBorough(b)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${borough === b
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error   && <ErrorMessage error={error} />}

      {rows.length > 0 && !loading && (
        <>
          {/* Fastest / Slowest callouts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-emerald-800">
              <p className="text-emerald-400 text-xs uppercase tracking-wide mb-1">Fastest</p>
              <p className="text-white font-semibold">{rows[rows.length - 1]?.agency_name}</p>
              <p className="text-emerald-400 font-mono text-2xl font-bold mt-1">
                {rows[rows.length - 1]?.avg_hours}h
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-red-800">
              <p className="text-red-400 text-xs uppercase tracking-wide mb-1">Slowest</p>
              <p className="text-white font-semibold">{rows[0]?.agency_name}</p>
              <p className="text-red-400 font-mono text-2xl font-bold mt-1">
                {rows[0]?.avg_hours}h
              </p>
            </div>
          </div>

          <ChartWrapper
            title="Average Resolution Hours per Agency"
            subtitle="Agencies with fewer than 30 resolved requests excluded"
          >
            <ResponsiveContainer width="100%" height={Math.max(300, rows.length * 36)}>
              <BarChart
                data={[...rows].reverse()}
                layout="vertical"
                margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={v => `${v}h`}
                />
                <YAxis
                  dataKey="agency"
                  type="category"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="avg_hours" radius={[0, 4, 4, 0]}>
                  {[...rows].reverse().map(row => (
                    <Cell key={row.agency} fill={resolutionColor(row.avg_hours, maxHours)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </>
      )}
    </div>
  );
}