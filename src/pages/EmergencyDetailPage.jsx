// src/pages/EmergencyDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import {
  doc, onSnapshot, collection, query, where, orderBy,
  getDocs, updateDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { useHotel } from '../context/HotelContext';
import Layout from '../components/dashboard/Layout';
import { StatusBadge, SeverityBadge } from '../components/emergencies/EmergencyCard';
import { autoAssignStaff, getFloorGuidance } from '../utils/autoAssign';
import {
  ArrowLeft, MapPin, Clock, User, FileText,
  AlertTriangle, CheckCircle, RotateCcw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const STATUSES = ['New', 'Assigned', 'On the Way', 'Resolved'];

export default function EmergencyDetailPage() {
  const { id } = useParams();
  const { hotel } = useHotel();
  const navigate = useNavigate();

  const [emergency, setEmergency] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [note, setNote] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'emergencies', id), (snap) => {
      if (snap.exists()) setEmergency({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'emergencyTimeline'),
      where('emergencyId', '==', id),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setTimeline(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!hotel) return;
    getDocs(query(collection(db, 'staff'), where('hotelId', '==', hotel.id), where('available', '==', true)))
      .then(snap => setAvailableStaff(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [hotel, emergency]);

  const updateStatus = async (status) => {
    setSaving(true);
    await updateDoc(doc(db, 'emergencies', id), { status, updatedAt: serverTimestamp() });
    await addDoc(collection(db, 'emergencyTimeline'), {
      emergencyId: id,
      event: `Status updated to: ${status}`,
      timestamp: serverTimestamp(),
      type: 'status',
    });
    if (status === 'Resolved') {
      // Free up staff
      if (emergency?.assignedStaffId) {
        await updateDoc(doc(db, 'staff', emergency.assignedStaffId), { available: true });
      }
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    await addDoc(collection(db, 'emergencyTimeline'), {
      emergencyId: id,
      event: `Note: ${note.trim()}`,
      timestamp: serverTimestamp(),
      type: 'note',
    });
    setNote('');
    setSaving(false);
  };

  const reassignStaff = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    const staffDoc = availableStaff.find(s => s.id === selectedStaff);
    // Free old staff
    if (emergency?.assignedStaffId) {
      await updateDoc(doc(db, 'staff', emergency.assignedStaffId), { available: true });
    }
    await updateDoc(doc(db, 'staff', staffDoc.id), { available: false });
    await updateDoc(doc(db, 'emergencies', id), {
      assignedStaffId: staffDoc.id,
      assignedStaffName: staffDoc.name,
      status: 'Assigned',
      updatedAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'emergencyTimeline'), {
      emergencyId: id,
      event: `Staff reassigned to: ${staffDoc.name} (${staffDoc.role})`,
      timestamp: serverTimestamp(),
      type: 'assignment',
    });
    setSelectedStaff('');
    setSaving(false);
  };

  const triggerAutoAssign = async () => {
    setSaving(true);
    await autoAssignStaff(hotel.id, id, emergency.type);
    setSaving(false);
  };

  if (!emergency) return <Layout><div className="p-8 text-slate-400">Loading emergency...</div></Layout>;

  const createdAt = emergency.createdAt?.toDate ? emergency.createdAt.toDate() : new Date();
  const guidance = getFloorGuidance(emergency.type, emergency.floor || emergency.locationName);

  const typeColors = { Fire: 'text-red-400', Medical: 'text-blue-400', Security: 'text-amber-400' };
  const typeColor = typeColors[emergency.type] || 'text-slate-300';

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        {/* Back + header */}
        <div className="mb-6">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit">
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`text-2xl font-bold ${typeColor}`}>{emergency.type} Emergency</span>
                <SeverityBadge severity={emergency.severity} />
                <StatusBadge status={emergency.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5"><MapPin size={13} />{emergency.locationName}{emergency.floor ? ` · ${emergency.floor}` : ''}</span>
                <span className="flex items-center gap-1.5"><Clock size={13} />{format(createdAt, 'dd MMM yyyy, HH:mm')} · {formatDistanceToNow(createdAt, { addSuffix: true })}</span>
                {emergency.assignedStaffName && (
                  <span className="flex items-center gap-1.5"><User size={13} />{emergency.assignedStaffName}</span>
                )}
              </div>
            </div>
            {emergency.status === 'Resolved' && (
              <Link to={`/incident-report/${id}`} className="btn-secondary flex items-center gap-2">
                <FileText size={16} />
                Incident Report
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: main actions */}
          <div className="col-span-2 space-y-5">
            {/* Message */}
            {emergency.message && (
              <div className="card">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-mono">Reported Message</div>
                <p className="text-slate-200">{emergency.message}</p>
              </div>
            )}

            {/* Floor guidance */}
            <div className={`card border-l-4 ${emergency.type === 'Fire' ? 'border-red-500' : emergency.type === 'Medical' ? 'border-blue-500' : 'border-amber-500'}`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className={typeColor} />
                <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">Floor Guidance</div>
              </div>
              <ul className="space-y-1.5">
                {guidance.map((g, i) => (
                  <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                    <span className="text-slate-500 font-mono text-xs mt-0.5 flex-shrink-0">{String(i+1).padStart(2,'0')}</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            {/* Status update */}
            {emergency.status !== 'Resolved' && (
              <div className="card">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-mono">Update Status</div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter(s => s !== emergency.status).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      disabled={saving}
                      className={`btn-secondary text-sm px-4 py-2 ${s === 'Resolved' ? 'bg-green-800 hover:bg-green-700 border border-green-600' : ''}`}
                    >
                      {s === 'Resolved' && <CheckCircle size={14} className="inline mr-1.5" />}
                      Mark: {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add note */}
            <div className="card">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-mono">Add Note</div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Type a note about this emergency..."
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                />
                <button onClick={addNote} disabled={saving || !note.trim()} className="btn-secondary px-5">Add</button>
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-4 font-mono">Timeline</div>
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-slate-700" />
                {timeline.length === 0 && (
                  <p className="text-slate-500 text-sm">No timeline events yet.</p>
                )}
                {timeline.map((t, i) => {
                  const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date();
                  const dotColor =
                    t.type === 'assignment' ? 'bg-blue-500' :
                    t.type === 'status' ? 'bg-green-500' :
                    t.type === 'escalation' ? 'bg-red-500' :
                    'bg-slate-500';
                  return (
                    <div key={t.id} className="mb-4 last:mb-0 relative">
                      <div className={`absolute -left-[17px] w-3 h-3 rounded-full ${dotColor} top-0.5`} />
                      <div className="text-sm text-slate-200">{t.event}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        {format(ts, 'HH:mm:ss')} · {formatDistanceToNow(ts, { addSuffix: true })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: staff panel */}
          <div className="space-y-5">
            {/* Current staff */}
            <div className="card">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-mono">Assigned Staff</div>
              {emergency.assignedStaffName ? (
                <div className="flex items-center gap-2 py-2 px-3 bg-blue-900/30 border border-blue-700/30 rounded">
                  <User size={15} className="text-blue-400" />
                  <span className="text-sm text-white font-medium">{emergency.assignedStaffName}</span>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 text-sm mb-3">No staff assigned yet.</p>
                  <button onClick={triggerAutoAssign} disabled={saving} className="btn-primary text-sm w-full">
                    Auto-Assign Staff
                  </button>
                </div>
              )}
            </div>

            {/* Reassign */}
            {emergency.status !== 'Resolved' && (
              <div className="card">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-mono flex items-center gap-1.5">
                  <RotateCcw size={11} />
                  Reassign Staff
                </div>
                {availableStaff.length === 0 ? (
                  <p className="text-slate-500 text-sm">No available staff.</p>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="input text-sm"
                      value={selectedStaff}
                      onChange={e => setSelectedStaff(e.target.value)}
                    >
                      <option value="">Select staff...</option>
                      {availableStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                    <button
                      onClick={reassignStaff}
                      disabled={saving || !selectedStaff}
                      className="btn-secondary w-full text-sm"
                    >
                      Reassign
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Emergency ID */}
            <div className="card">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-mono">Emergency ID</div>
              <div className="font-mono text-xs text-slate-400 break-all">{id}</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
