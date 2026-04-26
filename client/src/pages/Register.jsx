/**
 * Register Page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FaBus } from 'react-icons/fa';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error('Please fill in all fields.');
    if (password.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (result.success) {
      toast.success('Account created! Welcome aboard! 🎉');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-grid-pattern flex items-center justify-center px-4 py-12">
      <div className="fixed top-20 left-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-card w-full max-w-md p-8 animate-scale-in relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-primary-500/25 mb-4">
            <FaBus className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Create Account</h1>
          <p className="text-sm text-dark-400 mt-1">Start tracking bus fares today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label" htmlFor="reg-name"><HiOutlineUser className="inline mr-1 text-primary-400"/>Full Name</label>
            <input id="reg-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="input-field" required />
          </div>
          <div>
            <label className="label" htmlFor="reg-email"><HiOutlineMail className="inline mr-1 text-primary-400"/>Email</label>
            <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" required />
          </div>
          <div>
            <label className="label" htmlFor="reg-password"><HiOutlineLockClosed className="inline mr-1 text-primary-400"/>Password</label>
            <div className="relative">
              <input id="reg-password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" className="input-field pr-10" required minLength={6} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                {showPass ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating...</> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-dark-400 mt-6">
          Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
