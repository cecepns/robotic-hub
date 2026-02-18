import React, { useState, useEffect } from 'react';
import { ClubProfile } from '../types';
import { api } from '../utils/api';

interface ProfileProps {
  isAdmin: boolean;
}

type MemberModal = { id: string; name: string; role: string; parentId?: string; photoUrl?: string; photoFile?: File };

const Profile: React.FC<ProfileProps> = ({ isAdmin }) => {
  const [profile, setProfile] = useState<ClubProfile>({
    history: '',
    vision: '',
    mission: [],
    structure: []
  });
  const [editMemberModal, setEditMemberModal] = useState<MemberModal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getProfile();
        if (!cancelled) setProfile(data);
      } catch (_) {
        if (!cancelled) setProfile({ history: '', vision: '', mission: [], structure: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateProfile = (key: keyof ClubProfile, value: string | string[]) => {
    if (!isAdmin) return;
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const saveProfileSection = async (key: 'history' | 'vision' | 'mission', value: string | string[]) => {
    if (!isAdmin) return;
    try {
      await api.patchProfile({ [key]: value });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan');
    }
  };

  const addMission = () => {
    if (!isAdmin) return;
    updateProfile('mission', [...profile.mission, '']);
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberModal || !isAdmin) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editMemberModal.name);
      formData.append('role', editMemberModal.role);
      if (editMemberModal.parentId) formData.append('parentId', editMemberModal.parentId);
      if (editMemberModal.id) formData.append('id', editMemberModal.id);
      if (editMemberModal.photoFile) formData.append('photo', editMemberModal.photoFile);
      const saved = await api.postProfileStructure(formData);
      setProfile(prev => {
        const exists = prev.structure.find(m => m.id === saved.id);
        const next = exists
          ? prev.structure.map(m => m.id === saved.id ? { ...m, ...saved } : m)
          : [...prev.structure, { id: saved.id, name: saved.name, role: saved.role, parentId: saved.parentId, photoUrl: saved.photoUrl }];
        return { ...prev, structure: next };
      });
      setEditMemberModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan pengurus');
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.deleteProfileStructure(id);
      setProfile(prev => ({ ...prev, structure: prev.structure.filter(m => m.id !== id) }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  const handleMemberPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editMemberModal) {
      setEditMemberModal({ ...editMemberModal, photoUrl: URL.createObjectURL(file), photoFile: file });
    }
  };

  const handleBlurHistory = () => {
    if (isAdmin && profile.history !== undefined) saveProfileSection('history', profile.history);
  };
  const handleBlurVision = () => {
    if (isAdmin && profile.vision !== undefined) saveProfileSection('vision', profile.vision);
  };
  const handleBlurMission = (idx: number) => {
    if (isAdmin && profile.mission[idx] !== undefined) saveProfileSection('mission', profile.mission);
  };

  const renderMemberNode = (member: ClubProfile['structure'][0]) => {
    const children = profile.structure.filter(m => m.parentId === member.id);
    return (
      <div key={member.id} className="flex flex-col items-center">
        <div className="relative group">
          <div className={`bg-white border ${isAdmin ? 'hover:border-blue-500 hover:shadow-lg cursor-pointer' : ''} border-slate-200 rounded-2xl p-4 w-48 text-center shadow-sm transition-all z-10 relative`}>
            <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-3 border border-slate-200 overflow-hidden flex items-center justify-center">
              {member.photoUrl ? (
                <img src={member.photoUrl} className="w-full h-full object-cover" alt={member.name} />
              ) : (
                <span className="text-xl font-black text-slate-300">{member.name ? member.name.charAt(0) : '?'}</span>
              )}
            </div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{member.role}</p>
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">{member.name || 'Belum Diisi'}</p>
            {isAdmin && (
              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => setEditMemberModal({ ...member, photoUrl: member.photoUrl })} className="bg-slate-900 text-white p-1.5 rounded-lg shadow-lg">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button type="button" onClick={() => deleteMember(member.id)} className="bg-red-600 text-white p-1.5 rounded-lg shadow-lg">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            )}
          </div>
          {children.length > 0 && <div className="w-px h-8 bg-slate-200 mx-auto"></div>}
        </div>
        {children.length > 0 && (
          <div className="flex gap-4 relative">
            {children.length > 1 && <div className="absolute top-0 left-0 right-0 h-px bg-slate-200 w-full" style={{ left: '25%', right: '25%' }}></div>}
            {children.map(child => renderMemberNode(child))}
          </div>
        )}
      </div>
    );
  };

  const topLevelMembers = profile.structure.filter(m => !m.parentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Memuat profil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 bg-white min-h-screen p-4 md:p-8">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 relative overflow-hidden shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tighter">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Profil Robo Hub PGSD
          </h2>
          {isAdmin && (
            <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Mode Editor Admin
            </div>
          )}
        </div>

        <div className="space-y-12">
          <section>
            <h3 className="text-sm font-black text-blue-700 mb-3 uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 h-px bg-blue-700"></span> Sejarah Singkat
            </h3>
            {isAdmin ? (
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] text-slate-900 font-medium leading-relaxed"
                value={profile.history}
                placeholder="Tuliskan sejarah berdirinya klub di sini..."
                onChange={(e) => updateProfile('history', e.target.value)}
                onBlur={handleBlurHistory}
              />
            ) : (
              <p className="text-slate-700 leading-relaxed text-lg font-medium">{profile.history || 'Konten sejarah belum tersedia.'}</p>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section>
              <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">Visi</h3>
              {isAdmin ? (
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 outline-none focus:ring-2 focus:ring-slate-400 min-h-[100px] text-slate-900 font-bold text-lg"
                  value={profile.vision}
                  placeholder="Visi klub..."
                  onChange={(e) => updateProfile('vision', e.target.value)}
                  onBlur={handleBlurVision}
                />
              ) : (
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 italic text-slate-800 text-xl font-black tracking-tight leading-tight">
                  &quot;{profile.vision || 'Visi belum ditetapkan.'}&quot;
                </div>
              )}
            </section>
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Misi</h3>
                {isAdmin && <button type="button" onClick={addMission} className="text-[10px] font-black uppercase text-blue-600 hover:underline">+ Tambah Poin Misi</button>}
              </div>
              <div className="space-y-3">
                {profile.mission.length > 0 ? profile.mission.map((m, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <span className="shrink-0 w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black">{i + 1}</span>
                    {isAdmin ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          className="flex-1 bg-transparent border-b border-slate-200 focus:border-slate-900 outline-none text-slate-900 font-bold py-1"
                          value={m}
                          onChange={(e) => {
                            const newMission = [...profile.mission];
                            newMission[i] = e.target.value;
                            updateProfile('mission', newMission);
                          }}
                          onBlur={() => handleBlurMission(i)}
                        />
                        <button type="button" onClick={() => updateProfile('mission', profile.mission.filter((_, idx) => idx !== i))} className="text-red-500 opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-700 py-1 leading-relaxed">{m}</span>
                    )}
                  </div>
                )) : <p className="text-slate-400 text-xs italic">Misi belum tersedia.</p>}
              </div>
            </section>
          </div>

          <section className="pt-8 border-t border-slate-100 overflow-x-auto">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Diagram Struktur Organisasi</h3>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEditMemberModal({ id: '', name: '', role: '' })}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                >
                  + Tambah Pengurus
                </button>
              )}
            </div>
            <div className="min-w-[800px] flex flex-col items-center py-10">
              {topLevelMembers.length > 0 ? (
                <div className="flex flex-col items-center gap-12">
                  {topLevelMembers.map(m => renderMemberNode(m))}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-20 rounded-[3rem] text-center w-full max-w-2xl">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Data struktur organisasi masih kosong</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {editMemberModal && isAdmin && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveMember} className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Kelola Pengurus</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Lengkap</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-blue-500"
                value={editMemberModal.name}
                required
                placeholder="Mis: Dr. Robotik, S.T."
                onChange={e => setEditMemberModal({ ...editMemberModal, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jabatan / Posisi</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-blue-500"
                value={editMemberModal.role}
                required
                placeholder="Mis: Ketua Umum / Sekretaris"
                onChange={e => setEditMemberModal({ ...editMemberModal, role: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atasan (Hirarki)</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-blue-500"
                  value={editMemberModal.parentId || ''}
                  onChange={e => setEditMemberModal({ ...editMemberModal, parentId: e.target.value || undefined })}
                >
                  <option value="">(Posisi Tertinggi)</option>
                  {profile.structure.filter(m => m.id !== editMemberModal.id).map(m => (
                    <option key={m.id} value={m.id}>{m.role} - {m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foto Profil</label>
                <input type="file" accept="image/*" className="w-full text-[10px] font-bold py-3" onChange={handleMemberPhotoUpload} />
              </div>
            </div>
            <div className="flex gap-2 pt-6">
              <button type="button" onClick={() => setEditMemberModal(null)} className="flex-1 bg-slate-100 py-4 rounded-2xl font-black text-xs uppercase text-slate-500">Batal</button>
              <button type="submit" disabled={saving} className="flex-1 bg-slate-900 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-xl disabled:opacity-70">
                {saving ? 'Menyimpan...' : 'Simpan Jabatan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
