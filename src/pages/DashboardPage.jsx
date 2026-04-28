// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useHotel } from '../context/HotelContext';
import Layout from '../components/dashboard/Layout';
import EmergencyCard from '../components/emergencies/EmergencyCard';
import { AlertTriangle, CheckCircle, Clock, Zap, Building2, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMassEmergency } from '../hooks/useMassEmergency';
import MassEmergencyModal from '../components/emergencies/MassEmergencyModal';

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white font-mono">{value}</div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { hotel, loading: hotelLoading } = useHotel();
  const [emergencies, setEmergencies] = useState([]);
  const [filter, setFilter] = useState('active');
  const { massEmergencies } = useMassEmergency();
  const [activeMassType, setActiveMassType] = useState(null);

  useEffect(() => {
    if (!hotel?.id) return; // guard against undefined hotel
    const q = query(
      collection(db, 'emergencies'),
      where('hotelId', '==', hotel.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by createdAt descending in JS — no composite index needed
      data.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() ?? new Date(0);
        const bTime = b.createdAt?.toDate?.() ?? new Date(0);
        return bTime - aTime;
      });
      setEmergencies(data);
    });
    return unsub;
  }, [hotel]);

  const active = emergencies.filter(e => e.status !== 'Resolved');
  const resolved = emergencies.filter(e => e.status === 'Resolved');
  const critical = emergencies.filter(e => e.severity === 'Critical' && e.status !== 'Resolved');
  const escalated = emergencies.filter(e => e.status === 'Escalated');

  const displayed = filter === 'active' ? active : filter === 'resolved' ? resolved : emergencies;

  if (hotelLoading) return <Layout><div className="p-8 text-slate-400">Loading...</div></Layout>;

  if (!hotel) {
    return (
      <Layout>
        <div className="p-8 max-w-md">
          <div className="card text-center py-10">
            <Building2 size={40} className="text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Hotel Configured</h2>
            <p className="text-slate-400 text-sm mb-5">Set up your hotel profile to start using CrisisLink.</p>
            <Link to="/setup" className="btn-primary inline-block">Set Up Hotel</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Emergency Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">{hotel.name} — Live monitoring</p>
          </div>
          {critical.length > 0 && (
            <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 text-red-300 px-4 py-2 rounded text-sm font-medium crisis-pulse">
              <AlertTriangle size={15} />
              {critical.length} Critical Alert{critical.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Mass Emergency Banners */}
        <div className="space-y-3 mb-8">
          {Object.entries(massEmergencies).map(([type, list]) => (
            <div key={type} className="bg-red-600 rounded-lg p-4 flex items-center justify-between crisis-pulse shadow-lg shadow-red-900/40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-white font-black uppercase tracking-tight leading-tight">
                    MASS EMERGENCY ACTIVE — {type.toUpperCase()}
                  </div>
                  <div className="text-red-100 text-xs font-medium">
                    {list.length} simultaneous rooms affected. External facilities notified.
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setActiveMassType(type)}
                className="bg-white text-red-600 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <BrainCircuit size={16} /> View Crisis Report
              </button>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Active" value={active.length} color="bg-red-600" icon={Zap} />
          <StatCard label="Critical" value={critical.length} color="bg-orange-600" icon={AlertTriangle} />
          <StatCard label="Escalated" value={escalated.length} color="bg-amber-600" icon={Clock} />
          <StatCard label="Resolved Today" value={resolved.length} color="bg-green-700" icon={CheckCircle} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 bg-slate-800/50 p-1 rounded-lg w-fit">
          {[
            { key: 'active', label: `Active (${active.length})` },
            { key: 'resolved', label: `Resolved (${resolved.length})` },
            { key: 'all', label: `All (${emergencies.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                filter === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Emergency list */}
        {displayed.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle size={32} className="text-green-600 mx-auto mb-3" />
            <div className="text-white font-medium text-lg mb-1">
              {filter === 'active' ? 'No Active Emergencies' : 'No Records Found'}
            </div>
            <p className="text-slate-400 text-sm">
              {filter === 'active' ? 'All clear. The system is monitoring.' : 'No emergencies match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(e => (
              <EmergencyCard key={e.id} emergency={e} />
            ))}
          </div>
        )}
        {/* Crisis Intelligence Modal */}
        {activeMassType && (
          <MassEmergencyModal 
            type={activeMassType}
            emergencies={massEmergencies[activeMassType]}
            onClose={() => setActiveMassType(null)}
          />
        )}
      </div>
    </Layout>
  );
}