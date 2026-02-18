import React, { useState, useEffect } from 'react';
import { Achievement, User, Activity } from '../types';
import { api } from '../utils/api';

interface DashboardProps {
  isAdmin: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isAdmin }) => {
  const [showMembers, setShowMembers] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editModal, setEditModal] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [usersRes, activitiesRes, achievementsRes] = await Promise.all([
          api.getUsers(),
          api.getActivities(),
          api.getAchievements()
        ]);
        if (!cancelled) {
          setMembers(usersRes.map(u => ({ ...u, role: u.role as User['role'] })));
          setActivities(activitiesRes.map(a => ({ ...a, status: a.status as Activity['status'] })));
          setAchievements(achievementsRes);
        }
      } catch (_) {
        if (!cancelled) setAchievements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal || !isAdmin) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editModal.title);
      formData.append('year', editModal.year);
      formData.append('description', editModal.description);
      if (editModal.id) formData.append('id', editModal.id);
      if (photoFile) formData.append('photo', photoFile);
      const saved = await api.postAchievement(formData);
      setAchievements(prev => {
        const exists = prev.some(a => a.id === saved.id);
        if (exists) return prev.map(a => a.id === saved.id ? { ...a, ...saved } : a);
        return [saved, ...prev];
      });
      setEditModal(null);
      setPhotoFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && editModal && isAdmin) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setEditModal({ ...editModal, photoUrl: URL.createObjectURL(file) });
    }
  };

  const deleteAchievement = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.deleteAchievement(id);
      setAchievements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  const upcomingActivities = activities
    .filter(a => new Date(a.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn pb-12 w-full px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
          Dashboard <span className="text-blue-600">Robo Hub</span>
        </h2>
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm w-fit">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Server Status</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <button
          onClick={() => setShowMembers(!showMembers)}
          className={`bg-white border p-6 md:p-8 rounded-[2rem] text-left transition-all shadow-sm group relative overflow-hidden ${showMembers ? 'border-blue-600 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}`}
        >
          <div className="relative z-10">
            <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Total Anggota</p>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{members.length}</h3>
            <p className="text-blue-600 text-[9px] md:text-[10px] font-bold mt-4 group-hover:translate-x-1 transition-transform uppercase tracking-widest flex items-center gap-2">
              {showMembers ? 'Sembunyikan ↑' : 'Detail Anggota →'}
            </p>
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
            <svg className="w-24 md:w-32 h-24 md:h-32" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path></svg>
          </div>
        </button>

        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Agenda Aktif</p>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{activities.filter(a => a.status === 'COMING').length}</h3>
          <p className="text-slate-500 text-[9px] md:text-[10px] font-bold mt-4 uppercase tracking-widest">Sistem Operasi</p>
          <div className="absolute -right-2 -bottom-2 opacity-[0.03]">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-sm sm:col-span-2 lg:col-span-1 relative overflow-hidden">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Prestasi</p>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{achievements.length}</h3>
          <p className="text-slate-500 text-[9px] md:text-[10px] font-bold mt-4 uppercase tracking-widest">Database Klub</p>
          <div className="absolute -right-2 -bottom-2 opacity-[0.03]">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 10.63 21 8.55 21 6V5h-2zM5 7h2v3c-1.1 0-2-.9-2-2V7zm14 1c0 1.1-.9 2-2 2V7h2v1z"/></svg>
          </div>
        </div>
      </div>

      {showMembers && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-xl animate-slideDown overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-10 gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                <span className="w-1.5 h-6 md:h-8 bg-blue-600 rounded-full"></span>
                Profil Database Anggota
              </h3>
              <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-1 ml-4 leading-none">Anggota Resmi Robo Hub PGSD</p>
            </div>
            <button type="button" onClick={() => setShowMembers(false)} className="bg-slate-50 p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all self-end sm:self-center">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {members.length > 0 ? members.map(m => (
              <div key={m.id} className="bg-slate-50/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-[1.2rem] md:rounded-[1.5rem] bg-white border border-slate-200 flex items-center justify-center font-black text-slate-900 uppercase text-lg md:text-2xl mb-4 md:mb-5 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                  {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" alt={m.name} /> : m.name.charAt(0)}
                </div>
                <h4 className="font-black text-slate-900 text-[10px] md:text-sm uppercase tracking-tight mb-1 truncate w-full">{m.name}</h4>
                <div className={`text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] px-2 md:px-3 py-1 rounded-full mb-3 ${m.role === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {m.role}
                </div>
                <p className="text-[8px] md:text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-3 w-full truncate">{m.email}</p>
              </div>
            )) : (
              <div className="col-span-full py-12 md:py-16 text-center">
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] md:text-xs">Belum ada anggota terdaftar.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm relative group overflow-hidden">
          <h3 className="text-base md:text-lg font-black text-slate-900 mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tighter relative z-10">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            Agenda Kegiatan Aktif
          </h3>
          <div className="space-y-4 md:space-y-5 relative z-10">
            {upcomingActivities.length > 0 ? (
              upcomingActivities.map((act) => (
                <div key={act.id} className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl flex items-start gap-4 md:gap-5 hover:border-blue-200 hover:bg-white hover:shadow-md transition-all group/item">
                  <div className="bg-blue-600 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shrink-0 shadow-lg shadow-blue-500/20 group-hover/item:scale-110 transition-transform">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-900 text-xs md:text-sm uppercase tracking-tight leading-tight truncate group-hover/item:text-blue-600 transition-colors">{act.title}</h4>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold mt-1 leading-none">{new Date(act.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                    <span className="text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest mt-2 block opacity-60">System Notification</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 md:py-20 text-center bg-slate-50/50 rounded-2xl md:rounded-3xl border border-slate-100">
                <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">Tidak ada agenda mendatang</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm relative group overflow-hidden">
          <div className="flex justify-between items-center mb-6 md:mb-8 relative z-10">
            <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
              Prestasi & Penghargaan
            </h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => { setEditModal({ id: '', title: '', year: new Date().getFullYear().toString(), description: '' }); setPhotoFile(null); }}
                className="bg-slate-900 text-white px-4 md:px-5 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
              >
                + Tambah
              </button>
            )}
          </div>
          <div className="space-y-4 md:space-y-6 relative z-10">
            {achievements.length > 0 ? (
              achievements.map((item) => (
                <div key={item.id} className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl flex gap-4 md:gap-6 items-start group/item relative hover:bg-white hover:border-amber-200 hover:shadow-md transition-all">
                  {item.photoUrl && (
                    <img src={item.photoUrl} className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl object-cover border border-slate-200 shadow-sm" alt="Achievement" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                      <h4 className="font-black text-slate-900 text-xs md:text-sm uppercase tracking-tight truncate w-full group-hover/item:text-amber-600 transition-colors">{item.title}</h4>
                      <span className="text-[8px] md:text-[9px] bg-amber-100 text-amber-700 px-2 md:px-3 py-1 rounded-lg font-black uppercase shrink-0">{item.year}</span>
                    </div>
                    <p className="text-[9px] md:text-[11px] text-slate-600 font-bold leading-relaxed line-clamp-3 group-hover/item:line-clamp-none transition-all duration-300">{item.description}</p>
                    {isAdmin && (
                      <div className="mt-4 flex gap-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button type="button" onClick={() => { setEditModal(item); setPhotoFile(null); }} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">Edit</button>
                        <button type="button" onClick={() => deleteAchievement(item.id)} className="text-[9px] font-black text-red-600 hover:underline uppercase tracking-widest">Hapus</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 md:py-20 opacity-20">
                <svg className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-900">Belum ada catatan resmi</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {editModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveAchievement} className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-7 sm:p-10 md:p-12 w-full max-w-xl shadow-2xl space-y-4 md:space-y-6 max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Kelola Pencapaian</h3>
              <button type="button" onClick={() => { setEditModal(null); setPhotoFile(null); }} className="text-slate-400 hover:text-slate-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Penghargaan</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-xs md:text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                value={editModal.title} required placeholder="Mis: Juara 1 Nasional Robofest"
                onChange={e => setEditModal({ ...editModal, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tahun</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-xs md:text-sm outline-none focus:border-blue-500 transition-all"
                  value={editModal.year} required placeholder="2024"
                  onChange={e => setEditModal({ ...editModal, year: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bukti Visual</label>
                <input type="file" accept="image/*" className="w-full text-[9px] md:text-[10px] font-black pt-2 md:pt-4 cursor-pointer" onChange={handlePhotoUpload} />
              </div>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deskripsi Detail</label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-xs md:text-sm outline-none min-h-[100px] focus:border-blue-500 transition-all"
                value={editModal.description} placeholder="Detail perolehan juara..."
                onChange={e => setEditModal({ ...editModal, description: e.target.value })}
              />
            </div>
            <div className="flex gap-3 md:gap-4 pt-4 md:pt-6">
              <button type="button" onClick={() => { setEditModal(null); setPhotoFile(null); }} className="flex-1 bg-slate-100 py-4.5 rounded-2xl font-black text-[10px] md:text-xs uppercase text-slate-500 transition-all hover:bg-slate-200">Batal</button>
              <button type="submit" disabled={saving} className="flex-1 bg-slate-900 py-4.5 rounded-2xl font-black text-[10px] md:text-xs uppercase text-white shadow-2xl shadow-slate-900/20 transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-70">
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .py-4.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
      `}</style>
    </div>
  );
};

export default Dashboard;
