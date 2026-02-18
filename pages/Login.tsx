import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { auth, setToken } from '../utils/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

type AuthStep = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'VERIFY_CODE' | 'RESET_PASSWORD';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('ANGGOTA');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const trimmedEmail = email.trim().toLowerCase();

    if (step === 'REGISTER') {
      if (!username || !trimmedEmail || !password) {
        setError('Harap lengkapi semua data pendaftaran.');
        return;
      }
      setLoading(true);
      try {
        await auth.register(username, trimmedEmail, password, role);
        setMessage('Akun berhasil dibuat! Silakan Login.');
        setStep('LOGIN');
        setPassword('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal mendaftar.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 'LOGIN') {
      if (!trimmedEmail || !password) {
        setError('Email dan password wajib.');
        return;
      }
      setLoading(true);
      try {
        const res = await auth.login(trimmedEmail, password);
        setToken(res.token);
        onLogin({
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role as UserRole,
          avatar: res.user.avatar
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Email atau password tidak sesuai.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendCode = () => {
    setError('Fitur reset password belum tersedia. Hubungi admin.');
  };

  const handleVerifyCode = () => {
    setError('Fitur reset password belum tersedia.');
  };

  const handleResetPassword = () => {
    setError('Fitur reset password belum tersedia.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5 relative overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%"><pattern id="pattern-hex" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M25 0l25 12.5v25L25 50 0 37.5v-25z" fill="none" stroke="currentColor" strokeWidth="1"/></pattern><rect width="100%" height="100%" fill="url(#pattern-hex)" /></svg>
      </div>

      <div className="w-full max-w-sm sm:max-w-md relative z-10 animate-fadeIn">
        <div className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[3rem] p-7 sm:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-lg mb-4 sm:mb-6">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                <circle cx="12" cy="5" r="2"></circle>
                <path d="M12 7v4"></path>
                <line x1="8" y1="16" x2="8" y2="16"></line>
                <line x1="16" y1="16" x2="16" y2="16"></line>
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
              Robo <span className="text-blue-600">Hub</span>
            </h1>
            <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mt-2">PGSD Division Portal</p>
          </div>

          {(step === 'LOGIN' || step === 'REGISTER') && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 sm:mb-8 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => { setStep('LOGIN'); setError(''); setMessage(''); }}
                className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${step === 'LOGIN' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => { setStep('REGISTER'); setError(''); setMessage(''); }}
                className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${step === 'REGISTER' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Daftar
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {step === 'REGISTER' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <input
                    type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 sm:py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 font-bold text-sm"
                    placeholder="Input nama..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jabatan</label>
                  <select
                    value={role} onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 sm:py-4 outline-none transition-all text-slate-900 font-bold cursor-pointer text-sm"
                  >
                    <option value="ANGGOTA">Anggota</option>
                    <option value="ADMIN">Admin (Maks 3)</option>
                  </select>
                </div>
              </>
            )}

            {(step === 'LOGIN' || step === 'REGISTER' || step === 'FORGOT_PASSWORD') && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Aktif</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 sm:py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 font-bold text-sm"
                  placeholder="name@email.com"
                />
              </div>
            )}

            {(step === 'LOGIN' || step === 'REGISTER') && (
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                  {step === 'LOGIN' && (
                    <button type="button" onClick={() => setStep('FORGOT_PASSWORD')} className="text-[10px] font-black text-blue-600 hover:underline tracking-widest uppercase">Lupa?</button>
                  )}
                </div>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 sm:py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 font-bold text-sm"
                  placeholder="••••••••"
                />
              </div>
            )}

            {step === 'VERIFY_CODE' && (
              <div className="space-y-1 text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Input 6 Digit Kode</label>
                <input
                  type="text" required value={inputCode} onChange={(e) => setInputCode(e.target.value)}
                  className="w-full max-w-[200px] mx-auto bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 text-center text-3xl font-black tracking-[0.5em]"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            {step === 'RESET_PASSWORD' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                <input
                  type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 font-bold text-sm"
                  placeholder="Min. 6 karakter"
                />
              </div>
            )}

            {error && (
              <div className="text-[10px] sm:text-xs font-bold px-4 py-3 rounded-2xl border bg-red-50 text-red-700 border-red-200 animate-shake">
                {error}
              </div>
            )}

            {message && (
              <div className="text-[10px] sm:text-xs font-bold px-4 py-3 rounded-2xl border bg-green-50 text-green-700 border-green-200 leading-relaxed">
                {message}
              </div>
            )}

            <div className="pt-4 space-y-3">
              {step === 'LOGIN' && (
                <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4.5 rounded-2xl shadow-xl transform active:scale-[0.98] transition-all text-xs uppercase tracking-widest disabled:opacity-70">
                  {loading ? 'Memeriksa...' : 'Masuk Ke Dashboard'}
                </button>
              )}
              {step === 'REGISTER' && (
                <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4.5 rounded-2xl shadow-xl transform active:scale-[0.98] transition-all text-xs uppercase tracking-widest disabled:opacity-70">
                  {loading ? 'Mendaftar...' : 'Konfirmasi Pendaftaran'}
                </button>
              )}
              {step === 'FORGOT_PASSWORD' && (
                <>
                  <button type="button" onClick={handleSendCode} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4.5 rounded-2xl shadow-xl transform active:scale-[0.98] transition-all text-xs uppercase tracking-widest">
                    Kirim Kode Pemulihan
                  </button>
                  <button type="button" onClick={() => setStep('LOGIN')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest py-2">Batal</button>
                </>
              )}
              {step === 'VERIFY_CODE' && (
                <>
                  <button type="button" onClick={handleVerifyCode} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4.5 rounded-2xl shadow-xl transform active:scale-[0.98] transition-all text-xs uppercase tracking-widest">
                    Verifikasi Kode
                  </button>
                  <button type="button" onClick={() => setStep('FORGOT_PASSWORD')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest py-2">Batal & Kirim Ulang</button>
                </>
              )}
              {step === 'RESET_PASSWORD' && (
                <button type="button" onClick={handleResetPassword} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4.5 rounded-2xl shadow-xl transform active:scale-[0.98] transition-all text-xs uppercase tracking-widest">
                  Update & Masuk
                </button>
              )}
            </div>
          </form>
        </div>
        <p className="text-center text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-8">
          &copy; 2024 Robo Hub PGSD - Secure Portal
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out 0s 2; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .py-4.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
      `}</style>
    </div>
  );
};

export default Login;
