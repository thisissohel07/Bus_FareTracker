/**
 * PriceChart Component
 * 
 * Renders a price history line chart using Chart.js.
 * Displays in a modal overlay with glassmorphism.
 */

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { trackAPI } from '../api';
import { format } from 'date-fns';
import { HiOutlineX } from 'react-icons/hi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function PriceChart({ track, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await trackAPI.getHistory(track._id);
        setHistory(res.data.data.history || []);
      } catch { setHistory([]); }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [track._id]);

  const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const chartData = {
    labels: history.map(h => format(new Date(h.recordedAt), 'MMM dd HH:mm')),
    datasets: [{
      label: 'Price (₹)',
      data: history.map(h => h.price),
      borderColor: '#818cf8',
      backgroundColor: 'rgba(129,140,248,0.1)',
      borderWidth: 2.5,
      pointBackgroundColor: '#818cf8',
      pointBorderColor: '#1e1b4b',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: true,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        callbacks: { label: ctx => `₹${ctx.parsed.y}` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 45 } },
      y: { grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => `₹${v}` } },
    },
    interaction: { intersect: false, mode: 'index' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card w-full max-w-3xl p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-display font-bold text-white">
              {capitalize(track.source)} → {capitalize(track.destination)}
            </h3>
            <p className="text-sm text-dark-400">Price History</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center text-dark-400 hover:text-white transition-all">
            <HiOutlineX />
          </button>
        </div>
        <div className="h-80">
          {loading ? (
            <div className="h-full flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"/></div>
          ) : history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-dark-400">No price history yet. Check back after the first price scan.</div>
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>
        {history.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-dark-700/50">
            <div className="text-center"><p className="text-xs text-dark-400">Lowest</p><p className="text-lg font-bold text-emerald-400">₹{Math.min(...history.map(h=>h.price))}</p></div>
            <div className="text-center"><p className="text-xs text-dark-400">Highest</p><p className="text-lg font-bold text-red-400">₹{Math.max(...history.map(h=>h.price))}</p></div>
            <div className="text-center"><p className="text-xs text-dark-400">Data Points</p><p className="text-lg font-bold text-primary-400">{history.length}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
