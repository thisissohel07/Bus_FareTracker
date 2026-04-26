import { useState, useEffect } from 'react';
import { trackAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import TrackForm from '../components/TrackForm';
import TrackCard from '../components/TrackCard';
import PriceChart from '../components/PriceChart';
import BusResults from '../components/BusResults';
import toast from 'react-hot-toast';
import { HiOutlineChartBar, HiOutlineBell, HiOutlineShieldCheck } from 'react-icons/hi';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartTrack, setChartTrack] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (!isAuthenticated) {
        const email = localStorage.getItem('busfare_guest_email');
        if (email) params.email = email;
      }
      const res = await trackAPI.getAll(params);
      setTracks(res.data.data.tracks || []);
    } catch { setTracks([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTracks(); }, [isAuthenticated]);

  // Handle search results from TrackForm
  const handleSearchResults = (data) => {
    setSearchResults(data);
    // Scroll to results
    if (data) {
      setTimeout(() => {
        document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Track a specific bus from search results
  const handleTrackBus = async (bus) => {
    if (!searchResults) return;
    const email = document.getElementById('userEmail')?.value;
    if (!email) {
      toast.error('Please enter your email in the form above to track this bus.');
      return;
    }
    try {
      await trackAPI.create({
        source: searchResults.source,
        destination: searchResults.destination,
        date: searchResults.date,
        busName: bus.name,
        userEmail: email,
      });
      toast.success(`Now tracking ${bus.name} at ₹${bus.price}!`);
      fetchTracks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start tracking.');
    }
  };

  const activeCount = tracks.filter(t => t.isActive).length;
  const droppedCount = tracks.filter(t => t.currentPrice && t.lastPrice && t.currentPrice < t.lastPrice).length;

  return (
    <div className="min-h-screen bg-grid-pattern pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Background orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold mb-3">
            <span className="gradient-text">Never Overpay</span>
            <span className="text-white"> for Bus Tickets</span>
          </h1>
          <p className="text-dark-400 text-base sm:text-lg max-w-2xl mx-auto">
            Search real-time fares across all operators. Track prices and get instant email alerts when they drop.
          </p>
        </div>

        {/* Stats */}
        {tracks.length > 0 && (
          <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto mb-10 animate-slide-up">
            <div className="glass-card p-3 text-center">
              <p className="text-2xl font-bold text-primary-400">{tracks.length}</p>
              <p className="text-xs text-dark-400">Total Routes</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
              <p className="text-xs text-dark-400">Active</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{droppedCount}</p>
              <p className="text-xs text-dark-400">Price Drops</p>
            </div>
          </div>
        )}

        {/* Search form (full width) */}
        <div className="max-w-3xl mx-auto mb-10">
          <TrackForm onTrackCreated={fetchTracks} onSearchResults={handleSearchResults} />
        </div>

        {/* Search Results */}
        {searchResults && (
          <div id="search-results" className="max-w-4xl mx-auto mb-12">
            <BusResults
              results={searchResults.buses}
              searchInfo={searchResults}
              onTrackBus={handleTrackBus}
            />
          </div>
        )}

        {/* Features row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
          {[
            { icon: HiOutlineChartBar, color: 'text-primary-400', title: 'Price Charts', desc: 'Visual price history over time' },
            { icon: HiOutlineBell, color: 'text-emerald-400', title: 'Instant Alerts', desc: 'Email notification on price drops' },
            { icon: HiOutlineShieldCheck, color: 'text-purple-400', title: 'All Operators', desc: 'Private + government buses' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex items-center gap-3 glass-card p-4">
              <Icon className={`text-2xl ${color} shrink-0`} />
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-dark-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tracked routes */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-white">Your Tracked Routes</h2>
            <button onClick={fetchTracks} className="text-xs text-dark-400 hover:text-primary-400 transition-all">Refresh</button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="glass-card p-12 text-center animate-fade-in">
              <div className="text-5xl mb-4">🚌</div>
              <h3 className="text-lg font-semibold text-dark-200 mb-2">No routes tracked yet</h3>
              <p className="text-sm text-dark-400 max-w-sm mx-auto">
                Search for buses above, then click "Track & Alert" or the Track button on any bus.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tracks.map((track, i) => (
                <div key={track._id} style={{ animationDelay: `${i * 80}ms` }}>
                  <TrackCard track={track} onUpdate={fetchTracks} onShowChart={setChartTrack} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {chartTrack && <PriceChart track={chartTrack} onClose={() => setChartTrack(null)} />}
    </div>
  );
}
