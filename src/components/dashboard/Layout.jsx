// src/components/dashboard/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';
import {
  LayoutDashboard, Users, MapPin, QrCode,
  Settings, LogOut, AlertTriangle, Building2
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/qr-codes', label: 'QR Codes', icon: QrCode },
  { to: '/setup', label: 'Hotel Setup', icon: Building2 },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { userProfile, logout } = useAuth();
  const { hotel } = useHotel();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <div>
              <div className="font-mono font-bold text-white text-sm tracking-tight">CrisisLink</div>
              <div className="text-xs text-slate-500 font-mono">Emergency Response</div>
            </div>
          </div>
        </div>

        {/* Hotel name */}
        {hotel && (
          <div className="px-5 py-3 border-b border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-0.5">Hotel</div>
            <div className="text-sm font-semibold text-slate-200 truncate">{hotel.name}</div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'bg-red-600/20 text-red-400 border border-red-500/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="mb-3">
            <div className="text-xs font-medium text-slate-200 truncate">{userProfile?.name || userProfile?.email}</div>
            <div className="text-xs text-slate-500 capitalize">{userProfile?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors w-full"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}
