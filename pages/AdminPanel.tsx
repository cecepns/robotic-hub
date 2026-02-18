
import React, { useState } from 'react';

const AdminPanel: React.FC = () => {
  const [reports, setReports] = useState<{name: string, date: string, type: string}[]>([]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReports([{
        name: file.name,
        date: new Date().toLocaleString(),
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE'
      }, ...reports]);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Admin Console</h2>
          <p className="text-slate-500 font-medium">Pengelolaan sistem dan manajemen laporan resmi.</p>
        </div>
        <div className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">
          Secured Access
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Reports Section */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tighter">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Laporan Resmi
          </h3>
          
          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((rep, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-[10px] font-black">{rep.type}</div>
                    <div>
                      <p className="font-black text-slate-900 text-xs uppercase tracking-tight">{rep.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{rep.date}</p>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:underline font-black text-[10px] uppercase tracking-widest">Open</button>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Belum ada laporan terarsip</p>
              </div>
            )}

            <div className="mt-10">
              <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] p-8 cursor-pointer hover:border-slate-900 transition-all group bg-slate-50/50">
                <svg className="w-10 h-10 text-slate-300 group-hover:text-slate-900 transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900">Upload Laporan Baru (PDF/DOC)</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUpload} />
              </label>
            </div>
          </div>
        </div>

        {/* Management Tools */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
             <h4 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-tighter">Konfigurasi Sistem</h4>
             <div className="space-y-3">
               <button className="w-full bg-slate-50 hover:bg-slate-100 p-5 rounded-2xl text-left flex items-center justify-between group border border-slate-100">
                 <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Ekspor Database Anggota</span>
                 <svg className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
               </button>
               <button className="w-full bg-slate-50 hover:bg-slate-100 p-5 rounded-2xl text-left flex items-center justify-between group border border-slate-100">
                 <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Bersihkan Cache Dashboard</span>
                 <svg className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
               </button>
               <button className="w-full bg-slate-900 text-white p-5 rounded-2xl text-left flex items-center justify-between group shadow-xl">
                 <span className="text-xs font-black uppercase tracking-widest">Update Pengumuman Global</span>
                 <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
               </button>
             </div>
          </div>
          
          <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white overflow-hidden relative shadow-2xl shadow-blue-500/30">
             <div className="absolute top-0 right-0 p-6 opacity-10">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
             </div>
             <h4 className="text-xl font-black mb-2 uppercase tracking-tight">Status Server</h4>
             <p className="text-blue-100 text-xs font-medium mb-8 leading-relaxed">Infrastruktur Robo Hub berjalan optimal pada node PGSD-Main.</p>
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-xl w-fit border border-white/20">
               <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
               Main System Active
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
