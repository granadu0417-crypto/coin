import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TradingArena from './pages/TradingArena';
import History from './pages/History';

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '📊 대시보드', emoji: '📊' },
    { path: '/arena', label: '🎮 트레이딩 아레나', emoji: '🎮' },
    { path: '/history', label: '📈 히스토리', emoji: '📈' }
  ];

  return (
    <nav className="bg-slate-900/50 border-b border-slate-800">
      <div className="w-full max-w-[1800px] mx-auto px-6">
        <div className="flex gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-6 py-4 font-semibold text-sm transition-all ${
                  isActive
                    ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="mr-2">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/arena" element={<TradingArena />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
