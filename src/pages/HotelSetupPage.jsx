// src/pages/HotelSetupPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHotel } from '../context/HotelContext';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import Layout from '../components/dashboard/Layout';
import { Building2, CheckCircle, Search, Phone, Shield, Flame, HeartPulse } from 'lucide-react';

function SetupForm() {
  const { user } = useAuth();
  const { hotel } = useHotel();
  const navigate = useNavigate();
  
  const initialFacilities = {
    Fire: [{ name: '', phone: '' }, { name: '', phone: '' }],
    Medical: [{ name: '', phone: '' }, { name: '', phone: '' }],
    Security: [{ name: '', phone: '' }, { name: '', phone: '' }]
  };

  const [form, setForm] = useState({ 
    name: '', 
    address: '', 
    floors: '',
    massEmergencyThreshold: 3,
    facilities: initialFacilities
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState({ type: null, index: null, results: [] });

  // Load existing hotel data
  useState(() => {
    if (hotel) {
      setForm({
        name: hotel.name || '',
        address: hotel.address || '',
        floors: hotel.floors || '',
        massEmergencyThreshold: hotel.massEmergencyThreshold || 3,
        facilities: hotel.facilities || initialFacilities
      });
    }
  }, [hotel]);

  const handleFacilityChange = (type, index, field, value) => {
    const newFacilities = { ...form.facilities };
    newFacilities[type][index][field] = value;
    setForm({ ...form, facilities: newFacilities });
  };

  const searchNearby = async (type, index) => {
    setLoading(true);
    setSearchResults({ type: null, index: null, results: [] });
    setError('');
    
    try {
      // Use cached coordinates from form state if available, otherwise from hotel doc
      let lat = form.lat || hotel?.lat;
      let lon = form.lon || hotel?.lon;

      // 1. Geocode if coordinates missing
      if (!lat || !lon) {
        const address = form.address || hotel?.address;
        if (!address) {
          setError('Please provide a hotel address first to search nearby facilities.');
          setLoading(false);
          return;
        }

        // Add a small delay to avoid Nominatim rate limits if multiple searches are clicked
        await new Promise(resolve => setTimeout(resolve, 500));

        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        
        if (geoRes.status === 429) {
          throw new Error('Rate limit reached. Please wait a few seconds before searching again.');
        }

        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = geoData[0].lat;
          lon = geoData[0].lon;
          // Cache in form state to avoid re-geocoding for next slots
          setForm(prev => ({ ...prev, lat, lon }));
        } else {
          setError('Could not find coordinates for the provided address.');
          setLoading(false);
          return;
        }
      }

      // 2. Query Overpass API with Fallback
      const queries = {
        Fire: '["amenity"="fire_station"]',
        Medical: '["amenity"~"hospital|clinic"]',
        Security: '["amenity"="police"]'
      };

      const overpassQuery = `
        [out:json][timeout:15];
        nwr${queries[type]}(around:20000,${lat},${lon});
        out center;
      `;

      // Try multiple servers to ensure reliability
      const servers = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ];

      let data = null;
      let lastErr = '';

      for (const server of servers) {
        try {
          const response = await fetch(server, {
            method: 'POST',
            body: overpassQuery
          });

          if (response.status === 429) continue; // Try next server if rate limited
          if (!response.ok) continue;

          data = await response.json();
          if (data) break; // Success!
        } catch (err) {
          lastErr = err.message;
          continue; // Try next server
        }
      }

      if (!data) {
        throw new Error(lastErr || 'All search servers are currently busy.');
      }

      if (data.elements) {
        const results = data.elements.map(el => {
          const tags = el.tags || {};
          
          // Improved address extraction
          const addrParts = [];
          if (tags['addr:housenumber']) addrParts.push(tags['addr:housenumber']);
          if (tags['addr:street']) addrParts.push(tags['addr:street']);
          if (tags['addr:suburb']) addrParts.push(tags['addr:suburb']);
          if (tags['addr:city']) addrParts.push(tags['addr:city']);
          
          let address = addrParts.join(', ');
          if (!address && tags['addr:full']) address = tags['addr:full'];
          if (!address) address = 'Address details missing in OSM';

          return {
            name: tags.name || tags.operator || `${type} Facility`,
            phone: tags.phone || tags['contact:phone'] || tags['emergency:phone'] || '',
            address,
            type: tags.amenity,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon
          };
        });

        setSearchResults({
          type,
          index,
          results: results.slice(0, 10)
        });
        
        if (results.length === 0) {
          setError(`No ${type} facilities found within 5km radius.`);
        }
      }
    } catch (err) {
      console.error('OSM Search failed', err);
      setError('Search service unavailable. Please enter details manually.');
    } finally {
      setLoading(false);
    }
  };

  const selectResult = (type, index, result) => {
    handleFacilityChange(type, index, 'name', result.name);
    if (result.phone) {
      handleFacilityChange(type, index, 'phone', result.phone);
    }
    setSearchResults({ type: null, index: null, results: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Hotel name is required.'); return; }
    setLoading(true);
    setSuccess(false);
    try {
      const hotelData = {
        adminUid: user.uid,
        name: form.name.trim(),
        address: form.address.trim(),
        floors: parseInt(form.floors) || 1,
        massEmergencyThreshold: parseInt(form.massEmergencyThreshold) || 3,
        facilities: form.facilities,
        lat: form.lat || hotel?.lat || null,
        lon: form.lon || hotel?.lon || null,
        updatedAt: serverTimestamp(),
      };

      if (hotel?.id) {
        await updateDoc(doc(db, 'hotels', hotel.id), hotelData);
      } else {
        await addDoc(collection(db, 'hotels'), {
          ...hotelData,
          createdAt: serverTimestamp(),
        });
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (!hotel) navigate('/dashboard');
    } catch (err) {
      setError('Failed to save hotel profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="card space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">General Information</h2>
          <p className="text-slate-400 text-sm">Basic details about your property.</p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">{error}</div>
        )}
        
        {success && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-3 rounded text-sm flex items-center gap-2">
            <CheckCircle size={16} /> Changes saved successfully!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label">Hotel Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Grand Palace Hotel" required />
          </div>
          <div>
            <label className="label">Number of Floors</label>
            <input type="number" min="1" max="100" className="input" value={form.floors} onChange={e => setForm({...form, floors: e.target.value})} placeholder="5" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main Street, City" />
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Mass Emergency Configuration</h2>
          <p className="text-slate-400 text-sm">Set thresholds and external emergency contacts.</p>
        </div>

        <div>
          <label className="label">Mass Emergency Threshold (Simultaneous Rooms)</label>
          <div className="flex items-center gap-4">
            <input 
              type="number" 
              min="2" 
              max="50" 
              className="input w-32" 
              value={form.massEmergencyThreshold} 
              onChange={e => setForm({...form, massEmergencyThreshold: e.target.value})} 
            />
            <span className="text-slate-400 text-sm">System triggers "Mass Mode" when this many rooms report the same type of emergency.</span>
          </div>
        </div>

        <div className="space-y-8 pt-4">
          {[
            { type: 'Fire', icon: Flame, color: 'text-red-500' },
            { type: 'Medical', icon: HeartPulse, color: 'text-blue-500' },
            { type: 'Security', icon: Shield, color: 'text-amber-500' }
          ].map(({ type, icon: Icon, color }) => (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Icon size={18} className={color} />
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">{type} Facilities</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1].map((idx) => (
                  <div key={idx} className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800 relative">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-slate-500 uppercase">Facility Slot {idx + 1}</span>
                      <button 
                        type="button" 
                        onClick={() => searchNearby(type, idx)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        <Search size={12} /> Search Nearby
                      </button>
                    </div>

                    {searchResults.type === type && searchResults.index === idx && searchResults.results.length > 0 && (
                      <div className="absolute top-10 left-4 right-4 z-10 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                        {searchResults.results.map((res, ri) => (
                          <button
                            key={ri}
                            type="button"
                            onClick={() => selectResult(type, idx, res)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-white border-b border-slate-700 last:border-0"
                          >
                            <div className="font-medium">{res.name}</div>
                            <div className="text-xs text-slate-400 truncate">{res.address}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <input 
                        className="input text-sm h-10" 
                        value={form.facilities[type][idx].name} 
                        onChange={e => handleFacilityChange(type, idx, 'name', e.target.value)}
                        placeholder="Facility Name" 
                      />
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
                        <input 
                          className="input text-sm h-10 pl-9" 
                          value={form.facilities[type][idx].phone} 
                          onChange={e => handleFacilityChange(type, idx, 'phone', e.target.value)}
                          placeholder="+91XXXXXXXXXX" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary min-w-[200px]">
          {loading ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}

export default function HotelSetupPage() {
  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <Building2 size={22} className="text-slate-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Hotel Configuration</h1>
            <p className="text-slate-400 text-sm">Manage profile and emergency settings</p>
          </div>
        </div>
        <SetupForm />
      </div>
    </Layout>
  );
}
