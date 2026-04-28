// src/pages/StaffDashboardPage.jsx
import { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, addDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, LogOut, MapPin, Clock, CheckCircle, Loader, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const TYPE_COLORS = {
  Fire: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', badge: 'bg-red-600' },
  Medical: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-600' },
  Security: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-600' },
};

function SeverityDot({ severity }) {
  const colors = {
    Critical: 'bg-red-500',
    High: 'bg-orange-500',
    Medium: 'bg-yellow-500',
    Low: 'bg-slate-500',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[severity] || 'bg-slate-500'}`} />
  );
}

function EmergencyItem({ emergency, staffDocId }) {
  const [expanded, setExpanded] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');

  const colors = TYPE_COLORS[emergency.type] || TYPE_COLORS.Security;
  const createdAt = emergency.createdAt?.toDate ? emergency.createdAt.toDate() : new Date();

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'emergencies', emergency.id), {
        status,
        updatedAt: serverTimestamp(),
        ...(status === 'Incomplete' ? { needsReassignment: true } : {}),
      });

      await addDoc(collection(db, 'emergencyTimeline'), {
        emergencyId: emergency.id,
        event: status === 'Incomplete'
          ? `Staff marked as Incomplete — needs reassignment`
          : `Status updated to: ${status} by assigned staff`,
        timestamp: serverTimestamp(),
        type: status === 'Incomplete' ? 'escalation' : 'status',
      });

      // If resolved or incomplete, free up the staff
      if ((status === 'Resolved' || status === 'Incomplete') && staffDocId) {
        await updateDoc(doc(db, 'staff', staffDocId), { available: true });
      }
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setUpdating(true);
    try {
      await addDoc(collection(db, 'emergencyTimeline'), {
        emergencyId: emergency.id,
        event: `Staff note: ${note.trim()}`,
        timestamp: serverTimestamp(),
        type: 'note',
      });
      setNote('');
    } finally {
      setUpdating(false);
    }
  };

  const isResolved = emergency.status === 'Resolved' || emergency.status === 'Incomplete';

  return (
    <div className={`rounded-xl border-2 ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Type badge */}
          <div className={`px-2.5 py-1 rounded text-white text-xs font-bold uppercase tracking-wider ${colors.badge} flex-shrink-0`}>
            {emergency.type}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <SeverityDot severity={emergency.severity} />
              <span className="text-white font-semibold">{emergency.severity} Severity</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                emergency.status === 'Resolved' ? 'bg-green-700 text-green-100' :
                emergency.status === 'Incomplete' ? 'bg-red-800 text-red-100' :
                emergency.status === 'On the Way' ? 'bg-amber-600 text-amber-100' :
                'bg-blue-700 text-blue-100'
              }`}>
                {emergency.status}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 text-sm mb-1">
              <MapPin size={13} className="text-slate-500 flex-shrink-0" />
              <span className="font-medium">{emergency.locationName}</span>
              {emergency.floor && <span className="text-slate-500">· {emergency.floor}</span>}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} />
              {formatDistanceToNow(createdAt, { addSuffix: true })} · {format(createdAt, 'HH:mm')}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-slate-500 flex-shrink-0 mt-1" /> : <ChevronDown size={18} className="text-slate-500 flex-shrink-0 mt-1" />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-4">
          {/* Reporter message */}
          {emergency.message && (
            <div className="bg-slate-900/60 rounded-lg px-4 py-3">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-mono">Reported Message</div>
              <p className="text-slate-200 text-sm">"{emergency.message}"</p>
            </div>
          )}

          {/* Action buttons */}
          {!isResolved && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-mono">Update Status</div>
              <div className="flex flex-col gap-2">
                {emergency.status !== 'On the Way' && (
                  <button
                    onClick={() => updateStatus('On the Way')}
                    disabled={updating}
                    className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                    style={{ minHeight: '52px' }}
                  >
                    <Loader size={16} />
                    I'm On the Way
                  </button>
                )}
                <button
                  onClick={() => updateStatus('Resolved')}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                  style={{ minHeight: '52px' }}
                >
                  <CheckCircle size={16} />
                  Mark as Resolved
                </button>
                <button
                  onClick={() => updateStatus('Incomplete')}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-red-900 border border-slate-600 hover:border-red-700 text-slate-300 hover:text-red-300 font-semibold py-3 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                  style={{ minHeight: '52px' }}
                >
                  <XCircle size={16} />
                  Cannot Handle — Mark Incomplete
                </button>
              </div>
            </div>
          )}

          {/* Resolved/Incomplete message */}
          {isResolved && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
              emergency.status === 'Resolved'
                ? 'bg-green-900/30 border border-green-700/30 text-green-300'
                : 'bg-red-900/30 border border-red-700/30 text-red-300'
            }`}>
              {emergency.status === 'Resolved'
                ? <><CheckCircle size={16} /> Emergency resolved. Good work.</>
                : <><XCircle size={16} /> Marked incomplete. Admin will reassign.</>
              }
            </div>
          )}

          {/* Add note */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-mono">Add Note</div>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Fire contained to kitchen area..."
                onKeyDown={e => e.key === 'Enter' && addNote()}
              />
              <button
                onClick={addNote}
                disabled={updating || !note.trim()}
                className="btn-secondary px-4 text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffDashboardPage() {
  const { userProfile, logout } = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [staffDocId, setStaffDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  // Get the staff Firestore doc ID using the user's UID
  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(collection(db, 'staff'), where('uid', '==', userProfile.uid));
    getDocs(q).then(snap => {
      if (!snap.empty) setStaffDocId(snap.docs[0].id);
    });
  }, [userProfile]);

  // Listen to emergencies assigned to this staff member
  useEffect(() => {
    if (!userProfile?.name) return;
    const q = query(
      collection(db, 'emergencies'),
      where('assignedStaffName', '==', userProfile.name)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() ?? new Date(0);
          const bTime = b.createdAt?.toDate?.() ?? new Date(0);
          return bTime - aTime;
        });
      setEmergencies(data);
      setLoading(false);
    });
    return unsub;
  }, [userProfile]);

  const active = emergencies.filter(e => e.status !== 'Resolved' && e.status !== 'Incomplete');
  const completed = emergencies.filter(e => e.status === 'Resolved' || e.status === 'Incomplete');
  const displayed = filter === 'active' ? active : completed;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
            <AlertTriangle size={15} className="text-white" />
          </div>
          <div>
            <div className="font-mono font-bold text-white text-sm">CrisisLink</div>
            <div className="text-xs text-slate-500">Staff Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-white">{userProfile?.name}</div>
            <div className="text-xs text-slate-500">Staff</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white p-2 rounded transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Active alert banner */}
        {active.length > 0 && (
          <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm font-medium mb-5 crisis-pulse">
            <AlertTriangle size={16} />
            {active.length} active emergency{active.length > 1 ? 's' : ''} assigned to you
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 bg-slate-800/50 p-1 rounded-lg">
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              filter === 'active' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({active.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              filter === 'completed' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed ({completed.length})
          </button>
        </div>

        {/* Emergency list */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading your assignments...</div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle size={32} className="text-green-600 mx-auto mb-3" />
            <div className="text-white font-medium text-lg mb-1">
              {filter === 'active' ? 'No Active Assignments' : 'No Completed Jobs'}
            </div>
            <p className="text-slate-400 text-sm">
              {filter === 'active'
                ? 'You have no active emergencies. Stay on standby.'
                : 'No completed emergencies yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(e => (
              <EmergencyItem key={e.id} emergency={e} staffDocId={staffDocId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
