// src/pages/QRPage.jsx
import { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useHotel } from '../context/HotelContext';
import Layout from '../components/dashboard/Layout';
import { QrCode, Download, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRPage() {
  const { hotel } = useHotel();
  const [locations, setLocations] = useState([]);
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!hotel) return;
    const q = query(collection(db, 'locations'), where('hotelId', '==', hotel.id));
    return onSnapshot(q, snap => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [hotel]);

  const getUrl = (locId) => `${baseUrl}/report/${locId}`;

  const downloadQR = (loc) => {
    const svg = document.getElementById(`qr-${loc.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 340;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 340);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 25, 20, 250, 250);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 280, 300, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(loc.name, 150, 305);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(loc.floor || '', 150, 325);
      const link = document.createElement('a');
      link.download = `CrisisLink-QR-${loc.name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const byFloor = locations.reduce((acc, loc) => {
    const key = loc.floor || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(loc);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <QrCode size={22} className="text-slate-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">QR Codes</h1>
              <p className="text-slate-400 text-sm">Scan these on your mobile to report emergencies</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`btn-secondary text-xs px-4 py-2 border ${showSettings ? 'border-blue-500 text-blue-400' : 'border-slate-700'}`}
          >
            {showSettings ? 'Hide Demo Settings' : 'Mobile Demo Settings'}
          </button>
        </div>

        {showSettings && (
          <div className="card bg-blue-900/10 border-blue-900/30 mb-8 p-6 animate-in slide-in-from-top duration-300">
            <h3 className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-2">Live Demo Configuration</h3>
            <p className="text-slate-400 text-sm mb-4">
              To test on a physical phone, replace <code className="text-white bg-slate-800 px-1 rounded">localhost</code> with your laptop's **Local IP Address**.
            </p>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="label text-[10px] uppercase font-black text-slate-500">Base URL for QR Codes</label>
                <input 
                  className="input font-mono text-sm"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://192.168.1.15:5173"
                />
              </div>
              <button 
                onClick={() => setBaseUrl(window.location.origin)}
                className="btn-ghost text-xs px-4 py-3 border border-slate-700 rounded-lg text-slate-400"
              >
                Reset to Localhost
              </button>
            </div>
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-800 flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 mt-0.5">!</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Tip:</strong> Run <code className="text-white">ipconfig</code> in your terminal to find your IPv4 Address. Example: <code className="text-blue-400">http://192.168.1.15:5173</code>
              </p>
            </div>
          </div>
        )}

        {locations.length === 0 ? (
          <div className="card text-center py-10">
            <QrCode size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No locations yet. Add locations first to generate QR codes.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byFloor).map(([floor, locs]) => (
              <div key={floor}>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-3">{floor}</div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {locs.map(loc => (
                    <div key={loc.id} className="card text-center group hover:border-blue-500/50 transition-all">
                      <div className="bg-white p-3 rounded-xl inline-block mb-3 shadow-2xl shadow-black/50">
                        <QRCodeSVG
                          id={`qr-${loc.id}`}
                          value={getUrl(loc.id)}
                          size={140}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <div className="font-bold text-white text-sm mb-0.5">{loc.name}</div>
                      <div className="text-[10px] text-slate-500 mb-3 uppercase font-black">{loc.floor}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadQR(loc)}
                          className="btn-secondary flex-1 text-[10px] px-2 py-2 flex items-center justify-center gap-1"
                        >
                          <Download size={10} />
                          PNG
                        </button>
                        <a
                          href={getUrl(loc.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost text-[10px] px-2 py-2 flex items-center justify-center gap-1 border border-slate-700 rounded-lg hover:bg-blue-600/10 hover:text-blue-400"
                        >
                          <ExternalLink size={10} />
                          TEST
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
