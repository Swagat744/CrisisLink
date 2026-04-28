// src/pages/PublicReportPage.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { autoAssignStaff, getSeverity } from '../utils/autoAssign';
import { Flame, HeartPulse, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const TYPES = [
  { key: 'Fire', label: 'Fire', icon: Flame, color: 'bg-red-600 hover:bg-red-700 border-red-500', desc: 'Smoke, flames, burning smell' },
  { key: 'Medical', label: 'Medical', icon: HeartPulse, color: 'bg-blue-700 hover:bg-blue-800 border-blue-500', desc: 'Injury, illness, chest pain' },
  { key: 'Security', label: 'Security', icon: Shield, color: 'bg-amber-600 hover:bg-amber-700 border-amber-500', desc: 'Threat, intrusion, suspicious activity' },
];

export default function PublicReportPage() {
  const { locationId } = useParams();
  const [location, setLocation] = useState(null);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'locations', locationId))
      .then(snap => {
        if (snap.exists()) setLocation({ id: snap.id, ...snap.data() });
      })
      .finally(() => setLocLoading(false));
  }, [locationId]);

  const handleSubmit = async () => {
    if (!selected) { setError('Please select the type of emergency.'); return; }
    setError('');
    setLoading(true);
    try {
      const severity = getSeverity(selected, message);
      const emergencyRef = await addDoc(collection(db, 'emergencies'), {
        hotelId: location.hotelId,
        locationId,
        locationName: location.name,
        floor: location.floor,
        type: selected,
        message: message.trim(),
        severity,
        status: 'New',
        assignedStaffId: null,
        assignedStaffName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'emergencyTimeline'), {
        emergencyId: emergencyRef.id,
        event: `Emergency reported: ${selected} at ${location.name}`,
        timestamp: serverTimestamp(),
        type: 'created',
      });

      await autoAssignStaff(location.hotelId, emergencyRef.id, selected);
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit. Please try again or call the front desk.');
    } finally {
      setLoading(false);
    }
  };

  if (locLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-slate-400 font-mono tracking-widest text-xs uppercase">Initializing Emergency Protocol...</div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full">
          <AlertTriangle size={64} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-white text-2xl font-black mb-3">INVALID QR CODE</h2>
          <p className="text-slate-400 leading-relaxed">This location could not be verified. Please contact hotel security or the front desk immediately.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm bg-slate-900 border border-green-900/30 p-10 rounded-[2.5rem] text-center shadow-2xl shadow-green-950/20">
          <div className="w-24 h-24 bg-green-600/20 border-4 border-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-white text-3xl font-black mb-4 tracking-tighter uppercase">ALERT SENT</h2>
          <p className="text-slate-300 text-lg font-medium mb-8 leading-snug">Help is being dispatched to <span className="text-white underline decoration-green-500 underline-offset-4">{location.name}</span>.</p>
          
          <div className="bg-slate-950/50 rounded-2xl p-5 text-left border border-slate-800 mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Live Status</div>
            </div>
            <div className="text-white font-bold">Staff Notified & Responding</div>
          </div>
          
          <p className="text-slate-500 text-sm leading-relaxed italic">
            "Please stay where you are if safe. Help is on the way."
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Warning Bar */}
      <div className="bg-red-600 py-3 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
        <AlertTriangle size={16} className="text-white animate-pulse" />
        <span className="text-white font-black text-xs uppercase tracking-widest">Official Emergency Response Portal</span>
      </div>

      <div className="flex-1 px-6 py-10 max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">CrisisLink</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
              {location.name} {location.floor ? `· ${location.floor}` : ''}
            </span>
          </div>
        </div>

        {/* SOS Selection */}
        <div className="space-y-4 mb-10">
          <div className="text-xs text-slate-500 font-black uppercase tracking-widest mb-2 px-1">Select Emergency Type</div>
          {TYPES.map(({ key, label, icon: Icon, color, desc }) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`w-full p-6 rounded-3xl border-2 text-left relative overflow-hidden transition-all duration-300 transform active:scale-95 ${
                selected === key
                  ? `${color} border-white shadow-2xl shadow-red-950/40`
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {selected === key && (
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              )}
              <div className="flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selected === key ? 'bg-white/20' : 'bg-slate-800'}`}>
                  <Icon size={32} className={selected === key ? 'text-white' : 'text-slate-500'} />
                </div>
                <div>
                  <div className={`text-xl font-black uppercase tracking-tight ${selected === key ? 'text-white' : 'text-slate-200'}`}>{label}</div>
                  <div className={`text-xs font-medium ${selected === key ? 'text-white/80' : 'text-slate-500'}`}>{desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Message Input */}
        <div className="mb-8">
          <div className="text-xs text-slate-500 font-black uppercase tracking-widest mb-3 px-1">Additional Details (Optional)</div>
          <textarea
            className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white placeholder-slate-600 focus:border-red-600 outline-none transition-all resize-none font-medium"
            rows="3"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="e.g., Room 402, heavy smoke, 2 people inside..."
          />
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-500 px-5 py-4 rounded-2xl text-sm font-bold mb-6 text-center animate-shake">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !selected}
          className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase tracking-tighter transition-all shadow-2xl relative overflow-hidden ${
            !selected 
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
              : 'bg-red-600 text-white hover:bg-red-500 active:scale-95 shadow-red-900/20'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span>TRANSMITTING...</span>
            </div>
          ) : (
            'BROADCAST EMERGENCY'
          )}
        </button>

        <div className="mt-8 text-center space-y-2">
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">CrisisLink Satellite Response Protocol v3.4</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper icons
function Loader2(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
