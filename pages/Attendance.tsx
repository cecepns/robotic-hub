import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Activity } from '../types';
import { api } from '../utils/api';

interface AttendanceProps {
  isAdmin: boolean;
  currentUserId: string;
}

const Attendance: React.FC<AttendanceProps> = ({ isAdmin, currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'SCAN' | 'RECAP'>('SCAN');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceForm, setAttendanceForm] = useState({
    memberName: '',
    activityId: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [actRes, recRes] = await Promise.all([api.getActivities(), api.getAttendance()]);
        if (!cancelled) {
          setActivities(actRes.map(a => ({ ...a, status: a.status as Activity['status'] })));
          setRecords(recRes.map(r => ({
            id: r.id,
            date: r.date,
            memberName: r.memberName,
            activityName: r.activityName,
            status: r.status as 'PRESENT' | 'ABSENT'
          })));
        }
      } catch (_) {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedActivity = activities.find(a => a.id === attendanceForm.activityId);

  const submitAttendance = async () => {
    if (!attendanceForm.activityId) {
      alert('Harap pilih kegiatan terlebih dahulu');
      return;
    }
    setScanning(true);
    setScanResult(null);
    try {
      const saved = await api.postAttendance({
        activityId: attendanceForm.activityId,
        memberName: attendanceForm.memberName || undefined,
        date: attendanceForm.date
      });
      setRecords(prev => [{
        id: saved.id,
        memberName: saved.memberName,
        activityName: saved.activityName,
        date: saved.date,
        status: 'PRESENT'
      }, ...prev]);
      setScanResult(`Absensi Berhasil! ${saved.memberName} hadir pada ${saved.activityName} (${saved.date})`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengirim absensi');
    } finally {
      setScanning(false);
    }
  };

  const groups = records.reduce((acc: Record<string, AttendanceRecord[]>, record) => {
    const key = `${record.activityName} (${record.date})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('SCAN')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'SCAN' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Scan QR
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('RECAP')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'RECAP' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Rekapitulasi
        </button>
      </div>

      {activeTab === 'SCAN' ? (
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm text-center">
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">QR Scanner Absensi</h3>
            <p className="text-slate-500 text-sm font-medium mb-10">Pilih kegiatan yang tersedia untuk melakukan verifikasi kehadiran.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Anggota</label>
                <input
                  type="text"
                  placeholder="Nama Lengkap Anda..."
                  value={attendanceForm.memberName}
                  onChange={e => setAttendanceForm({ ...attendanceForm, memberName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Kegiatan Aktif</label>
                <select
                  required
                  value={attendanceForm.activityId}
                  onChange={e => setAttendanceForm({ ...attendanceForm, activityId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Pilih Kegiatan --</option>
                  {activities.length > 0 ? activities.map(act => (
                    <option key={act.id} value={act.id}>{act.title}</option>
                  )) : (
                    <option disabled>Tidak ada kegiatan tersedia</option>
                  )}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Kehadiran</label>
                <input
                  type="date"
                  required
                  value={attendanceForm.date}
                  onChange={e => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="aspect-[16/9] bg-slate-100 rounded-[2rem] border-2 border-slate-200 flex items-center justify-center relative overflow-hidden mb-8 group shadow-inner">
              {scanning ? (
                <div className="w-full h-full relative flex items-center justify-center bg-slate-200">
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 animate-scanLine z-10 shadow-lg"></div>
                  <div className="text-slate-900 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Scanner...</div>
                </div>
              ) : scanResult ? (
                <div className="text-green-600 flex flex-col items-center gap-2">
                  <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <p className="font-black uppercase tracking-widest text-[10px]">Verified: {selectedActivity?.title}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {attendanceForm.activityId ? (
                    <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200 group-hover:scale-105 transition-transform">
                      <svg className="w-24 h-24 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z" />
                      </svg>
                      <p className="text-[9px] font-black uppercase text-slate-400 mt-2">QR: {selectedActivity?.title.slice(0, 10)}...</p>
                    </div>
                  ) : (
                    <div className="opacity-10 flex flex-col items-center">
                      <svg className="w-24 h-24 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                      <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-900">Pilih kegiatan dahulu</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={submitAttendance}
              disabled={scanning || !attendanceForm.activityId}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${scanning || !attendanceForm.activityId ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl active:scale-95'}`}
            >
              {scanning ? 'Verifikasi...' : 'Kirim Absensi'}
            </button>
            {scanResult && (
              <div className="mt-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl text-[10px] font-black animate-fadeIn">
                {scanResult}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Rekapitulasi Kehadiran</h3>
          {Object.keys(groups).length > 0 ? (
            Object.keys(groups).map((key) => (
              <div key={key} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(selectedGroup === key ? null : key)}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 text-sm uppercase">{key}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{groups[key].length} Anggota Hadir</p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform ${selectedGroup === key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {selectedGroup === key && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50 space-y-2 animate-slideDown">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Daftar Kehadiran:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groups[key].map((rec) => (
                        <div key={rec.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-[10px] uppercase">
                            {rec.memberName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-xs">{rec.memberName}</p>
                            <p className="text-[9px] text-green-600 font-black uppercase tracking-widest">Hadir ✓</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Belum ada data absensi masuk.</p>
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes scanLine { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-scanLine { animation: scanLine 2s linear infinite; }
      `}</style>
    </div>
  );
};

export default Attendance;
