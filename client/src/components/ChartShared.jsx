export function LoadingSpinner({ message = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin mb-4" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorMessage({ error }) {
  return (
    <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg p-4 my-4 text-sm">
      <strong>Error:</strong> {error}
      <p className="mt-1 text-red-400 text-xs">
        Make sure the Express server is running on port 3001.
      </p>
    </div>
  );
}

export function ChartWrapper({ title, subtitle, children }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h2 className="text-white text-lg font-semibold mb-1">{title}</h2>
      {subtitle && <p className="text-slate-400 text-sm mb-6">{subtitle}</p>}
      {children}
    </div>
  );
}