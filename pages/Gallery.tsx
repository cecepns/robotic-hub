import React, { useState, useEffect } from 'react';
import { GalleryItem } from '../types';
import { api } from '../utils/api';

interface GalleryProps {
  isAdmin: boolean;
}

const Gallery: React.FC<GalleryProps> = ({ isAdmin }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getGallery();
        if (!cancelled) setItems(list);
      } catch (_) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      const saved = await api.postGallery(formData);
      setItems(prev => [{ id: saved.id, title: saved.title, url: saved.url }, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const deletePhoto = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.deleteGallery(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Memuat galeri...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Galeri Dokumentasi</h2>
          <p className="text-slate-500 font-medium text-sm">Arsip visual kegiatan klub.</p>
        </div>
        {isAdmin && (
          <label className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 shadow-xl transition-all disabled:opacity-70">
            {uploading ? 'Uploading...' : 'Upload Foto Baru'}
            <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map(item => (
            <div key={item.id} className="group relative overflow-hidden rounded-[2.5rem] bg-slate-100 border border-slate-200 aspect-[4/3] shadow-sm">
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                <h4 className="text-white font-black text-lg tracking-tight uppercase leading-tight">{item.title}</h4>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Dokumentasi Kegiatan</p>
                  {isAdmin && (
                    <button type="button" onClick={() => deletePhoto(item.id)} className="text-red-400 hover:text-red-300 text-[10px] font-black uppercase">Hapus</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-40 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="max-w-xs mx-auto opacity-20">
            <svg className="w-20 h-20 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Belum ada foto tersimpan</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
