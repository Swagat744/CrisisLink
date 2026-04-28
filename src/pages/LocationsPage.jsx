// src/pages/LocationsPage.jsx
import { useEffect, useState, useMemo } from 'react';
import { db } from '../firebase/config';
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { useHotel } from '../context/HotelContext';
import Layout from '../components/dashboard/Layout';
import { MapPin, Plus, Trash2 } from 'lucide-react';

export default function LocationsPage() {
  const { hotel } = useHotel();
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', floor: '' });
  const [saving, setSaving] = useState(false);

  // Build floor options dynamically from hotel.floors
  const floorOptions = useMemo(() => {
    const options = ['Ground Floor'];
    const totalFloors = parseInt(hotel?.floors) || 5;
    for (let i = 1; i <= totalFloors; i++) {
      options.push(`Floor ${i}`);
    }
    options.push('Basement', 'Rooftop');
    return options;
  }, [hotel?.floors]);

  // Set default floor once floorOptions are ready
  useEffect(() => {
    if (floorOptions.length > 0 && !form.floor) {
      setForm(f => ({ ...f, floor: floorOptions[0] }));
    }
  }, [floorOptions]);

  useEffect(() => {
    if (!hotel?.id) return;
    const q = query(collection(db, 'locations'), where('hotelId', '==', hotel.id));
    return onSnapshot(q, snap =>
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [hotel]);

  const addLocation = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'locations'), {
        hotelId: hotel.id,
        name: form.name.trim(),
        floor: form.floor,
        createdAt: serverTimestamp(),
      });
      // Keep the selected floor — only reset the name
      setForm(f => ({ ...f, name: '' }));
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (id) => {
    if (!confirm('Delete this location? QR codes linked to it will stop working.')) return;
    await deleteDoc(doc(db, 'locations', id));
  };

  // Group by floor
  const byFloor = locations.reduce((acc, loc) => {
    const key = loc.floor || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(loc);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <MapPin size={22} className="text-slate-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Locations</h1>
              <p className="text-slate-400 text-sm">
                {locations.length} rooms and areas configured
                {hotel?.floors && (
                  <span className="ml-2 text-slate-500">· {hotel.floors} floor hotel</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Location
          </button>
        </div>

        {showForm && (
          <form onSubmit={addLocation} className="card mb-6 max-w-lg">
            <h3 className="font-semibold text-white mb-4">New Location</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Location Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Room 205, Exit B, Restaurant"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Floor</label>
                <select
                  className="input"
                  value={form.floor}
                  onChange={e => setForm({ ...form, floor: e.target.value })}
                >
                  {floorOptions.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Showing floors based on your hotel ({hotel?.floors || '?'} floors)
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Adding...' : 'Add Location'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {locations.length === 0 ? (
          <div className="card text-center py-10">
            <MapPin size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              No locations yet. Add rooms and areas to generate QR codes.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byFloor).map(([floor, locs]) => (
              <div key={floor}>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-2">
                  {floor} ({locs.length})
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {locs.map(loc => (
                    <div
                      key={loc.id}
                      className="card flex items-center justify-between gap-2 py-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin size={14} className="text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-white truncate">{loc.name}</span>
                      </div>
                      <button
                        onClick={() => deleteLocation(loc.id)}
                        className="text-slate-600 hover:text-red-400 p-1 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
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