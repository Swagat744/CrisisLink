// src/components/emergencies/MassEmergencyModal.jsx
import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useHotel } from '../../context/HotelContext';
import { 
  AlertCircle, 
  BrainCircuit, 
  Phone, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MassEmergencyModal({ type, emergencies, onClose }) {
  const { hotel } = useHotel();
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const loggedRef = useRef(false);

  const locationsList = emergencies.map(e => `${e.locationName} (Floor ${e.floor || 'N/A'})`).join(', ');
  const firstReport = emergencies.reduce((min, e) => {
    const time = e.createdAt?.toDate?.() || new Date();
    return time < min ? time : min;
  }, new Date());

  const staffNames = [...new Set(emergencies.map(e => e.assignedStaffName).filter(Boolean))].join(', ') || 'None assigned yet';

  useEffect(() => {
    // 1. Timeline Logging (Once per detection)
    if (!loggedRef.current && emergencies.length > 0) {
      loggedRef.current = true;
      emergencies.forEach(async (e) => {
        try {
          await addDoc(collection(db, 'emergencyTimeline'), {
            emergencyId: e.id,
            event: `MASS EMERGENCY TRIGGERED — ${emergencies.length} simultaneous ${type} emergencies detected. External facilities alerted.`,
            timestamp: serverTimestamp(),
            type: "mass_escalation"
          });
        } catch (err) {
          console.error('Logging failed', err);
        }
      });
    }

    // 2. Gemini AI Analysis
    const fetchAIAnalysis = async () => {
      const apiKey = import.meta.env.VITE_GEMINI_KEY;
      
      if (!apiKey || apiKey.includes('your_gemini_api_key')) {
        setError('Gemini API key missing or invalid. Please check your .env file and restart the server.');
        setLoading(false);
        return;
      }

      if (!hotel) {
        setError('Hotel data not loaded. AI analysis requires hotel profile information.');
        setLoading(false);
        return;
      }

      const minutesSinceStart = Math.floor((new Date() - firstReport) / 60000);
      const severityCounts = emergencies.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      }, {});
      const severityStr = Object.entries(severityCounts).map(([s, c]) => `${s} x${c}`).join(', ');

      const prompt = `
        You are an emergency response coordinator AI for a hotel.
        
        SITUATION:
        * Hotel: ${hotel.name}, ${hotel.address}
        * Emergency Type: ${type}
        * Active Emergencies: ${emergencies.length} simultaneous rooms
        * Affected Locations: ${locationsList}
        * Severity Levels: ${severityStr}
        * Staff Assigned: ${staffNames}
        * Time Since First Report: ${minutesSinceStart} minutes
        
        Respond in this exact JSON format:
        {
          "situationAssessment": "2-3 sentence assessment of what is likely happening",
          "priorityActions": ["action 1", "action 2", "action 3", "action 4"],
          "facilityMessage": "A clear, professional message the hotel manager can read out when calling the fire/medical/police facility. Include hotel name, address, emergency type, number of affected floors, and request for immediate assistance.",
          "estimatedRisk": "Critical | High | Moderate",
          "recommendFirstFacility": "name of which facility to call first and why in one sentence"
        }
      `;

      try {
        // Using gemini-3-flash-preview for latest support
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          let text = data.candidates[0].content.parts[0].text;
          // Clean possible markdown JSON wrappers
          text = text.replace(/```json|```/g, '').trim();
          setAiData(JSON.parse(text));
        } else {
          throw new Error('Invalid AI response format');
        }
      } catch (err) {
        console.error('AI Fetch error', err);
        setError(`AI analysis unavailable: ${err.message}. Ensure your API key is correct and has access to Gemini 3 Flash.`);
      } finally {
        setLoading(false);
      }
    };

    fetchAIAnalysis();
  }, []);

  const copyMessage = () => {
    navigator.clipboard.writeText(aiData.facilityMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskColor = (risk) => {
    if (risk === 'Critical') return 'bg-red-600';
    if (risk === 'High') return 'bg-orange-600';
    return 'bg-yellow-600';
  };

  const facilities = hotel.facilities?.[type] || [];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col md:overflow-hidden overflow-y-auto">
      {/* Modal Header */}
      <div className="bg-red-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-white animate-pulse" size={24} />
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Mass Crisis Report: {type}</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-5xl mx-auto w-full">
        {/* Section 1: Situation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card md:col-span-2">
            <h3 className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-4">Situation Summary</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <div className="text-xs text-slate-400 mb-1 uppercase font-semibold">Incident Type</div>
                <div className="text-white font-bold text-lg">{type}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1 uppercase font-semibold">Affected Rooms</div>
                <div className="text-white font-bold text-lg">{emergencies.length} Locations</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-1 uppercase font-semibold">Locations</div>
                <div className="text-white text-sm leading-relaxed">{locationsList}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1 uppercase font-semibold">Started</div>
                <div className="text-white text-sm">{formatDistanceToNow(firstReport)} ago</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1 uppercase font-semibold">Staff On Duty</div>
                <div className="text-white text-sm">{staffNames}</div>
              </div>
            </div>
          </div>

          <div className="card flex flex-col items-center justify-center text-center bg-red-950/20 border-red-900/50">
            <ShieldAlert size={48} className="text-red-500 mb-4" />
            <div className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">Mass Escalation</div>
            <p className="text-slate-400 text-sm">Simultaneous threshold breached. High-priority response required.</p>
          </div>
        </div>

        {/* Section 2: AI Analysis */}
        <div className="card relative overflow-hidden border-blue-900/30">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <div className="flex items-center gap-2 mb-6">
            <BrainCircuit className="text-blue-500" size={20} />
            <h3 className="text-sm font-mono text-slate-500 uppercase tracking-widest">AI Crisis Intelligence</h3>
            {loading && <Loader2 className="animate-spin text-blue-500 ml-2" size={16} />}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="animate-pulse">Gemini AI is analyzing the situation...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-slate-900 rounded-lg text-slate-400 text-center">
              {error}
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Situation Assessment</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold text-white uppercase ${getRiskColor(aiData.estimatedRisk)}`}>
                    Risk: {aiData.estimatedRisk}
                  </span>
                </div>
                <p className="text-white text-lg leading-relaxed italic">"{aiData.situationAssessment}"</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold mb-4">Priority Action Plan</div>
                  <ul className="space-y-3">
                    {aiData.priorityActions.map((action, i) => (
                      <li key={i} className="flex gap-3 text-white">
                        <span className="flex-shrink-0 w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                          {i + 1}
                        </span>
                        <span className="font-medium">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Facility Communication Script</div>
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 relative group">
                    <p className="text-slate-300 text-sm leading-relaxed mb-4 font-serif">
                      {aiData.facilityMessage}
                    </p>
                    <button 
                      onClick={copyMessage}
                      className="btn-secondary py-2 flex items-center gap-2 text-xs w-full justify-center"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copied ? 'Copied to Clipboard' : 'Copy Message for Dispatch'}
                    </button>
                  </div>
                  <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-lg flex gap-3">
                    <BrainCircuit size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Recommendation</div>
                      <p className="text-xs text-slate-300 leading-snug">{aiData.recommendFirstFacility}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Call Now Buttons */}
        <div>
          <h3 className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-4 px-1">Nearby Support Facilities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.length > 0 ? facilities.filter(f => f.name && f.phone).map((f, i) => (
              <div key={i} className="card flex items-center justify-between p-5 border-slate-800 hover:border-slate-700 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600/20 group-hover:text-blue-500 transition-colors">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-white font-bold">{f.name}</div>
                    <div className="text-slate-500 text-sm font-mono">{f.phone}</div>
                  </div>
                </div>
                <a 
                  href={`tel:${f.phone}`} 
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20 active:scale-95"
                >
                  <Phone size={18} /> Call Now
                </a>
              </div>
            )) : (
              <div className="md:col-span-2 card text-center py-8 text-slate-500 text-sm">
                No nearby facilities configured for this emergency type.
              </div>
            )}
          </div>
        </div>

        <div className="py-10 text-center">
          <p className="text-slate-500 text-xs uppercase tracking-widest">End of Crisis Report · Real-time Intelligence via CrisisLink</p>
        </div>
      </div>
    </div>
  );
}
