import { useState, useRef } from 'react';
import { searchAPI, trackAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineLocationMarker, HiOutlineSwitchHorizontal, HiOutlineCalendar, HiOutlineMail, HiOutlineTruck, HiOutlineSearch } from 'react-icons/hi';
import { FaBus } from 'react-icons/fa';

export default function TrackForm({ onTrackCreated, onSearchResults }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    source: '', destination: '', date: '', busName: '',
    userEmail: user?.email || '',
  });
  
  const [searching, setSearching] = useState(false);
  const [tracking, setTracking] = useState(false);
  
  const [srcHints, setSrcHints] = useState([]);
  const [dstHints, setDstHints] = useState([]);
  const [srcLoading, setSrcLoading] = useState(false);
  const [dstLoading, setDstLoading] = useState(false);
  const [srcFocused, setSrcFocused] = useState(false);
  const [dstFocused, setDstFocused] = useState(false);
  
  const srcTimer = useRef(null);
  const dstTimer = useRef(null);

  const tomorrow = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Live city search with debounce
  const fetchCities = async (query, setter, setLoading) => {
    if (!query || query.length < 2) { 
      setter([]); 
      setLoading(false);
      return; 
    }
    
    setLoading(true);
    try {
      const res = await searchAPI.searchCities(query);
      setter(res.data.data.cities || []);
    } catch {
      setter([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));

    // Debounced city search
    if (name === 'source') {
      clearTimeout(srcTimer.current);
      if (value.length >= 2) setSrcLoading(true);
      srcTimer.current = setTimeout(() => fetchCities(value, setSrcHints, setSrcLoading), 350);
    }
    if (name === 'destination') {
      clearTimeout(dstTimer.current);
      if (value.length >= 2) setDstLoading(true);
      dstTimer.current = setTimeout(() => fetchCities(value, setDstHints, setDstLoading), 350);
    }
  };

  const pick = (field, city) => {
    setFormData(p => ({ ...p, [field]: city.name }));
    if (field === 'source') {
      setSrcHints([]);
      setSrcFocused(false);
    } else {
      setDstHints([]);
      setDstFocused(false);
    }
  };

  const swap = () => setFormData(p => ({ ...p, source: p.destination, destination: p.source }));

  // ─── SEARCH: Live scrape, show all buses ─────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!formData.source || !formData.destination || !formData.date) {
      return toast.error('Please fill source, destination, and date.');
    }
    if (formData.source.toLowerCase() === formData.destination.toLowerCase()) {
      return toast.error('Source and destination must differ.');
    }

    setSearching(true);
    toast.loading('Searching real-time bus fares... (15-30 sec)', { id: 'search' });

    try {
      const res = await searchAPI.searchBuses({
        source: formData.source,
        destination: formData.destination,
        date: formData.date,
        busName: formData.busName || null,
      });

      const data = res.data.data;
      if (data.buses.length > 0) {
        toast.success(`Found ${data.totalResults} buses! Lowest: ₹${data.price}`, { id: 'search' });
        onSearchResults?.(data);
      } else {
        toast.error('No buses found for this route/date. Try another date.', { id: 'search' });
        onSearchResults?.(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed.', { id: 'search' });
    } finally {
      setSearching(false);
    }
  };

  // ─── TRACK: Save for monitoring + email alerts ───
  const handleTrack = async () => {
    if (!formData.source || !formData.destination || !formData.date || !formData.userEmail) {
      return toast.error('Fill all fields including email to enable tracking.');
    }
    setTracking(true);
    try {
      const res = await trackAPI.create(formData);
      toast.success(res.data.message || 'Tracking started! Email alerts enabled.');
      onTrackCreated?.();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setTracking(false); }
  };

  const CityDropdown = ({ items, field, query, loading, focused }) => {
    if (!focused || query.length < 2) return null;
    
    return (
      <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
        {loading ? (
          <li className="px-4 py-3 text-sm text-dark-400 text-center animate-pulse">
            Searching cities...
          </li>
        ) : items.length > 0 ? (
          items.map(c => (
            <li key={`${c.name}-${c.id}`} onClick={() => pick(field, c)}
              className="px-4 py-2.5 text-sm cursor-pointer transition-all hover:bg-primary-500/10 flex items-center justify-between">
              <span className="text-dark-200">{c.name}</span>
              {c.state && <span className="text-[11px] text-dark-500">{c.state}</span>}
            </li>
          ))
        ) : (
          <li className="px-4 py-3 text-sm text-red-400 text-center bg-red-500/5">
            City not found. Try a different spelling.
          </li>
        )}
      </ul>
    );
  };

  return (
    <div className="glass-card p-6 sm:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 border border-primary-500/30 flex items-center justify-center">
          <FaBus className="text-primary-400 text-xl" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-white">Search Bus Fares</h2>
          <p className="text-sm text-dark-400">All operators • All cities • Real-time prices</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-5">
        {/* Source & Destination */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="flex-1 relative">
            <label className="label" htmlFor="source"><HiOutlineLocationMarker className="inline mr-1 text-primary-400"/>From</label>
            <input 
              id="source" name="source" type="text" placeholder="Type any city or town..." 
              value={formData.source} 
              onChange={handleChange} 
              onFocus={() => setSrcFocused(true)}
              onBlur={() => setTimeout(() => setSrcFocused(false), 200)} 
              className="input-field" 
              required autoComplete="off"
            />
            <CityDropdown items={srcHints} field="source" query={formData.source} loading={srcLoading} focused={srcFocused} />
          </div>
          <div className="flex items-center sm:items-end justify-center py-2 sm:py-0 sm:pb-1">
            <button type="button" onClick={swap} className="w-10 h-10 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center text-dark-300 hover:text-primary-400 hover:border-primary-500/50 transition-all hover:rotate-180 sm:rotate-0 rotate-90 duration-500" title="Swap"><HiOutlineSwitchHorizontal className="text-lg"/></button>
          </div>
          <div className="flex-1 relative">
            <label className="label" htmlFor="destination"><HiOutlineLocationMarker className="inline mr-1 text-purple-400"/>To</label>
            <input 
              id="destination" name="destination" type="text" placeholder="Type any city or town..." 
              value={formData.destination} 
              onChange={handleChange} 
              onFocus={() => setDstFocused(true)}
              onBlur={() => setTimeout(() => setDstFocused(false), 200)} 
              className="input-field" 
              required autoComplete="off"
            />
            <CityDropdown items={dstHints} field="destination" query={formData.destination} loading={dstLoading} focused={dstFocused} />
          </div>
        </div>

        {/* Date & Bus Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="date"><HiOutlineCalendar className="inline mr-1 text-emerald-400"/>Travel Date</label>
            <input id="date" name="date" type="date" min={tomorrow()} value={formData.date} onChange={handleChange} className="input-field" required/>
          </div>
          <div>
            <label className="label" htmlFor="busName"><HiOutlineTruck className="inline mr-1 text-amber-400"/>Operator Filter <span className="text-dark-500">(optional)</span></label>
            <input id="busName" name="busName" type="text" placeholder="e.g., SRS Travels" value={formData.busName} onChange={handleChange} className="input-field"/>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="label" htmlFor="userEmail"><HiOutlineMail className="inline mr-1 text-sky-400"/>Notification Email <span className="text-dark-500">(for price drop alerts)</span></label>
          <input id="userEmail" name="userEmail" type="email" placeholder="your@email.com" value={formData.userEmail} onChange={handleChange} className="input-field"/>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button type="submit" disabled={searching} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {searching ? (
              <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Searching...</>
            ) : (
              <><HiOutlineSearch className="text-lg"/>Search Buses</>
            )}
          </button>
          <button type="button" onClick={handleTrack} disabled={tracking || !formData.userEmail}
            className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            title={!formData.userEmail ? 'Enter email to enable tracking' : 'Track & get email alerts on price drops'}>
            {tracking ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <><FaBus className="text-sm"/>Track & Alert</>}
          </button>
        </div>
      </form>

      <div className="mt-5 pt-5 border-t border-dark-700/50 space-y-1.5">
        <p className="text-xs text-dark-500 flex items-start gap-2"><span className="text-primary-400">🔍</span><b>Search</b> — real-time fares from AbhiBus (all private + government buses)</p>
        <p className="text-xs text-dark-500 flex items-start gap-2"><span className="text-amber-400">🔔</span><b>Track & Alert</b> — checks every 30 min, emails you: bus name, time, fare on price drop</p>
      </div>
    </div>
  );
}
