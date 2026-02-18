import React, { useState, useEffect } from 'react';
import { LearningMaterial } from '../types';
import { api } from '../utils/api';

interface LearningProps {
  isAdmin: boolean;
}

const Learning: React.FC<LearningProps> = ({ isAdmin }) => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [form, setForm] = useState({ title: '', type: 'PDF' as 'PDF' | 'VIDEO', url: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getLearning();
        if (!cancelled) setMaterials(list.map(m => ({ ...m, type: m.type as 'PDF' | 'VIDEO' })));
      } catch (_) {
        if (!cancelled) setMaterials([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('type', file.type.includes('pdf') ? 'PDF' : 'VIDEO');
      const saved = await api.postLearningFile(formData);
      setMaterials(prev => [{ id: saved.id, title: saved.title, type: saved.type as 'PDF' | 'VIDEO', url: saved.url }, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal upload');
    } finally {
      setSubmitting(false);
      e.target.value = '';
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url?.trim() || !form.title?.trim() || !isAdmin) return;
    setSubmitting(true);
    try {
      const saved = await api.postLearningLink({ title: form.title, type: form.type, url: form.url.trim() });
      setMaterials(prev => [{ id: saved.id, title: saved.title, type: saved.type as 'PDF' | 'VIDEO', url: saved.url }, ...prev]);
      setForm({ title: '', type: 'PDF', url: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menambah materi');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.deleteLearning(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Memuat materi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Materi Pembelajaran</h2>
          <p className="text-slate-500 font-medium text-sm">Dokumentasi teknis dan referensi robotika untuk anggota.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <label className="cursor-pointer bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all disabled:opacity-70">
              {submitting ? 'Uploading...' : 'Upload File (PDF/Vid)'}
              <input type="file" className="hidden" accept=".pdf,video/*" onChange={handleUpload} disabled={submitting} />
            </label>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest mb-6">Tambah Berdasarkan Link</h4>
          <form onSubmit={handleLinkSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text" placeholder="Judul Materi" required
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 font-bold text-sm outline-none focus:border-blue-500"
            />
            <select
              value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'PDF' | 'VIDEO' })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 font-bold text-sm outline-none"
            >
              <option value="PDF">PDF Document</option>
              <option value="VIDEO">Video Link</option>
            </select>
            <input
              type="text" placeholder="URL Link (Youtube/GDrive)" required
              value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 font-bold text-sm outline-none focus:border-blue-500"
            />
            <button type="submit" disabled={submitting} className="md:col-span-4 bg-blue-600 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-blue-500/20 shadow-lg disabled:opacity-70">
              Tambahkan Materi
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.length > 0 ? (
          materials.map(m => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 group hover:border-slate-400 transition-all flex flex-col shadow-sm relative">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => deleteMaterial(m.id)}
                  className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${m.type === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {m.type === 'PDF' ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-2 leading-tight uppercase tracking-tight">{m.title}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8 flex-1">
                {m.type === 'PDF' ? 'Unduhan Dokumen' : 'Materi Video'}
              </p>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                download={m.type === 'PDF' ? `${m.title}.pdf` : undefined}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-center transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
              >
                {m.type === 'PDF' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download PDF
                  </>
                ) : 'Tonton Sekarang'}
              </a>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Belum ada materi pembelajaran</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Learning;
