/**
 * Navbar Component
 * 
 * Top navigation bar with glassmorphism effect,
 * user avatar, and auth actions.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineBell, HiOutlineLogout, HiOutlineUser, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { FaBus } from 'react-icons/fa';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-all duration-300">
              <FaBus className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold gradient-text">BusFare</h1>
              <p className="text-[10px] text-dark-400 -mt-1 tracking-wider uppercase">Tracker</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/" className="text-sm text-dark-300 hover:text-white px-4 py-2 rounded-lg hover:bg-dark-700/50 transition-all">
                  Dashboard
                </Link>
                <div className="flex items-center gap-3 ml-2 pl-4 border-l border-dark-700">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-dark-200 font-medium">{user?.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-dark-400 hover:text-red-400 p-2 rounded-lg hover:bg-dark-700/50 transition-all"
                    title="Logout"
                  >
                    <HiOutlineLogout className="text-lg" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-dark-300 hover:text-white px-4 py-2 rounded-lg hover:bg-dark-700/50 transition-all">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm !py-2 !px-5">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-dark-300 hover:text-white p-2"
          >
            {mobileOpen ? <HiOutlineX className="text-xl" /> : <HiOutlineMenu className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-dark-700/50 animate-slide-down">
          <div className="px-4 py-4 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-200">{user?.name}</p>
                    <p className="text-xs text-dark-400">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-dark-300 hover:text-white px-3 py-2 rounded-lg hover:bg-dark-700/50 transition-all"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full text-left text-sm text-red-400 px-3 py-2 rounded-lg hover:bg-dark-700/50 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-dark-300 hover:text-white px-3 py-2 rounded-lg hover:bg-dark-700/50 transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-center btn-primary !py-2"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
