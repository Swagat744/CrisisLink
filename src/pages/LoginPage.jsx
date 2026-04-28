// src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <AlertTriangle size={20} className="text-white" />
          </div>
          <div>
            <div className="font-mono font-bold text-white text-lg tracking-tight">CrisisLink</div>
            <div className="text-xs text-slate-500 font-mono">Hotel Emergency Response</div>
          </div>
        </div>

        <div className="card">
          <h1 className="text-xl font-semibold text-white mb-1">Sign In</h1>
          <p className="text-sm text-slate-400 mb-6">Access the emergency management dashboard</p>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hotel.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-5">
          New hotel?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
