/**
 * BusResults Component
 * 
 * Displays real-time bus search results with fares,
 * bus type, departure time, and a "Track" button.
 */

import { HiOutlineStar, HiOutlineClock, HiOutlineTicket, HiOutlineBell } from 'react-icons/hi';
import { FaBus } from 'react-icons/fa';

export default function BusResults({ results, searchInfo, onTrackBus }) {
  if (!results || results.length === 0) return null;

  const capitalize = s => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';

  const sortedResults = [...results].sort((a, b) => a.price - b.price);

  return (
    <div className="animate-slide-up">
      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-white">
            {capitalize(searchInfo.source)} → {capitalize(searchInfo.destination)}
          </h2>
          <p className="text-sm text-dark-400">
            {results.length} buses found • Lowest fare: <span className="text-emerald-400 font-semibold">₹{searchInfo.lowestPrice || sortedResults[0]?.price}</span>
          </p>
        </div>
        {searchInfo.searchUrl && (
          <a href={searchInfo.searchUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary-400 hover:text-primary-300 bg-primary-500/10 px-3 py-1.5 rounded-lg transition-all">
            View on AbhiBus ↗
          </a>
        )}
      </div>

      {/* Bus list */}
      <div className="space-y-3">
        {sortedResults.map((bus, i) => (
          <div key={`${bus.name}-${bus.price}-${i}`}
            className="glass-card p-4 flex items-center gap-4 hover:border-dark-600/50 transition-all group"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Bus icon */}
            <div className="w-10 h-10 rounded-xl bg-dark-700/50 flex items-center justify-center shrink-0">
              <FaBus className="text-primary-400" />
            </div>

            {/* Bus info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{bus.name || 'Unknown Operator'}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {bus.busType && (
                  <span className="text-[11px] bg-primary-500/10 text-primary-300 px-2 py-0.5 rounded-md">
                    {bus.busType}
                  </span>
                )}
                {bus.departure && (
                  <span className="text-[11px] text-dark-400 flex items-center gap-1">
                    <HiOutlineClock className="text-xs" /> {bus.departure}
                  </span>
                )}
                {bus.rating && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-0.5">
                    <HiOutlineStar className="text-xs" /> {bus.rating}
                  </span>
                )}
                {bus.seats && (
                  <span className="text-[11px] text-dark-400 flex items-center gap-1">
                    <HiOutlineTicket className="text-xs" /> {bus.seats} seats
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1.5">
                {bus.originalPrice && bus.originalPrice > bus.price && (
                  <span className="text-xs text-dark-500 line-through">₹{bus.originalPrice}</span>
                )}
                <span className="text-xl font-bold text-white">₹{bus.price}</span>
              </div>
              {bus.discount && bus.discount > 0 && (
                <p className="text-[11px] text-emerald-400 font-medium">Save ₹{bus.discount}</p>
              )}
            </div>

            {/* Track button */}
            <button
              onClick={() => onTrackBus?.(bus)}
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg transition-all opacity-70 group-hover:opacity-100"
              title="Track this bus for price drops"
            >
              <HiOutlineBell className="text-sm" />
              Track
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
