/**
 * TrackCard Component
 * 
 * Displays a single tracked route with price info,
 * status badges, and action buttons.
 */

import { useState } from 'react';
import { trackAPI } from '../api';
import toast from 'react-hot-toast';
import { HiOutlineArrowRight, HiOutlineTrendingDown, HiOutlineTrendingUp, HiOutlineRefresh, HiOutlineTrash, HiOutlinePause, HiOutlineChartBar, HiOutlineClock } from 'react-icons/hi';
import { format } from 'date-fns';

export default function TrackCard({ track, onUpdate, onShowChart }) {
  const [loading, setLoading] = useState(false);

  const diff = track.currentPrice && track.lastPrice ? track.currentPrice - track.lastPrice : null;
  const isDropped = diff !== null && diff < 0;
  const isIncreased = diff !== null && diff > 0;

  const handleCheckNow = async () => {
    setLoading(true);
    try {
      await trackAPI.checkNow(track._id);
      toast.success('Price check completed!');
      onUpdate?.();
    } catch { toast.error('Price check failed.'); }
    finally { setLoading(false); }
  };

  const handleStop = async () => {
    try {
      await trackAPI.stop(track._id);
      toast.success('Tracking stopped.');
      onUpdate?.();
    } catch { toast.error('Failed to stop tracking.'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this tracking entry?')) return;
    try {
      await trackAPI.remove(track._id);
      toast.success('Tracking deleted.');
      onUpdate?.();
    } catch { toast.error('Failed to delete.'); }
  };

  const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  return (
    <div className={`glass-card p-5 animate-slide-up transition-all duration-300 hover:border-dark-600/50 ${!track.isActive ? 'opacity-60' : ''}`}>
      {/* Top row: route + status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 text-lg font-display font-bold text-white">
          <span>{capitalize(track.source)}</span>
          <HiOutlineArrowRight className="text-primary-400 text-sm" />
          <span>{capitalize(track.destination)}</span>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${track.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-dark-600/30 text-dark-400 border border-dark-600'}`}>
          {track.isActive ? '● Active' : '○ Stopped'}
        </span>
      </div>

      {/* Price display */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-dark-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-dark-400 mb-1">Current</p>
          <p className="text-xl font-bold text-white">{track.currentPrice ? `₹${track.currentPrice}` : '—'}</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-dark-400 mb-1">Previous</p>
          <p className="text-lg font-semibold text-dark-300">{track.lastPrice ? `₹${track.lastPrice}` : '—'}</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${isDropped ? 'bg-emerald-500/10 glow-green' : isIncreased ? 'bg-red-500/10 glow-red' : 'bg-dark-800/50'}`}>
          <p className="text-xs text-dark-400 mb-1">Change</p>
          {diff !== null ? (
            <div className="flex items-center justify-center gap-1">
              {isDropped ? <HiOutlineTrendingDown className="text-emerald-400" /> : <HiOutlineTrendingUp className="text-red-400" />}
              <span className={`text-lg font-bold ${isDropped ? 'text-emerald-400' : 'text-red-400'}`}>
                ₹{Math.abs(diff)}
              </span>
            </div>
          ) : <p className="text-lg font-semibold text-dark-500">—</p>}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-3 text-xs text-dark-400 mb-4">
        <span className="flex items-center gap-1">
          <HiOutlineClock className="text-sm" />
          {format(new Date(track.date), 'MMM dd, yyyy')}
        </span>
        {track.busName && <span className="bg-dark-700/50 px-2 py-0.5 rounded-md">{track.busName}</span>}
        {track.lastChecked && (
          <span>Checked {format(new Date(track.lastChecked), 'MMM dd, HH:mm')}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-dark-700/50">
        {track.isActive && (
          <button onClick={handleCheckNow} disabled={loading} className="flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            <HiOutlineRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            Check Now
          </button>
        )}
        <button onClick={() => onShowChart?.(track)} className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-all">
          <HiOutlineChartBar className="text-sm" /> Chart
        </button>
        {track.isActive && (
          <button onClick={handleStop} className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-all ml-auto">
            <HiOutlinePause className="text-sm" /> Stop
          </button>
        )}
        <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all">
          <HiOutlineTrash className="text-sm" />
        </button>
      </div>
    </div>
  );
}
