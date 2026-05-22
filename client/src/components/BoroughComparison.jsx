import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../hooks/useFetch';
import { API_BASE, BOROUGH_COLORS, BOROUGHS } from '../constants';
import { LoadingSpinner, ErrorMessage, ChartWrapper } from './ChartShared';

// Pivot flat rows into format Recharts grouped bar chart expects:
// [{ complaint_type: 'Noise - Residential', BRONX: 45, BROOKLYN: 120, ... }]
function pivotByComplaint(rows, topTypes) {
  const byType = {};
  topTypes.forEach(type => { byType[type] = { complaint_type: type }; });

  rows.forEach(({ borough, complaint_type, total }) => {
    if (byType[complaint_type]) {
      byType[complaint_type][borough] = total;
    }
  });

  return Object.values(byType);
}

// Shorten long complaint labels for the X axis
function shortLabel(label) {
  const map = {
    'Noise - Residential':         'Noise (Res)',
    'HEAT/HOT WATER':              'Heat/H2O',
    'Blocked Driveway':            'Blk Drvwy',
    'Illegal Parking':             'Ill. Parking',
    'Street Light Condition':      'St. Light',
    'UNSANITARY CONDITION':        'Unsanitary',
    'Request Large Bulky Item Pickup': 'Bulk Pickup',
    'Noise - Street/Sidewalk':     'Noise (St)',
    'PAINT/PLASTER':               'Paint/Plstr',
    'Rodent':                      'Rodent',
  };
  return map[label] || (label.length > 12 ? label.slice(0, 11) + '…' : label);
}

export default function BoroughComparison() {
  const [top, setTop] = useState(8);
  const { data, loading, error } = useFetch(`${API_BASE}/borough-comparison?top=${top}`);

  const chartData = useMemo(() => {
    if (!data) return [];
    return pivotByComplaint(data.rows, data.topTypes);
  }, [data]);

  const activeBoroughs = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.rows.map(r => r.borough))].filter(b => BOROUGHS.includes(b));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Borough Comparison</h1>
          <p className="text-slate-400 mt-1">
            Side-by-side complaint counts across all boroughs for the top complaint types.
          </p>
        </div>

        {/* Top N control */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-slate-400 text-sm">Show top</label>
          {[5, 8, 10].map(n => (
            <button
              key={n}
              onClick={() => setTop(n)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${top === n
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {n}
            </button>
          ))}
          <span className="text-slate-400 text-sm">complaint types</span>
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error   && <ErrorMessage error={error} />}

      {chartData.length > 0 && !loading && (
        <ChartWrapper
          title="Complaint Type vs Borough"
          subtitle="Each group of bars = one complaint type, each bar = one borough"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="complaint_type"
                tickFormatter={shortLabel}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={v => v.toLocaleString()}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                itemStyle={{ color: '#cbd5e1' }}
                formatter={(value, name) => [value?.toLocaleString() ?? 0, name]}
              />
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                formatter={name => <span style={{ color: BOROUGH_COLORS[name] }}>{name}</span>}
              />
              {activeBoroughs.map(borough => (
                <Bar
                  key={borough}
                  dataKey={borough}
                  fill={BOROUGH_COLORS[borough]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      )}
    </div>
  );
}