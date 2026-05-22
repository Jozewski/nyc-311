import { useState } from 'react';
import Dashboard        from './components/Dashboard';
import BoroughFlareups   from './components/BoroughFlareups';
import SeasonalTrends    from './components/SeasonalTrends';
import BoroughComparison from './components/BoroughComparison';
import ResolutionTime    from './components/ResolutionTime';

const TABS = [
  { id: 'dashboard',  label: 'Overview',          icon: '🏙️', component: Dashboard },
  { id: 'flareups',   label: 'Borough Flare-ups',  icon: '🔥', component: BoroughFlareups },
  { id: 'trends',     label: 'Seasonal Trends',    icon: '📈', component: SeasonalTrends },
  { id: 'comparison', label: 'Borough Comparison', icon: '⚖️', component: BoroughComparison },
  { id: 'resolution', label: 'Resolution Time',    icon: '⏱️', component: ResolutionTime },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const active = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-white tracking-tight">
            🗽 NYC 311 Vibe Metrics
          </h1>
          <p className="text-slate-400 text-xs">Borough Flare-ups — 2023 Service Requests</p>
        </div>
      </header>

      <nav className="border-b border-slate-700 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                            whitespace-nowrap transition-colors shrink-0
                  ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {active && (
          active.id === 'dashboard'
            ? <Dashboard onNavigate={setActiveTab} />
            : <active.component />
        )}
      </main>
    </div>
  );
}