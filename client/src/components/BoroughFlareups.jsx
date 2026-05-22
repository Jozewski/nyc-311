import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../hooks/useFetch';
import { API_BASE, BOROUGH_COLORS } from '../constants';
import { LoadingSpinner, ErrorMessage, ChartWrapper } from './ChartShared';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-white font-semibold">{d.borough}</p>
      <p className="text-slate-300 mt-1">{d.top_complaint}</p>
      <p className="text-blue-400 font-mono mt-1">{d.total.toLocaleString()} complaints</p>
    </div>
  );
};

export default function BoroughFlareups() {
  const { data, loading, error } = useFetch(`${API_BASE}/borough-flareups`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Borough Flare-ups</h1>
        <p className="text-slate-400 mt-1">
          The single highest-volume complaint type per borough — identified with a window function.
        </p>
      </div>

      {loading && <LoadingSpinner />}
      {error   && <ErrorMessage error={error} />}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {data.map(row => (
              <div
                key={row.borough}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                style={{ borderLeftColor: BOROUGH_COLORS[row.borough], borderLeftWidth: 4 }}
              >
                <p className="text-xs text-slate-400 uppercase tracking-wide">{row.borough}</p>
                <p className="text-white text-sm font-semibold mt-1 leading-snug">
                  {row.top_complaint}
                </p>
                <p className="text-2xl font-mono font-bold mt-2"
                   style={{ color: BOROUGH_COLORS[row.borough] }}>
                  {row.total.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <ChartWrapper
            title="Top Complaint Volume by Borough"
            subtitle="Horizontal bars — hover for complaint type"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={v => v.toLocaleString()}
                />
                <YAxis
                  dataKey="borough"
                  type="category"
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {data.map(row => (
                    <Cell key={row.borough} fill={BOROUGH_COLORS[row.borough]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* Data table */}
          <ChartWrapper title="Raw Results">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-2 pr-4">Borough</th>
                  <th className="pb-2 pr-4">Top Complaint</th>
                  <th className="pb-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.borough} className="border-b border-slate-700/50">
                    <td className="py-2 pr-4 font-medium"
                        style={{ color: BOROUGH_COLORS[row.borough] }}>
                      {row.borough}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{row.top_complaint}</td>
                    <td className="py-2 text-right font-mono text-slate-200">
                      {row.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartWrapper>
        </>
      )}
    </div>
  );
}