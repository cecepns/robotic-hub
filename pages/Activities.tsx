import React, { useState, useEffect } from 'react';
import { Activity } from '../types';
import { api } from '../utils/api';

interface ActivitiesProps {
  isAdmin: boolean;
}

const Activities: React.FC<ActivitiesProps> = ({ isAdmin }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState({ title: '', date: '', time: '', description: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getActivities();
        if (!cancelled) setActivities(list.map(a => ({ ...a, status: a.status as Activity['status'] })));
      } catch (_) {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date || !isAdmin) return;
    setSaving(true);
    try {
      const saved = await api.postActivity({
        title: form.title,
        date: form.date,
        time: form.time,
        description: form.description
      });
      setActivities(prev => [{ ...saved, status: 'COMING' as const }, ...prev]);
      setForm({ title: '', date: '', time: '', description: '' });
      setShowAdd(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan agenda');
    } finally {
      setSaving(false);
    }
  };

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Memuat agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm h-fit">
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Kalender Kegiatan</h3>
            <div className="flex gap-2">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black mb-4 uppercase tracking-widest">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-slate-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth(viewMonth, viewYear) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            {Array.from({ length: daysInMonth(viewMonth, viewYear) }, (_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasActivity = activities.some(a => a.date.startsWith(dateStr));
              const isToday = now.getDate() === day && now.getMonth() === viewMonth && now.getFullYear() === viewYear;
              return (
                <div
                  key={day}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all relative
                    ${isToday ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}
                    ${hasActivity && !isToday ? 'ring-2 ring-blue-500/20' : ''}
                  `}
                >
                  {day}
                  {hasActivity && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-blue-600'}`}></div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> Ada Agenda
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900"></span> Hari Ini
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Daftar Agenda</h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdd(!showAdd)}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
              >
                {showAdd ? 'Batal' : 'Tambah Agenda'}
              </button>
            )}
          </div>

          {showAdd && isAdmin && (
            <form onSubmit={handleAdd} className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-lg animate-slideDown space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest mb-4">Buat Agenda Baru</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text" required placeholder="Nama Kegiatan"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="date" required
                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                  />
                  <input
                    type="time" required
                    value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                  />
                </div>
              </div>
              <textarea
                placeholder="Deskripsi kegiatan..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm min-h-[100px]"
              />
              <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-70">
                {saving ? 'Menyimpan...' : 'Simpan Agenda'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-4">
            {activities.length > 0 ? (
              activities.map(act => (
                <div key={act.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] hover:border-slate-300 transition-all flex items-center gap-6 shadow-sm">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex flex-col items-center justify-center border border-slate-200 shrink-0">
                    <span className="text-2xl font-black text-slate-900">{act.date.split('T')[0].split('-')[2]}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(act.date).toLocaleString('id', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-black text-slate-900 text-lg tracking-tight uppercase">{act.title}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-tighter ${new Date(act.date) >= new Date() ? 'border-blue-200 text-blue-600' : 'border-slate-200 text-slate-400'}`}>
                        {new Date(act.date) >= new Date() ? 'Mendatang' : 'Selesai'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3" /></svg>
                      {new Date(act.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </div>
                    <p className="text-slate-500 text-xs font-medium line-clamp-2">{act.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Belum ada kegiatan terdaftar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activities;
