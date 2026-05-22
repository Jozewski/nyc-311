import { useFetch } from '../hooks/useFetch';
import { API_BASE  } from '../constants';
import { LoadingSpinner, ErrorMessage } from './ChartShared';

// Stat card used in the metrics strip
function StatCard({ label, value, sub, accent = "text-blue-400" }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-1">
      <p className="text-slate-400 text-xs uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs leading-snug">{sub}</p>}
    </div>
  );
}

// Feature card in the "what you can explore" section
function FeatureCard({ icon, title, desc, tab, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(tab)}
      className="bg-slate-800 border border-slate-700 hover:border-blue-500
                 rounded-xl p-5 text-left transition-all group w-full"
    >
      <div className="text-2xl mb-3">{icon}</div>
      <p className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">
        {title}
      </p>
      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{desc}</p>
      <p className="text-blue-500 text-xs mt-3 group-hover:text-blue-400">
        Explore →
      </p>
    </button>
  );
}

export default function Dashboard({ onNavigate }) {
  const { data, loading, error } = useFetch(`${API_BASE}/summary`);

  return (
    <div className="space-y-10">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-slate-700">
        <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-8 py-10">
          <div className="flex items-start gap-4">
            <span className="text-5xl">🗽</span>
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">
                NYC 311 Vibe Metrics
              </h1>
              <p className="text-blue-400 text-sm font-medium mt-1 uppercase tracking-widest">
                Borough Flare-ups — 2023 Service Requests
              </p>
            </div>
          </div>

          <p className="text-slate-300 text-base mt-6 max-w-2xl leading-relaxed">
            New Yorkers file 311 complaints every time something goes wrong in their city —
            a broken streetlight, a noise complaint at 2am, no heat in January.
            This tool maps <span className="text-white font-semibold">25,000 of those requests</span> across
            all five boroughs so you can see exactly where issues are concentrated,
            which agencies respond fastest, and how complaint patterns shift across seasons.
          </p>

          <p className="text-slate-400 text-sm mt-4 max-w-xl leading-relaxed">
            Built for community advocates, urban planners, and data analysts who need
            clear evidence of where city resources are needed most.
          </p>
        </div>

        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500" />
      </div>

      {/* ── Live Stats ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-4">
          Dataset at a glance
        </h2>

        {loading && <LoadingSpinner message="Loading stats..." />}
        {error   && <ErrorMessage error={error} />}

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Total Requests"
              value={data.totalRequests.toLocaleString()}
              sub="service requests filed in 2023"
              accent="text-blue-400"
            />
            <StatCard
              label="Boroughs Tracked"
              value={data.boroughCount}
              sub="Manhattan, Brooklyn, Bronx, Queens, Staten Island"
              accent="text-purple-400"
            />
            <StatCard
              label="Top Complaint"
              value={data.topComplaintCount.toLocaleString()}
              sub={data.topComplaint}
              accent="text-orange-400"
            />
            <StatCard
              label="Top Complaint Type"
              value={data.topComplaint.split(' ').slice(0, 2).join(' ')}
              sub="highest volume citywide"
              accent="text-yellow-400"
            />
            <StatCard
              label="Fastest Agency"
              value={`${data.fastestHours}h`}
              sub={data.fastestAgency}
              accent="text-emerald-400"
            />
            <StatCard
              label="Slowest Agency"
              value={`${data.slowestHours}h`}
              sub={data.slowestAgency}
              accent="text-red-400"
            />
          </div>
        )}
      </div>

      {/* ── What you can explore ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-4">
          What you can explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            icon="🔥"
            title="Borough Flare-ups"
            desc="Find the single biggest issue in each borough using a window ranking function. See which complaints dominate where."
            tab="flareups"
            onNavigate={onNavigate}
          />
          <FeatureCard
            icon="📈"
            title="Seasonal Trends"
            desc="Track how complaint volume shifts month by month. Spot whether heating complaints spike in winter or noise peaks in summer."
            tab="trends"
            onNavigate={onNavigate}
          />
          <FeatureCard
            icon="⚖️"
            title="Borough Comparison"
            desc="Compare complaint volumes side by side across all five boroughs for the city's most common issues."
            tab="comparison"
            onNavigate={onNavigate}
          />
          <FeatureCard
            icon="⏱️"
            title="Resolution Time"
            desc="See which city agencies respond fastest and slowest. Filter by borough to check if response speed varies by location."
            tab="resolution"
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <p className="text-slate-600 text-xs text-center pb-4">
        Data source: NYC Open Data — 311 Service Requests 2023 · 25,000 row sample
      </p>

    </div>
  );
}