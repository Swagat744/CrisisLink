// src/pages/StaffPage.jsx
import { useEffect, useState } from 'react';
import { db, auth, secondaryAuth } from '../firebase/config';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { setDoc } from 'firebase/firestore';
import { useHotel } from '../context/HotelContext';
import Layout from '../components/dashboard/Layout';
import { Users, Plus, Trash2, ToggleLeft, ToggleRight, Phone, Mail } from 'lucide-react';

const ROLES = ['Security', 'Medical', 'General'];
const ROLE_COLORS = {
  Security: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
  Medical: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  General: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
};

export default function StaffPage() {
  const { hotel } = useHotel();
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'General', phone: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hotel) return;
    const q = query(collection(db, 'staff'), where('hotelId', '==', hotel.id));
    return onSnapshot(q, snap => setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [hotel]);

  const addStaff = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required for staff login.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSaving(true);
    setError('');
    try {
      // Create Firebase Auth account for staff using secondaryAuth to avoid signing out admin
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      
      // Sign out of secondaryAuth immediately
      await signOut(secondaryAuth);

      // Save to users collection with role = staff
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: form.email.trim(),
        name: form.name.trim(),
        role: 'staff',
        hotelId: hotel.id,
        createdAt: new Date().toISOString(),
      });

      // Save to staff collection
      await addDoc(collection(db, 'staff'), {
        hotelId: hotel.id,
        uid: cred.user.uid,
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim(),
        email: form.email.trim(),
        available: true,
        createdAt: serverTimestamp(),
      });

      setForm({ name: '', role: 'General', phone: '', email: '', password: '' });
      setShowForm(false);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else {
        setError(err.message || 'Failed to add staff member.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (member) => {
    await updateDoc(doc(db, 'staff', member.id), { available: !member.available });
  };

  const deleteStaff = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    await deleteDoc(doc(db, 'staff', id));
  };

  const available = staff.filter(s => s.available);
  const unavailable = staff.filter(s => !s.available);

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users size={22} className="text-slate-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Staff Management</h1>
              <p className="text-slate-400 text-sm">{staff.length} total · {available.length} available</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Staff
          </button>
        </div>

        {/* Add staff form */}
        {showForm && (
          <form onSubmit={addStaff} className="card mb-6 max-w-lg">
            <h3 className="font-semibold text-white mb-1">New Staff Member</h3>
            <p className="text-slate-400 text-xs mb-4">Staff will use the email and password to log in to their dashboard.</p>
            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-2 rounded text-sm mb-3">{error}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Doe" required />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91XXXXXXXXXX" />
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-3">Login Credentials</div>
                <div className="space-y-3">
                  <div>
                    <label className="label">Email Address *</label>
                    <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="staff@hotel.com" required />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 6 characters" required />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Creating...' : 'Create Staff Account'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </form>
        )}

        {/* Staff list */}
        {staff.length === 0 ? (
          <div className="card text-center py-10">
            <Users size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No staff added yet. Add your first staff member above.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {[
              { label: 'Available', list: available },
              { label: 'Unavailable / On Duty', list: unavailable }
            ].map(({ label, list }) =>
              list.length > 0 && (
                <div key={label}>
                  <div className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-2">{label} ({list.length})</div>
                  <div className="space-y-2">
                    {list.map(member => (
                      <div key={member.id} className="card flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-slate-700 text-slate-200">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">{member.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.General}`}>
                                {member.role}
                              </span>
                              {member.phone && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Phone size={10} />{member.phone}
                                </span>
                              )}
                              {member.email && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Mail size={10} />{member.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAvailability(member)}
                            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors ${
                              member.available ? 'text-green-400 hover:bg-green-900/30' : 'text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {member.available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            {member.available ? 'Available' : 'Off Duty'}
                          </button>
                          <button
                            onClick={() => deleteStaff(member.id)}
                            className="text-slate-600 hover:text-red-400 p-1.5 rounded transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
