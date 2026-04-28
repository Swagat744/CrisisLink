// src/pages/ReportPage.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useHotel } from '../context/HotelContext';
import Layout from '../components/dashboard/Layout';
import { FileText, Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportPage() {
  const { id } = useParams();
  const { hotel } = useHotel();
  const [emergency, setEmergency] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getDoc(doc(db, 'emergencies', id)),
      getDocs(query(
        collection(db, 'emergencyTimeline'),
        where('emergencyId', '==', id),
        orderBy('timestamp', 'asc')
      )),
    ]).then(([eSnap, tSnap]) => {
      if (eSnap.exists()) setEmergency({ id: eSnap.id, ...eSnap.data() });
      setTimeline(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div className="p-8 text-slate-400">Loading report...</div></Layout>;
  if (!emergency) return <Layout><div className="p-8 text-red-400">Emergency not found.</div></Layout>;

  const createdAt = emergency.createdAt?.toDate ? emergency.createdAt.toDate() : new Date();
  const updatedAt = emergency.updatedAt?.toDate ? emergency.updatedAt.toDate() : new Date();

  const getResolutionTime = () => {
    const resolvedEntry = timeline.find(t => t.event?.includes('Resolved'));
    if (!resolvedEntry) return 'N/A';
    const resolvedAt = resolvedEntry.timestamp?.toDate ? resolvedEntry.timestamp.toDate() : null;
    if (!resolvedAt) return 'N/A';
    const diffMs = resolvedAt - createdAt;
    const mins = Math.floor(diffMs / 60000);
    return mins < 1 ? 'Under 1 minute' : `${mins} minute${mins > 1 ? 's' : ''}`;
  };

  return (
    <Layout>
      <div className="p-8 max-w-3xl">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to={`/emergency/${id}`} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft size={15} />
            Back to Emergency
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>

        {/* Report card */}
        <div className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Incident Report</h1>
                <div className="text-sm text-slate-500">{hotel?.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">Report ID</div>
                <div className="font-mono text-xs text-slate-600 max-w-xs truncate">{id}</div>
              </div>
            </div>
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Emergency Type</div>
              <div className="text-lg font-bold text-slate-900">{emergency.type}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Severity</div>
              <div className="text-lg font-bold text-slate-900">{emergency.severity}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Location</div>
              <div className="font-medium text-slate-900">{emergency.locationName}</div>
              {emergency.floor && <div className="text-sm text-slate-500">{emergency.floor}</div>}
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Status</div>
              <div className="font-medium text-slate-900">{emergency.status}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Time Reported</div>
              <div className="font-medium text-slate-900">{format(createdAt, 'dd MMM yyyy, HH:mm:ss')}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Resolution Time</div>
              <div className="font-medium text-slate-900">{getResolutionTime()}</div>
            </div>
          </div>

          {/* Assigned staff */}
          <div className="mb-6">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Staff Involved</div>
            {emergency.assignedStaffName ? (
              <div className="bg-slate-50 border border-slate-200 rounded px-4 py-3 text-slate-900 font-medium">
                {emergency.assignedStaffName}
              </div>
            ) : (
              <div className="text-slate-500">No staff assigned</div>
            )}
          </div>

          {/* Reported message */}
          {emergency.message && (
            <div className="mb-6">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Reporter Message</div>
              <div className="bg-slate-50 border border-slate-200 rounded px-4 py-3 text-slate-700 italic">
                "{emergency.message}"
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="mb-6">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-semibold">Full Timeline</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs text-slate-400 font-semibold uppercase tracking-wider w-40">Time</th>
                  <th className="text-left py-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">Event</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map(t => {
                  const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date();
                  return (
                    <tr key={t.id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-500 font-mono text-xs">{format(ts, 'HH:mm:ss')}</td>
                      <td className="py-2 text-slate-700">{t.event}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 mt-6 text-xs text-slate-400 flex justify-between">
            <span>Generated by CrisisLink Emergency Response System</span>
            <span>{format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
